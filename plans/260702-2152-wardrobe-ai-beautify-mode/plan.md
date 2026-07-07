# Wardrobe "AI Beautify" Mode + Admin Gender-Classify → OpenAI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in "Remove bg + AI beautify" upload mode that generates a studio product shot (OpenAI `gpt-image-1`) with a friendly non-blocking wait + before/after review, and move the admin gender-classify from Gemini → OpenAI.

**Architecture:** Approach #2 (decoupled) — the existing create/tag pipeline (`/items/ai-enhanced` → rembg cutout + gpt-4o tags) is **untouched**. Beautify is an additive branch: a new `"beautify"` Redis job runs `gpt-image-1`, writes a **candidate** onto the item, and the item row (not the Redis job) is the source of truth for a review flow committed via explicit accept/discard/regenerate endpoints. Mobile shows a watch-or-leave pending UX and a before/after review screen.

**Tech Stack:** Backend — FastAPI, SQLAlchemy (Flask-SQLAlchemy `db.Model`), Alembic, Redis queue + standalone `ai_worker.py`, OpenAI Python SDK (`gpt-image-1`, `gpt-4o` vision), S3/R2. Mobile — React Native 0.83, TS 5.8, TanStack Query 5, React Navigation 7, axios, jest.

**Spec:** `plans/260702-2152-wardrobe-ai-beautify-mode/spec.md` (read §4 flow, §5 data model, §6 backend, §7/§7A mobile).

## Global Constraints

- **Do NOT alter** existing `WardrobeItem` columns or the `enhance_item_with_ai` cutout+tag path — beautify is additive only.
- **New DB columns are additive & nullable**: `image_studio`, `image_studio_candidate`, `beautify_status` (String(20), default `'none'`), `beautify_attempts` (Integer, default `0`).
- **`beautify_status` enum values (strings):** `none | pending | ready | accepted | discarded | failed`.
- **Regenerate cap:** `BEAUTIFY_MAX_REGENERATIONS` default `5`; `POST /beautify` returns HTTP 409 when `beautify_attempts >= cap`.
- **OpenAI image model:** reuse existing `settings.OPENAI_IMAGE_MODEL` (`gpt-image-1`); do NOT hardcode.
- **Auth pattern (every new endpoint):** `user: User = Depends(get_current_user)`, ownership via `db.query(WardrobeItem).filter_by(id=item_id, user_id=user.id).first()` → 404 if missing; `request_id = getattr(request.state, "request_id", "unknown")`; errors as `HTTPException(status_code=..., detail={"error": ..., "request_id": request_id})`.
- **Analytics:** event names are literal `snake_case` past-tense string constants via `analytics.track` only; no PII; update `auxi/docs/analytics/mixpanel-tracking-plan.md`.
- **testID on every interactive element**, naming `<feature>-<element>-<state>` (e.g. `wardrobe-add-mode-beautify`, `beautify-review-accept`).
- **Mobile verify gate:** `npx tsc --noEmit` clean and `yarn lint` adds no errors over baseline (baseline: 4 errors in `_HomeScreen.tsx`).
- **Gemini deps stay** (`google-genai` still used by try-on/decision) — only `classify_gender` moves off Gemini.
- Commit after each task with conventional-commit messages, no AI references.

---

## File Structure

**Backend (`wardrobe-backend/`)**
- Create `services/beautify_service.py` — `BeautifyService`: `gpt-image-1` studio-shot generation + `process_job`.
- Create `migrations/versions/<rev>_add_beautify_columns.py` — Alembic add-column migration.
- Create `tests/test_beautify_service.py`, `tests/test_beautify_endpoints.py`, `tests/test_classify_gender_openai.py`, `tests/test_beautify_model.py`, `tests/test_beautify_queue.py`.
- Modify `models/wardrobe.py` — 4 columns + `to_dict`.
- Modify `services/queue_service.py` — `enqueue_beautify`.
- Modify `ai_worker.py` — `"beautify"` dispatch.
- Modify `routers/wardrobe.py` — 4 endpoints + request/response models.
- Modify `settings.py` / `config.py` — `BEAUTIFY_*` config.
- Modify `services/fashion_ai_service.py` — `classify_gender` → OpenAI.
- Modify docs: `API_DOCUMENTATION.md`, `MODELS_DOCUMENTATION.md`, `CLAUDE.md` (+ stale "Gemini" labels).

**Mobile (`auxi/`)**
- Create `src/screens/wardrobe/BeautifyPendingScreen.tsx`, `src/screens/wardrobe/BeautifyReviewScreen.tsx`.
- Create `src/screens/wardrobe/beautify-status.ts` (helpers: rotating copy, `anyBeautifying`).
- Create tests `src/services/__tests__/wardrobeService.beautify.test.ts`, `src/screens/wardrobe/__tests__/beautify-status.test.ts`.
- Modify `src/services/wardrobeService.ts` — types + 4 methods.
- Modify `src/screens/wardrobe/AddItemSheet.tsx` — mode rows.
- Modify `src/screens/wardrobe/useAddWardrobeItem.ts` — thread `mode`, consent gate, fire beautify + navigate.
- Modify `src/types/navigation.ts` + `src/navigation/AppNavigator.tsx` — register 2 routes.
- Modify `src/screens/wardrobe/WardrobeGridTile.tsx` + `wardrobe-grid.ts` + `WardrobeScreen.tsx` + `useItemReadySnackbar.ts` — beautifying shimmer + ready snackbar.
- Modify `src/services/analytics.ts` usage sites + `docs/analytics/mixpanel-tracking-plan.md`.

---

# PART A — BACKEND (`wardrobe-backend/`)

> Run backend commands from `/Users/nguyenminhduc/dev/wardrobe_project/wardrobe-backend`. Tests: `pytest`.

## Phase 1 — Data model

### Task 1: Add beautify columns to `WardrobeItem` + migration

**Files:**
- Modify: `models/wardrobe.py` (columns after line 34 `is_preparing`; `to_dict` at `:156`)
- Create: `migrations/versions/<rev>_add_beautify_columns.py`
- Test: `tests/test_beautify_model.py`

**Interfaces:**
- Produces: `WardrobeItem.image_studio`, `.image_studio_candidate`, `.beautify_status`, `.beautify_attempts`; `to_dict()` includes all four (candidate + status + attempts always present; `image_studio` only when set).

- [ ] **Step 1: Write the failing test**

Create `tests/test_beautify_model.py`:

```python
from models.wardrobe import WardrobeItem


def test_new_item_has_beautify_defaults():
    item = WardrobeItem(
        user_id="u1", owner_id="u1", category="top",
        image_url="https://x/y.jpg", name="Tee",
    )
    assert item.beautify_status in (None, "none")
    assert (item.beautify_attempts or 0) == 0


def test_to_dict_exposes_beautify_fields():
    item = WardrobeItem(
        user_id="u1", owner_id="u1", category="top",
        image_url="https://x/y.jpg", name="Tee",
    )
    item.beautify_status = "ready"
    item.image_studio_candidate = "https://cdn/beautified/abc.png"
    item.beautify_attempts = 1
    item.image_studio = "https://cdn/beautified/final.png"
    d = item.to_dict()
    assert d["beautify_status"] == "ready"
    assert d["image_studio_candidate"] == "https://cdn/beautified/abc.png"
    assert d["beautify_attempts"] == 1
    assert d["image_studio"] == "https://cdn/beautified/final.png"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_beautify_model.py -v`
Expected: FAIL (`AttributeError` / `KeyError: 'beautify_status'`).

- [ ] **Step 3: Add the columns**

In `models/wardrobe.py`, immediately after line 34 (`is_preparing = db.Column(...)`), add:

```python
    # === AI BEAUTIFY (studio product shot) — additive, opt-in mode ===
    # Accepted studio shot → becomes the display thumbnail (see to_dict precedence).
    image_studio = db.Column(db.String(1024), nullable=True)
    # Studio shot awaiting user review — NOT shown in the grid until accepted.
    image_studio_candidate = db.Column(db.String(1024), nullable=True)
    # none | pending | ready | accepted | discarded | failed
    beautify_status = db.Column(db.String(20), nullable=True, default='none', index=True)
    # Regenerate counter, capped by BEAUTIFY_MAX_REGENERATIONS.
    beautify_attempts = db.Column(db.Integer, nullable=True, default=0)
```

- [ ] **Step 4: Expose in `to_dict`**

In `models/wardrobe.py` `to_dict`, inside `base_dict` (after the `'image_png': self.image_png,` line at `:164`), add:

```python
            'image_studio': self.image_studio,
            'image_studio_candidate': self.image_studio_candidate,
            'beautify_status': self.beautify_status or 'none',
            'beautify_attempts': self.beautify_attempts or 0,
```

- [ ] **Step 5: Create the Alembic migration**

Run: `alembic revision -m "add beautify columns"` (scaffolds a file with the correct `down_revision` = current head). Then set its `upgrade()` / `downgrade()` bodies to:

```python
def upgrade():
    op.add_column('wardrobe_items', sa.Column('image_studio', sa.String(length=1024), nullable=True))
    op.add_column('wardrobe_items', sa.Column('image_studio_candidate', sa.String(length=1024), nullable=True))
    op.add_column('wardrobe_items', sa.Column('beautify_status', sa.String(length=20), nullable=True, server_default='none'))
    op.add_column('wardrobe_items', sa.Column('beautify_attempts', sa.Integer(), nullable=True, server_default='0'))
    op.create_index('ix_wardrobe_items_beautify_status', 'wardrobe_items', ['beautify_status'])


def downgrade():
    op.drop_index('ix_wardrobe_items_beautify_status', table_name='wardrobe_items')
    op.drop_column('wardrobe_items', 'beautify_attempts')
    op.drop_column('wardrobe_items', 'beautify_status')
    op.drop_column('wardrobe_items', 'image_studio_candidate')
    op.drop_column('wardrobe_items', 'image_studio')
```

Ensure `import sqlalchemy as sa` and `from alembic import op` are present (default in the scaffold).

- [ ] **Step 6: Run tests + validate migration file (do NOT apply)**

Run: `pytest tests/test_beautify_model.py -v` → Expected: PASS (constructs in-memory objects; no DB).
Run: `alembic history | head` → Expected: the new `add beautify columns` revision appears at the head of the chain (reads files only — no DB connection).
⚠️ **Do NOT run `alembic upgrade head`.** The backend's local `.env` `DATABASE_URL` points at the **prod Railway DB** (memory `backend-local-env-prod-db`). The migration FILE is the deliverable; applying it is deferred to devops/the user against a safe DB.

- [ ] **Step 7: Commit**

```bash
git add models/wardrobe.py migrations/versions/ tests/test_beautify_model.py
git commit -m "feat(wardrobe): add beautify columns to WardrobeItem"
```

## Phase 2 — BeautifyService (gpt-image-1)

### Task 2: `BeautifyService.generate_studio_shot` + `process_job` + config

**Files:**
- Modify: `settings.py` (near `OPENAI_IMAGE_MODEL` ~`:67`), `config.py` (~`:78`)
- Create: `services/beautify_service.py`
- Test: `tests/test_beautify_service.py`

**Interfaces:**
- Consumes: `settings.OPENAI_IMAGE_MODEL`, `settings.BEAUTIFY_MAX_REGENERATIONS`, `settings.BEAUTIFY_STUDIO_PROMPT`; `remove_bg_service.upload_cutout_png` for S3 upload; `queue_service`.
- Produces: `BeautifyService(db).generate_studio_shot(item_id: str) -> Optional[str]` (returns candidate URL or None; sets `beautify_status`/`image_studio_candidate`/`beautify_attempts`; raises `BeautifyService.CapReached` at cap); `BeautifyService(db).process_job(job_data: dict) -> bool`.

- [ ] **Step 1: Add config**

In `settings.py` (inside the `Settings` class, near `OPENAI_IMAGE_MODEL`), add:

```python
    BEAUTIFY_MAX_REGENERATIONS: int = 5
    BEAUTIFY_STUDIO_PROMPT: str = (
        "Turn this into a premium e-commerce product photo of the SAME garment: "
        "ghost-mannequin style, centered, on a seamless pure-white studio background, "
        "soft even studio lighting, sharp focus, true-to-source colors and details. "
        "Do not add logos, text, people, or props."
    )
```

In `config.py` (legacy `Config`), add:

```python
    BEAUTIFY_MAX_REGENERATIONS = int(os.getenv('BEAUTIFY_MAX_REGENERATIONS', '5'))
    BEAUTIFY_STUDIO_PROMPT = os.getenv('BEAUTIFY_STUDIO_PROMPT', '')
```

- [ ] **Step 2: Write the failing test**

Create `tests/test_beautify_service.py`:

```python
import base64
from unittest.mock import MagicMock, patch
import pytest

from services.beautify_service import BeautifyService
from models.wardrobe import WardrobeItem


def _item(**kw):
    it = WardrobeItem(user_id="u1", owner_id="u1", category="top",
                      image_url="https://x/y.jpg", name="Tee")
    it.id = "item-1"
    for k, v in kw.items():
        setattr(it, k, v)
    return it


def _fake_db(item):
    db = MagicMock()
    db.query.return_value.filter_by.return_value.first.return_value = item
    return db


@patch("services.beautify_service.upload_cutout_png", return_value="https://cdn/beautified/abc.png")
@patch("services.beautify_service.OpenAI")
def test_generate_studio_shot_success(mock_openai, mock_upload):
    png_b64 = base64.b64encode(b"PNGDATA").decode()
    mock_openai.return_value.images.edit.return_value = MagicMock(
        data=[MagicMock(b64_json=png_b64)]
    )
    item = _item(beautify_attempts=0)
    db = _fake_db(item)
    svc = BeautifyService(db)
    svc._fetch_bytes = MagicMock(return_value=b"SRC")  # skip network

    url = svc.generate_studio_shot("item-1")

    assert url == "https://cdn/beautified/abc.png"
    assert item.image_studio_candidate == "https://cdn/beautified/abc.png"
    assert item.beautify_status == "ready"
    assert item.beautify_attempts == 1


@patch("services.beautify_service.OpenAI")
def test_generate_studio_shot_failure_sets_failed(mock_openai):
    mock_openai.return_value.images.edit.side_effect = RuntimeError("boom")
    item = _item(beautify_attempts=0)
    db = _fake_db(item)
    svc = BeautifyService(db)
    svc._fetch_bytes = MagicMock(return_value=b"SRC")

    url = svc.generate_studio_shot("item-1")

    assert url is None
    assert item.beautify_status == "failed"


def test_generate_studio_shot_respects_cap():
    item = _item(beautify_attempts=5)
    db = _fake_db(item)
    svc = BeautifyService(db)
    with pytest.raises(BeautifyService.CapReached):
        svc.generate_studio_shot("item-1")
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest tests/test_beautify_service.py -v`
Expected: FAIL (`ModuleNotFoundError: services.beautify_service`).

- [ ] **Step 4: Implement `services/beautify_service.py`**

```python
"""
AI Beautify service — generates a studio product shot (ghost-mannequin on white)
from a wardrobe item's original photo via OpenAI gpt-image-1.

Additive to the create/tag pipeline: writes a *candidate* onto the item for the
user to review (accept/regenerate/discard via routers/wardrobe.py). Never raises
destructively from generate_studio_shot on API failure — sets beautify_status
='failed' and returns None (mirror remove_bg_service recovery posture).
"""
import os
import base64
import io
import json
import logging
import ssl
import urllib.request
from typing import Optional

from openai import OpenAI

from settings import get_settings
from models.wardrobe import WardrobeItem
from services.queue_service import queue_service
from services.remove_bg_service import upload_cutout_png

logger = logging.getLogger(__name__)


class BeautifyService:
    class CapReached(Exception):
        """Raised when beautify_attempts already >= BEAUTIFY_MAX_REGENERATIONS."""

    def __init__(self, db_session):
        self.db = db_session
        self.settings = get_settings()
        self.api_key = os.environ.get("OPENAI_API_KEY")

    def _fetch_bytes(self, image_url: str) -> Optional[bytes]:
        try:
            req = urllib.request.Request(image_url, headers={"User-Agent": "Mozilla/5.0"})
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
                return resp.read()
        except Exception as e:
            logger.error("beautify: fetch source failed: %s", e)
            return None

    def _generate_png(self, src_bytes: bytes) -> Optional[bytes]:
        client = OpenAI(api_key=self.api_key)
        buf = io.BytesIO(src_bytes)
        buf.name = "source.png"
        resp = client.images.edit(
            model=self.settings.OPENAI_IMAGE_MODEL,
            image=buf,
            prompt=self.settings.BEAUTIFY_STUDIO_PROMPT,
            size="1024x1536",
        )
        b64 = resp.data[0].b64_json
        return base64.b64decode(b64)

    def generate_studio_shot(self, item_id: str) -> Optional[str]:
        item = self.db.query(WardrobeItem).filter_by(id=item_id).first()
        if not item:
            return None

        cap = self.settings.BEAUTIFY_MAX_REGENERATIONS
        if (item.beautify_attempts or 0) >= cap:
            raise BeautifyService.CapReached()

        item.beautify_status = "pending"
        self.db.commit()

        try:
            src = self._fetch_bytes(item.image_url)
            if not src:
                raise RuntimeError("source image unavailable")
            png = self._generate_png(src)
            if not png:
                raise RuntimeError("no image returned")
            url = upload_cutout_png(png)  # reuse S3/R2 PNG upload → processed/ style URL
            if not url:
                raise RuntimeError("upload failed")

            item.image_studio_candidate = url
            item.beautify_status = "ready"
            item.beautify_attempts = (item.beautify_attempts or 0) + 1
            self.db.commit()
            self.db.refresh(item)
            logger.info("beautify: item %s candidate ready", item_id)
            return url
        except Exception as e:
            logger.error("beautify: item %s failed: %s", item_id, e)
            item.beautify_status = "failed"
            self.db.commit()
            return None

    def process_job(self, job_data: dict) -> bool:
        job_id = job_data.get("job_id")
        try:
            payload = json.loads(job_data.get("payload", "{}"))
            item_id = payload.get("item_id")
            queue_service.update_job_status(job_id, "processing")
            url = self.generate_studio_shot(item_id)
            if url:
                queue_service.update_job_status(job_id, "completed", result={"candidate_url": url})
                return True
            queue_service.update_job_status(job_id, "failed", error="beautify_failed")
            return False
        except BeautifyService.CapReached:
            queue_service.update_job_status(job_id, "failed", error="cap_reached")
            return False
        except Exception as e:
            queue_service.update_job_status(job_id, "failed", error=str(e))
            return False
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_beautify_service.py -v`
Expected: PASS (3 tests). The mock covers the call path; real-API param tuning is a Phase-6 smoke concern.

- [ ] **Step 6: Commit**

```bash
git add services/beautify_service.py settings.py config.py tests/test_beautify_service.py
git commit -m "feat(beautify): add BeautifyService studio-shot generation"
```

## Phase 3 — Queue + worker dispatch

### Task 3: `enqueue_beautify` + `"beautify"` job type

**Files:**
- Modify: `services/queue_service.py` (after `enqueue_typed_job` `:114`)
- Modify: `ai_worker.py` (dispatch block `:86-93`)
- Test: `tests/test_beautify_queue.py`

**Interfaces:**
- Consumes: `queue_service.enqueue_typed_job` (exists).
- Produces: `queue_service.enqueue_beautify(item_id: str, user_id: str) -> Optional[str]`; worker routes `job_type == "beautify"` → `BeautifyService(db).process_job(job_data)`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_beautify_queue.py`:

```python
from unittest.mock import patch
from services.queue_service import queue_service


@patch.object(queue_service, "enqueue_typed_job", return_value="beautify_job_item-1_abcd")
def test_enqueue_beautify_delegates_typed(mock_typed):
    job_id = queue_service.enqueue_beautify("item-1", "u1")
    assert job_id == "beautify_job_item-1_abcd"
    args, kwargs = mock_typed.call_args
    assert args[0] == "beautify"                        # job_type
    assert args[1].startswith("beautify_job_item-1_")   # job_id
    assert args[2] == {"item_id": "item-1", "user_id": "u1"}  # payload
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_beautify_queue.py -v`
Expected: FAIL (`AttributeError: ... 'enqueue_beautify'`).

- [ ] **Step 3: Add `enqueue_beautify`**

In `services/queue_service.py`, after `enqueue_typed_job` (before `get_job_status`, ~`:115`), add:

```python
    def enqueue_beautify(self, item_id: str, user_id: str) -> Optional[str]:
        """Enqueue an AI beautify (studio shot) job for an existing item."""
        import uuid
        job_id = f"beautify_job_{item_id}_{uuid.uuid4().hex[:8]}"
        return self.enqueue_typed_job("beautify", job_id, {"item_id": item_id, "user_id": user_id})
```

- [ ] **Step 4: Add worker dispatch**

In `ai_worker.py`, in the dispatch block (`:89-93`), add a branch before the `else`:

```python
                elif job_type == "tryon_render":
                    from services.tryon_render_service import TryonRenderService
                    success = TryonRenderService(db).process_job(job_data)
                elif job_type == "beautify":
                    from services.beautify_service import BeautifyService
                    success = BeautifyService(db).process_job(job_data)
                else:
                    success = AIService(db).process_ai_job(job_data)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pytest tests/test_beautify_queue.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add services/queue_service.py ai_worker.py tests/test_beautify_queue.py
git commit -m "feat(beautify): enqueue_beautify + worker dispatch"
```

## Phase 4 — Endpoints

### Task 4: `POST /items/{id}/beautify` (enqueue + regenerate cap)

**Files:**
- Modify: `routers/wardrobe.py` (import `BeautifyService`; add after `get_ai_enhanced_item` ~`:645`; model after `AIProcessingStatusResponse` `:84`)
- Test: `tests/test_beautify_endpoints.py`

**Interfaces:**
- Produces: `POST /api/wardrobe/items/{item_id}/beautify` → `{message, job_id, status:"pending", attempts}`; 404 unknown/not-owned; 409 at cap; 503 if Redis down. Helper `_get_owned_item(db, item_id, user) -> WardrobeItem`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_beautify_endpoints.py`. Wire the FastAPI test client + auth override the repo already uses in `tests/` (mirror an existing wardrobe endpoint test; `make_item` persists an owned `WardrobeItem` and `auth_headers` yields `user.id == "u1"`):

```python
from unittest.mock import patch
# from tests.conftest import client, auth_headers, make_item  # adapt to real fixtures


@patch("routers.wardrobe.queue_service")
def test_beautify_enqueues(mock_queue, client, auth_headers, make_item):
    mock_queue.is_connected.return_value = True
    mock_queue.enqueue_beautify.return_value = "beautify_job_x"
    item = make_item(user_id="u1", beautify_attempts=0)
    r = client.post(f"/api/wardrobe/items/{item.id}/beautify", headers=auth_headers)
    assert r.status_code == 201
    assert r.json()["job_id"] == "beautify_job_x"
    assert r.json()["status"] == "pending"


def test_beautify_404_when_not_owned(client, auth_headers, make_item):
    item = make_item(user_id="someone-else")
    r = client.post(f"/api/wardrobe/items/{item.id}/beautify", headers=auth_headers)
    assert r.status_code == 404


@patch("routers.wardrobe.queue_service")
def test_beautify_409_at_cap(mock_queue, client, auth_headers, make_item):
    mock_queue.is_connected.return_value = True
    item = make_item(user_id="u1", beautify_attempts=5)
    r = client.post(f"/api/wardrobe/items/{item.id}/beautify", headers=auth_headers)
    assert r.status_code == 409
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_beautify_endpoints.py::test_beautify_enqueues -v`
Expected: FAIL (404 — route not defined).

- [ ] **Step 3: Add the models, helper, and endpoint**

In `routers/wardrobe.py`, add the import (top, `:18` area): `from services.beautify_service import BeautifyService`. Add the response model after `AIProcessingStatusResponse` (`:84`):

```python
class BeautifyStatusResponse(BaseModel):
    """AI beautify status (the item row is the source of truth, not the Redis job)."""
    status: str  # none | pending | ready | accepted | discarded | failed
    candidate_url: Optional[str] = None
    attempts: int = 0
```

Add the helper + endpoint after `get_ai_enhanced_item`:

```python
def _get_owned_item(db: Session, item_id: str, user: User) -> WardrobeItem:
    item = db.query(WardrobeItem).filter_by(id=item_id, user_id=user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "Item not found"})
    return item


@router.post("/items/{item_id}/beautify", status_code=status.HTTP_201_CREATED)
async def start_beautify(
    item_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Enqueue an AI studio-shot generation for an owned item (also = Regenerate)."""
    request_id = getattr(request.state, "request_id", "unknown")
    item = _get_owned_item(db, item_id, user)

    from settings import get_settings
    cap = get_settings().BEAUTIFY_MAX_REGENERATIONS
    if (item.beautify_attempts or 0) >= cap:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "Regenerate limit reached", "attempts": item.beautify_attempts, "request_id": request_id},
        )

    if not queue_service.is_connected():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "AI processing queue unavailable", "request_id": request_id},
        )

    job_id = queue_service.enqueue_beautify(item_id, user.id)
    if not job_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Failed to enqueue beautify", "request_id": request_id},
        )

    return {"message": "Beautify started", "job_id": job_id, "status": "pending", "attempts": item.beautify_attempts or 0}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_beautify_endpoints.py -k beautify -v`
Expected: PASS (enqueue, 404, 409).

- [ ] **Step 5: Commit**

```bash
git add routers/wardrobe.py tests/test_beautify_endpoints.py
git commit -m "feat(beautify): POST /items/{id}/beautify endpoint with cap"
```

### Task 5: `GET /items/{id}/beautify/status`

**Files:**
- Modify: `routers/wardrobe.py`
- Test: `tests/test_beautify_endpoints.py` (extend)

**Interfaces:**
- Produces: `GET /api/wardrobe/items/{item_id}/beautify/status` → `BeautifyStatusResponse{status, candidate_url?, attempts}` (from the item row).

- [ ] **Step 1: Write the failing test** — append to `tests/test_beautify_endpoints.py`:

```python
def test_beautify_status_reads_item(client, auth_headers, make_item):
    item = make_item(user_id="u1", beautify_status="ready",
                     image_studio_candidate="https://cdn/beautified/abc.png",
                     beautify_attempts=1)
    r = client.get(f"/api/wardrobe/items/{item.id}/beautify/status", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ready"
    assert body["candidate_url"] == "https://cdn/beautified/abc.png"
    assert body["attempts"] == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_beautify_endpoints.py::test_beautify_status_reads_item -v`
Expected: FAIL (404).

- [ ] **Step 3: Add the endpoint** in `routers/wardrobe.py`, after `start_beautify`:

```python
@router.get("/items/{item_id}/beautify/status", response_model=BeautifyStatusResponse)
async def beautify_status(
    item_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BeautifyStatusResponse:
    """Current beautify state of an owned item (source of truth for the review flow)."""
    item = _get_owned_item(db, item_id, user)
    return BeautifyStatusResponse(
        status=item.beautify_status or "none",
        candidate_url=item.image_studio_candidate,
        attempts=item.beautify_attempts or 0,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_beautify_endpoints.py::test_beautify_status_reads_item -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add routers/wardrobe.py tests/test_beautify_endpoints.py
git commit -m "feat(beautify): GET beautify/status endpoint"
```

### Task 6: `POST .../beautify/accept` + `POST .../beautify/discard`

**Files:**
- Modify: `routers/wardrobe.py`
- Test: `tests/test_beautify_endpoints.py` (extend)

**Interfaces:**
- Produces: `accept` → `image_studio = candidate`, `beautify_status="accepted"`, clears candidate; returns `{message, item}` (`item.to_dict()`); 409 unless `status=="ready"`. `discard` → clears candidate, `beautify_status="discarded"`; returns `{message, item}`.

- [ ] **Step 1: Write the failing test** — append:

```python
def test_accept_promotes_candidate(client, auth_headers, make_item):
    item = make_item(user_id="u1", beautify_status="ready",
                     image_studio_candidate="https://cdn/beautified/abc.png")
    r = client.post(f"/api/wardrobe/items/{item.id}/beautify/accept", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()["item"]
    assert body["image_studio"] == "https://cdn/beautified/abc.png"
    assert body["beautify_status"] == "accepted"
    assert body["image_studio_candidate"] is None


def test_accept_409_when_not_ready(client, auth_headers, make_item):
    item = make_item(user_id="u1", beautify_status="pending")
    r = client.post(f"/api/wardrobe/items/{item.id}/beautify/accept", headers=auth_headers)
    assert r.status_code == 409


def test_discard_keeps_cutout(client, auth_headers, make_item):
    item = make_item(user_id="u1", beautify_status="ready",
                     image_studio_candidate="https://cdn/beautified/abc.png")
    r = client.post(f"/api/wardrobe/items/{item.id}/beautify/discard", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()["item"]
    assert body["beautify_status"] == "discarded"
    assert body["image_studio_candidate"] is None
    assert body.get("image_studio") is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_beautify_endpoints.py -k "accept or discard" -v`
Expected: FAIL (404).

- [ ] **Step 3: Add both endpoints** in `routers/wardrobe.py`, after `beautify_status`:

```python
@router.post("/items/{item_id}/beautify/accept")
async def accept_beautify(
    item_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Promote the reviewed candidate to the display thumbnail."""
    request_id = getattr(request.state, "request_id", "unknown")
    item = _get_owned_item(db, item_id, user)
    if item.beautify_status != "ready" or not item.image_studio_candidate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "No candidate ready to accept", "request_id": request_id},
        )
    item.image_studio = item.image_studio_candidate
    item.image_studio_candidate = None
    item.beautify_status = "accepted"
    db.commit()
    db.refresh(item)
    return {"message": "Accepted", "item": item.to_dict()}


@router.post("/items/{item_id}/beautify/discard")
async def discard_beautify(
    item_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Discard the candidate and keep the existing cutout as display."""
    item = _get_owned_item(db, item_id, user)
    item.image_studio_candidate = None
    item.beautify_status = "discarded"
    db.commit()
    db.refresh(item)
    return {"message": "Discarded", "item": item.to_dict()}
```

- [ ] **Step 4: Run the full endpoint suite**

Run: `pytest tests/test_beautify_endpoints.py -v`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add routers/wardrobe.py tests/test_beautify_endpoints.py
git commit -m "feat(beautify): accept/discard endpoints for review flow"
```

## Phase 5 — Admin gender-classify → OpenAI

### Task 7: Rewrite `classify_gender` to OpenAI gpt-4o

**Files:**
- Modify: `services/fashion_ai_service.py` (replace lines 1–92; keep singleton block)
- Test: `tests/test_classify_gender_openai.py`

**Interfaces:**
- Produces: `FashionAIService().classify_gender(image_url)` → **unchanged** return shape `{"success": True, "target_gender": "women|men|unisex", "gender_weight": <float>}` (so `routers/admin/common_items.py:273` needs no change). Now backed by OpenAI `gpt-4o` vision.

- [ ] **Step 1: Write the failing test**

Create `tests/test_classify_gender_openai.py`:

```python
import json
from unittest.mock import MagicMock, patch
from services.fashion_ai_service import FashionAIService


def _png_bytes():
    import io
    from PIL import Image
    b = io.BytesIO()
    Image.new("RGB", (4, 4), "white").save(b, format="PNG")
    return b.getvalue()


@patch("services.fashion_ai_service.requests.get")
@patch("services.fashion_ai_service.OpenAI")
def test_classify_gender_uses_openai(mock_openai, mock_get):
    resp = MagicMock(content=_png_bytes(), status_code=200)
    resp.raise_for_status = lambda: None
    mock_get.return_value = resp
    payload = json.dumps({"target_gender": "women", "confidence": 0.82})
    mock_openai.return_value.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content=payload))]
    )
    svc = FashionAIService(api_key="sk-test")
    out = svc.classify_gender("https://x/y.jpg")
    assert out["success"] is True
    assert out["target_gender"] == "women"
    assert out["gender_weight"] == 0.82
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_classify_gender_openai.py -v`
Expected: FAIL (`AttributeError: module 'services.fashion_ai_service' has no attribute 'OpenAI'`).

- [ ] **Step 3: Rewrite the service** — replace `services/fashion_ai_service.py` lines 1–92 (keep the `_fashion_ai_service`/`get_fashion_ai_service` block at the bottom unchanged) with:

```python
import os
import json
import logging
import io
import base64
import requests
from openai import OpenAI
from PIL import Image
from settings import get_settings
from utils.image_utils import flatten_transparent_image

logger = logging.getLogger(__name__)

_GENDER_MAP = {"women": "women", "men": "men", "unisex": "unisex"}


class FashionAIService:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")

    def classify_gender(self, image_url: str) -> dict:
        """Classify a garment's target gender from its image URL via OpenAI gpt-4o.

        Return shape is unchanged from the prior Gemini implementation:
          {"success": True, "target_gender": "women|men|unisex", "gender_weight": float}
        """
        if not self.api_key:
            return {"success": False, "error": "OPENAI_API_KEY not configured"}

        try:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            resp = requests.get(image_url, timeout=10, verify=False)
            resp.raise_for_status()

            with Image.open(io.BytesIO(resp.content)) as pil_image:
                prepared = flatten_transparent_image(pil_image, background_hex="#F3F5F9")
                buf = io.BytesIO()
                prepared.save(buf, format="JPEG", quality=95)
                image_data = buf.getvalue()

            b64 = base64.b64encode(image_data).decode("utf-8")
            prompt = (
                "Analyze this clothing item. Is it primarily designed for 'women', "
                "'men', or is it 'unisex'? Consider cut, style, and typical fashion "
                "norms. Return ONLY JSON: "
                '{"target_gender": "women|men|unisex", "confidence": 0.0-1.0}. '
                "No markdown."
            )
            client = OpenAI(api_key=self.api_key)
            res = client.chat.completions.create(
                model="gpt-4o",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                    ],
                }],
                temperature=0.1,
                max_tokens=100,
                response_format={"type": "json_object"},
            )
            raw = res.choices[0].message.content
            data = json.loads(raw.replace("```json", "").replace("```", "").strip())
            gender = _GENDER_MAP.get(str(data.get("target_gender", "")).lower(), "unisex")
            return {"success": True, "target_gender": gender, "gender_weight": float(data.get("confidence", 0.5))}

        except Exception as e:
            logger.error(f"AI Gender Classification failed: {str(e)}")
            return {"success": False, "error": str(e)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_classify_gender_openai.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/fashion_ai_service.py tests/test_classify_gender_openai.py
git commit -m "feat(admin): move gender-classify from Gemini to OpenAI gpt-4o"
```

## Phase 6 — Backend docs + e2e + stale-label cleanup

### Task 8: Docs, stale "Gemini" labels, e2e smoke

**Files:**
- Modify: `API_DOCUMENTATION.md`, `MODELS_DOCUMENTATION.md`, `CLAUDE.md`, `models/wardrobe.py:60`, `services/ai_service.py` docstrings

- [ ] **Step 1: Document the 4 new routes** in `API_DOCUMENTATION.md` (wardrobe section): `POST /api/wardrobe/items/{id}/beautify` (201 `{job_id,status,attempts}`, 409 at cap, 503 no queue), `GET .../beautify/status` (`{status,candidate_url,attempts}`), `POST .../beautify/accept` (`{item}`, 409 if not ready), `POST .../beautify/discard` (`{item}`). Note the `beautify_status` enum + display precedence `image_studio → image_png → image_url`.
- [ ] **Step 2: Document the 4 new columns** in `MODELS_DOCUMENTATION.md` (`WardrobeItem`).
- [ ] **Step 3: Fix stale labels** — `models/wardrobe.py:60` `# === GEMINI METADATA FIELDS ===` → `# === AI METADATA FIELDS (OpenAI gpt-4o) ===`; `:63` `# Detailed description from Gemini` → `from OpenAI`; in `CLAUDE.md` change the "🤖 LLM (Gemini) Services" heading + `/items/ai-enhanced` provider note to OpenAI.
- [ ] **Step 4: Run backend e2e smoke**

Run: `python test_server.py`
Expected: existing suite green; the beautify real-`gpt-image-1` leg is exercised by unit mocks + a manual smoke (allow-fail locally if no image key).

- [ ] **Step 5: Commit**

```bash
git add API_DOCUMENTATION.md MODELS_DOCUMENTATION.md CLAUDE.md models/wardrobe.py services/ai_service.py
git commit -m "docs(beautify): document beautify API/model; fix stale Gemini labels"
```

---

# PART B — MOBILE (`auxi/`)

> Run mobile commands from `/Users/nguyenminhduc/dev/wardrobe_project/auxi`. Tests: `yarn jest`. Do NOT trigger native rebuilds (Fast Refresh only); never run global/destructive Metro/pods ops.

## Phase 7 — Types + service methods

### Task 9: `WardrobeItem` beautify fields + 4 service methods

**Files:**
- Modify: `src/services/wardrobeService.ts` (`WardrobeItem` type ~`:30-61`; add methods after `aiEnhanceWardrobeItem` `:357`)
- Test: `src/services/__tests__/wardrobeService.beautify.test.ts`

**Interfaces:**
- Produces: `wardrobeService.beautifyItem(id): Promise<{job_id;status;attempts}>`, `getBeautifyStatus(id): Promise<BeautifyStatus>`, `acceptBeautify(id): Promise<WardrobeItem>`, `discardBeautify(id): Promise<WardrobeItem>`; `BeautifyStatus`; `WardrobeItem` gains `image_studio?`, `image_studio_candidate?`, `beautify_status?`, `beautify_attempts?`.

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/wardrobeService.beautify.test.ts`. Mock the axios instance the service actually uses (`wardrobeApi`); assert URL + return shape:

```ts
import { wardrobeService } from '../wardrobeService';

const mockPost = jest.fn();
const mockGet = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: () => ({
      post: (...a: any[]) => mockPost(...a),
      get: (...a: any[]) => mockGet(...a),
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    }),
  },
}));

describe('beautify service methods', () => {
  beforeEach(() => { mockPost.mockReset(); mockGet.mockReset(); });

  it('beautifyItem POSTs to the beautify route', async () => {
    mockPost.mockResolvedValue({ data: { job_id: 'j1', status: 'pending', attempts: 0 } });
    const res = await wardrobeService.beautifyItem('item-1');
    expect(mockPost).toHaveBeenCalledWith('/wardrobe/items/item-1/beautify');
    expect(res.job_id).toBe('j1');
  });

  it('getBeautifyStatus GETs the status route', async () => {
    mockGet.mockResolvedValue({ data: { status: 'ready', candidate_url: 'u', attempts: 1 } });
    const res = await wardrobeService.getBeautifyStatus('item-1');
    expect(mockGet).toHaveBeenCalledWith('/wardrobe/items/item-1/beautify/status');
    expect(res.status).toBe('ready');
  });
});
```

> Adapt the mock to `wardrobeService`'s real axios seam (the report notes a `wardrobeApi` instance with a request interceptor). Keep assertions on URL + return shape.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest wardrobeService.beautify`
Expected: FAIL (`beautifyItem is not a function`).

- [ ] **Step 3: Add the type fields** — in `src/services/wardrobeService.ts`, extend `WardrobeItem` (`:30-61`):

```ts
  image_studio?: string;
  image_studio_candidate?: string;
  beautify_status?: 'none' | 'pending' | 'ready' | 'accepted' | 'discarded' | 'failed';
  beautify_attempts?: number;
```

Add above the `wardrobeService` object:

```ts
export interface BeautifyStatus {
  status: 'none' | 'pending' | 'ready' | 'accepted' | 'discarded' | 'failed';
  candidate_url?: string;
  attempts: number;
}
```

- [ ] **Step 4: Add the 4 methods** — after `aiEnhanceWardrobeItem` (`:357`):

```ts
  beautifyItem: async (id: string): Promise<{ job_id: string; status: string; attempts: number }> => {
    const response = await wardrobeApi.post(`/wardrobe/items/${id}/beautify`);
    return response.data;
  },

  getBeautifyStatus: async (id: string): Promise<BeautifyStatus> => {
    const response = await wardrobeApi.get(`/wardrobe/items/${id}/beautify/status`);
    return response.data;
  },

  acceptBeautify: async (id: string): Promise<WardrobeItem> => {
    const response = await wardrobeApi.post(`/wardrobe/items/${id}/beautify/accept`);
    return getSingleItem(response.data);
  },

  discardBeautify: async (id: string): Promise<WardrobeItem> => {
    const response = await wardrobeApi.post(`/wardrobe/items/${id}/beautify/discard`);
    return getSingleItem(response.data);
  },
```

- [ ] **Step 5: Run test + typecheck**

Run: `yarn jest wardrobeService.beautify` → PASS
Run: `npx tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/services/wardrobeService.ts src/services/__tests__/wardrobeService.beautify.test.ts
git commit -m "feat(beautify): wardrobeService beautify methods + types"
```

## Phase 8 — Route params + status helpers

### Task 10: Register route params + `beautify-status` helpers

**Files:**
- Modify: `src/types/navigation.ts` (`AppStackParamList`)
- Create: `src/screens/wardrobe/beautify-status.ts`
- Test: `src/screens/wardrobe/__tests__/beautify-status.test.ts`

**Interfaces:**
- Produces: route params `BeautifyPending: {itemId: string; originalUri: string}`, `BeautifyReview: {itemId: string; originalUri: string}`; `BEAUTIFY_POLL_MS = 4000`; `beautifyStep(elapsedMs): string`; `anyBeautifying(items): boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/screens/wardrobe/__tests__/beautify-status.test.ts`:

```ts
import { beautifyStep, anyBeautifying, BEAUTIFY_POLL_MS } from '../beautify-status';

describe('beautify-status helpers', () => {
  it('rotates copy over time', () => {
    expect(beautifyStep(0)).toMatch(/background/i);
    expect(beautifyStep(20000)).not.toBe(beautifyStep(0));
  });
  it('detects any beautifying item', () => {
    expect(anyBeautifying([{ beautify_status: 'pending' } as any])).toBe(true);
    expect(anyBeautifying([{ beautify_status: 'accepted' } as any])).toBe(false);
  });
  it('exposes a 4s poll interval', () => {
    expect(BEAUTIFY_POLL_MS).toBe(4000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest beautify-status`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/screens/wardrobe/beautify-status.ts`**

```ts
import type { WardrobeItem } from '../../services/wardrobeService';

export const BEAUTIFY_POLL_MS = 4000;

const STEPS = [
  'Removing background…',
  'Setting up studio lighting…',
  'Polishing the details…',
  'Almost there…',
];

/** Client-side rotating status copy (gpt-image-1 gives no real progress). */
export function beautifyStep(elapsedMs: number): string {
  const idx = Math.min(STEPS.length - 1, Math.floor(elapsedMs / 7000));
  return STEPS[idx];
}

export function anyBeautifying(items: Pick<WardrobeItem, 'beautify_status'>[]): boolean {
  return items.some((i) => i.beautify_status === 'pending');
}
```

- [ ] **Step 4: Register the route params** — in `src/types/navigation.ts` `AppStackParamList`, add:

```ts
  BeautifyPending: { itemId: string; originalUri: string };
  BeautifyReview: { itemId: string; originalUri: string; from?: 'loader' | 'snackbar' };
```

- [ ] **Step 5: Run test + typecheck**

Run: `yarn jest beautify-status` → PASS
Run: `npx tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/screens/wardrobe/beautify-status.ts src/screens/wardrobe/__tests__/beautify-status.test.ts src/types/navigation.ts
git commit -m "feat(beautify): route params + status helpers"
```

### Task 11: Pending screen (watch-or-leave waiting UX)

**Files:**
- Create: `src/screens/wardrobe/BeautifyPendingScreen.tsx`
- Modify: `src/navigation/AppNavigator.tsx` (import + `<Stack.Screen name="BeautifyPending">`)

**Interfaces:**
- Consumes: `wardrobeService.getBeautifyStatus/beautifyItem`, `beautifyStep`, `BEAUTIFY_POLL_MS`, `MacgieLoader`, `analytics.track`, theme `ds`.
- Produces: `nav.replace('BeautifyReview', {itemId, originalUri})` on `ready`; `nav.navigate('MainTabs')` on Continue browsing; inline failure actions.

- [ ] **Step 1: Implement the screen**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MacgieLoader } from '../../components/macgie/MacgieLoader';
import { wardrobeService } from '../../services/wardrobeService';
import { beautifyStep, BEAUTIFY_POLL_MS } from './beautify-status';
import { track } from '../../services/analytics';
import { ds } from '../../theme/theme';

const MAX_WAIT_MS = 3 * 60 * 1000;

export function BeautifyPendingScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { itemId, originalUri } = route.params;
  const [elapsed, setElapsed] = useState(0);
  const [failed, setFailed] = useState(false);
  const started = useRef(Date.now());

  useEffect(() => {
    let alive = true;
    const tick = setInterval(() => alive && setElapsed(Date.now() - started.current), 1000);
    const poll = setInterval(async () => {
      if (!alive) return;
      if (Date.now() - started.current > MAX_WAIT_MS) { setFailed(true); return; }
      try {
        const s = await wardrobeService.getBeautifyStatus(itemId);
        if (!alive) return;
        if (s.status === 'ready') {
          track('beautify_ready');
          nav.replace('BeautifyReview', { itemId, originalUri, from: 'loader' });
        } else if (s.status === 'failed') {
          setFailed(true);
        }
      } catch { /* keep polling */ }
    }, BEAUTIFY_POLL_MS);
    return () => { alive = false; clearInterval(tick); clearInterval(poll); };
  }, [itemId, originalUri, nav]);

  if (failed) {
    return (
      <View style={styles.container} testID="beautify-pending-failed">
        <Image source={{ uri: originalUri }} style={styles.photo} />
        <Text style={styles.title}>Couldn't beautify this one</Text>
        <Text style={styles.sub}>Your item is saved with its background removed.</Text>
        <Pressable testID="beautify-pending-keep" style={styles.primary} onPress={() => nav.navigate('MainTabs')}>
          <Text style={styles.primaryText}>Keep original</Text>
        </Pressable>
        <Pressable
          testID="beautify-pending-retry"
          style={styles.secondary}
          onPress={async () => {
            setFailed(false); started.current = Date.now(); setElapsed(0);
            try { await wardrobeService.beautifyItem(itemId); track('beautify_regenerated', { attempt: 'retry' }); } catch {}
          }}
        >
          <Text style={styles.secondaryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="beautify-pending">
      <Image source={{ uri: originalUri }} style={styles.photo} blurRadius={6} />
      <View style={styles.panel}>
        <MacgieLoader variant="inline" testID="beautify-pending-macgie" />
        <Text style={styles.title}>Beautifying ✨</Text>
        <Text style={styles.sub}>{beautifyStep(elapsed)}</Text>
        <Text style={styles.hint}>~30–60s</Text>
      </View>
      <Pressable testID="beautify-pending-continue" style={styles.secondary} onPress={() => { track('beautify_wait_continued_browsing'); nav.navigate('MainTabs'); }}>
        <Text style={styles.secondaryText}>Continue browsing</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, backgroundColor: ds.color.bg },
  photo: { position: 'absolute', width: '100%', height: '100%', opacity: 0.15 },
  panel: { alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '700', color: ds.color.text },
  sub: { fontSize: 14, color: ds.color.textMuted },
  hint: { fontSize: 12, color: ds.color.textMuted },
  primary: { backgroundColor: ds.color.text, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  primaryText: { color: ds.color.bg, fontWeight: '600' },
  secondary: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: ds.color.border },
  secondaryText: { color: ds.color.text, fontWeight: '600' },
});
```

> Confirm `ds.color.*` token names against `src/theme/theme.ts` and `MacgieLoader` prop API against `src/components/macgie/MacgieLoader.tsx` (report: `variant="inline"`). No raw hex — token-lint gate. `MainTabs` = the real tab-navigator route name; adjust if the wardrobe route differs.

- [ ] **Step 2: Register + typecheck**

Add import + `<Stack.Screen name="BeautifyPending" component={BeautifyPendingScreen} options={{ headerShown: false }} />` in `AppNavigator.tsx`.
Run: `npx tsc --noEmit` → clean. `yarn lint` → no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/wardrobe/BeautifyPendingScreen.tsx src/navigation/AppNavigator.tsx
git commit -m "feat(beautify): pending screen with watch-or-leave waiting UX"
```

### Task 12: Review screen (before/after + Accept/Regenerate/Keep original)

**Files:**
- Create: `src/screens/wardrobe/BeautifyReviewScreen.tsx`
- Modify: `src/navigation/AppNavigator.tsx` (`<Stack.Screen name="BeautifyReview">`)

**Interfaces:**
- Consumes: `wardrobeService.getBeautifyStatus/acceptBeautify/discardBeautify/beautifyItem`, `useQueryClient` + `wardrobeKeys`, `analytics.track`.

- [ ] **Step 1: Implement the screen**

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { wardrobeService } from '../../services/wardrobeService';
import { wardrobeKeys } from './wardrobe-grid'; // shared key factory (commit c566b9e51); adjust path if elsewhere
import { track } from '../../services/analytics';
import { ds } from '../../theme/theme';

const REGEN_CAP = 5;

export function BeautifyReviewScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();
  const { itemId, originalUri } = route.params;
  const [candidate, setCandidate] = useState<string | undefined>();
  const [attempts, setAttempts] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    track('beautify_review_opened', { from: route.params.from ?? 'loader' });
    wardrobeService.getBeautifyStatus(itemId).then((s) => {
      setCandidate(s.candidate_url); setAttempts(s.attempts);
    }).catch(() => {});
  }, [itemId]);

  const done = () => { qc.invalidateQueries({ queryKey: wardrobeKeys.all }); nav.navigate('MainTabs'); };

  const onAccept = async () => {
    setBusy(true);
    try { await wardrobeService.acceptBeautify(itemId); track('beautify_accepted'); done(); }
    finally { setBusy(false); }
  };
  const onKeep = async () => {
    setBusy(true);
    try { await wardrobeService.discardBeautify(itemId); track('beautify_kept_original'); done(); }
    finally { setBusy(false); }
  };
  const onRegenerate = async () => {
    setBusy(true);
    try {
      await wardrobeService.beautifyItem(itemId);
      track('beautify_regenerated', { attempt: attempts + 1 });
      nav.replace('BeautifyPending', { itemId, originalUri });
    } catch { setBusy(false); } // 409 = cap reached
  };

  const atCap = attempts >= REGEN_CAP;

  return (
    <View style={styles.container} testID="beautify-review">
      <Text style={styles.title}>Studio shot ready ✨</Text>
      <View style={styles.row}>
        <View style={styles.col}><Text style={styles.label}>Before</Text><Image source={{ uri: originalUri }} style={styles.img} /></View>
        <View style={styles.col}><Text style={styles.label}>After</Text>
          {candidate ? <Image source={{ uri: candidate }} style={styles.img} /> : <ActivityIndicator />}
        </View>
      </View>
      <Pressable testID="beautify-review-accept" style={[styles.primary, busy && styles.disabled]} disabled={busy} onPress={onAccept}>
        <Text style={styles.primaryText}>Accept & save</Text>
      </Pressable>
      <Pressable testID="beautify-review-regenerate" style={[styles.secondary, (busy || atCap) && styles.disabled]} disabled={busy || atCap} onPress={onRegenerate}>
        <Text style={styles.secondaryText}>{atCap ? 'Keep the best one' : 'Regenerate'}</Text>
      </Pressable>
      <Pressable testID="beautify-review-keep-original" style={[styles.ghost, busy && styles.disabled]} disabled={busy} onPress={onKeep}>
        <Text style={styles.ghostText}>Keep original</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, justifyContent: 'center', backgroundColor: ds.color.bg },
  title: { fontSize: 20, fontWeight: '700', color: ds.color.text, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 6, alignItems: 'center' },
  label: { fontSize: 12, color: ds.color.textMuted },
  img: { width: '100%', aspectRatio: 3 / 4, borderRadius: 12, backgroundColor: ds.color.surface },
  primary: { backgroundColor: ds.color.text, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: ds.color.bg, fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: ds.color.border, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  secondaryText: { color: ds.color.text, fontWeight: '600' },
  ghost: { paddingVertical: 12, alignItems: 'center' },
  ghostText: { color: ds.color.textMuted, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
```

> Card images use `aspectRatio: 3/4` per the CEO card-ratio rule (memory `ceo-ui-spacing-and-card-ratio-rules`). Reuse the shared `wardrobeKeys` factory; fix its import path if it isn't in `wardrobe-grid.ts`.

- [ ] **Step 2: Register + typecheck + lint + token lint**

Add `<Stack.Screen name="BeautifyReview" component={BeautifyReviewScreen} options={{ headerShown: false }} />` (+ import) in `AppNavigator.tsx`.
Run: `npx tsc --noEmit` → clean. `yarn lint` → no new errors. `./scripts/auxi-lint-tokens.sh` (umbrella root) → no hex drift.

- [ ] **Step 3: Commit**

```bash
git add src/screens/wardrobe/BeautifyReviewScreen.tsx src/navigation/AppNavigator.tsx
git commit -m "feat(beautify): before/after review screen (accept/regenerate/keep)"
```

## Phase 9 — Mode toggle + consent + wire-up

### Task 13: Mode rows in AddItemSheet + thread mode + consent + fire beautify

**Files:**
- Modify: `src/screens/wardrobe/AddItemSheet.tsx` (mode rows in `styles.addSheetBody`), `src/screens/wardrobe/AddMethodRow.tsx` (optional `selected` prop)
- Modify: `src/screens/wardrobe/useAddWardrobeItem.ts` (`handleImageSelection` `:56-133`)

**Interfaces:**
- Consumes: `wardrobeService.uploadWardrobeItem`, `wardrobeService.beautifyItem`, the AI-consent gate (`src/services/aiConsent.ts` + `AiConsentDialog`/`useAiConsentGate`, whatever try-on uses), `analytics.track`, navigation.
- Produces: `UploadMode = 'remove_bg' | 'beautify'` selected in the sheet, threaded to `handleImageSelection(type, mode)`; Mode A = current behavior; Mode B = consent → upload → `beautifyItem` → `navigate('BeautifyPending', {itemId, originalUri})`.

- [ ] **Step 1: Add the mode rows to `AddItemSheet.tsx`**

Add a two-row selector (reuse `AddMethodRow`) inside `styles.addSheetBody`, alongside the take-photo choice:

```tsx
const [mode, setMode] = useState<'remove_bg' | 'beautify'>('remove_bg');

<AddMethodRow
  testID="wardrobe-add-mode-remove_bg"
  title="Remove background"
  subtitle="Fast, clean cut-out"
  selected={mode === 'remove_bg'}
  onPress={() => setMode('remove_bg')}
/>
<AddMethodRow
  testID="wardrobe-add-mode-beautify"
  title="AI beautify ✨"
  subtitle="Studio product shot (uses AI)"
  selected={mode === 'beautify'}
  onPress={() => { setMode('beautify'); track('add_item_mode_selected', { mode: 'beautify' }); }}
/>
```

Thread `mode` into the take-photo handler so `handleTakePhoto`/`handleImageSelection` receives it. If `AddMethodRow` lacks a `selected` prop, add one (border/checkmark via tokens) with `testID` pass-through.

- [ ] **Step 2: Thread `mode` + consent + beautify into the hook**

In `src/screens/wardrobe/useAddWardrobeItem.ts`, change `handleImageSelection` to accept `mode` and branch after a successful upload (adapt to real local names — `uploading`/`setUploading`, `track`, `nav`, `user`, `source`, `typeHint`, `asset`):

```ts
const handleImageSelection = async (type: 'camera' | 'gallery', mode: 'remove_bg' | 'beautify' = 'remove_bg') => {
  // ... existing picker → asset (unchanged) ...
  if (mode === 'beautify') {
    const ok = await ensureAiConsent(); // opens AiConsentDialog; returns boolean (reuse try-on's gate)
    if (!ok) { track('add_item_upload_cancelled', { reason: 'ai_consent_declined' }); return; }
  }
  setUploading(true);
  track('add_item_upload_started', { source, mode });
  try {
    const item = await wardrobeService.uploadWardrobeItem(asset, user, typeHint);
    track('wardrobe_item_added', { source, method: 'take_photo', item_id: item.id, category: item.category, mode });
    if (mode === 'beautify') {
      track('beautify_started');
      await wardrobeService.beautifyItem(item.id);
      nav.navigate('BeautifyPending', { itemId: item.id, originalUri: asset.uri });
    }
    // mode === 'remove_bg' → existing success path (snackbar/refetch) unchanged
  } catch (e) {
    track('add_item_upload_failed', { source });
  } finally {
    setUploading(false);
  }
};
```

- [ ] **Step 3: Typecheck + lint + DS-primitive lint**

Run: `npx tsc --noEmit` → clean. `yarn lint` → no new errors. `auxi/scripts/auxi-lint-ds-primitives.sh` → no new raw-control warnings (use `AddMethodRow`/`M*`).

- [ ] **Step 4: Manual sanity (no rebuild — Fast Refresh)**

App already running: open Add sheet → both mode rows show + `testID`s present. (Full sim smoke is qa-mobile, step 7.)

- [ ] **Step 5: Commit**

```bash
git add src/screens/wardrobe/AddItemSheet.tsx src/screens/wardrobe/AddMethodRow.tsx src/screens/wardrobe/useAddWardrobeItem.ts
git commit -m "feat(beautify): upload mode toggle + consent gate + fire beautify"
```

## Phase 10 — Background pending state + ready snackbar

### Task 14: Beautifying tile shimmer + extend poll + "ready to review" snackbar

**Files:**
- Modify: `src/screens/wardrobe/WardrobeGridTile.tsx` (badge at `:70`)
- Modify: `src/screens/wardrobe/wardrobe-grid.ts` (poll predicate ~`:57-63,101`)
- Modify: `src/screens/wardrobe/WardrobeScreen.tsx` (`refetchInterval` `:114`)
- Modify: `src/screens/wardrobe/useItemReadySnackbar.ts` (reconcile ~`:62-98`)

**Interfaces:**
- Consumes: `anyBeautifying` (Task 10), `ItemReadySnackbar`, navigation.
- Produces: tile shows a "✨ beautifying" state while `beautify_status==='pending'`; wardrobe keeps polling while `anyBeautifying`; a `pending→ready` transition shows a "Studio shot ready — Review" snackbar → opens `BeautifyReview`.

- [ ] **Step 1: Tile shimmer** — in `WardrobeGridTile.tsx`, alongside the existing preparing badge (`:70`):

```tsx
{item.beautify_status === 'pending' && (
  <View testID={`wardrobe-tile-beautifying-${item.id}`} style={styles.beautifyBadge}>
    <Text style={styles.beautifyBadgeText}>✨</Text>
  </View>
)}
```

Add `beautifyBadge`/`beautifyBadgeText` styles using tokens (mirror the existing preparing-badge style).

- [ ] **Step 2: Extend the poll predicate** — in `WardrobeScreen.tsx:114`, change the `refetchInterval` condition from `anyPreparing(items)` to `anyPreparing(items) || anyBeautifying(items)` (import `anyBeautifying` from `./beautify-status`). Keep `PREPARING_POLL_MS` (4s).

- [ ] **Step 3: Ready snackbar on beautify transition** — in `useItemReadySnackbar.ts`, extend `reconcileReadyItems` to also detect `beautify_status` `pending → ready` (track prior statuses in the same ref map). On such a transition, show:

```ts
// mirror the existing prev-status map + transition detection
if (prev === 'pending' && curr.beautify_status === 'ready') {
  showSnackbar({
    testID: 'beautify-ready-snackbar',
    label: '✨ Studio shot ready — Review',
    onPress: () => nav.navigate('BeautifyReview', { itemId: curr.id, originalUri: curr.image_url, from: 'snackbar' }),
  });
}
```

> `beautify_review_opened {from}` is fired once by the review screen (Task 12) via the `from` route param — do NOT also fire it here, to avoid double-counting. Reuse the `ItemReadySnackbar` component; if it only supports the mint "item ready" copy, parametrize its label/onPress.

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit` → clean. `yarn lint` → no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/wardrobe/WardrobeGridTile.tsx src/screens/wardrobe/wardrobe-grid.ts src/screens/wardrobe/WardrobeScreen.tsx src/screens/wardrobe/useItemReadySnackbar.ts
git commit -m "feat(beautify): beautifying tile state + ready-to-review snackbar"
```

## Phase 11 — Analytics doc

### Task 15: Update the Mixpanel tracking plan

**Files:**
- Modify: `docs/analytics/mixpanel-tracking-plan.md`

- [ ] **Step 1: Add events to §5** with `file:line` + properties: `add_item_mode_selected {mode}`, `beautify_started`, `beautify_wait_continued_browsing`, `beautify_ready`, `beautify_review_opened {from}`, `beautify_accepted`, `beautify_regenerated {attempt}`, `beautify_kept_original`, `beautify_failed {reason}`, plus the new `mode` prop on `wardrobe_item_added` and `add_item_upload_started`.
- [ ] **Step 2: Add the "Beautify funnel" to §10:** `beautify_started → beautify_ready → beautify_review_opened → beautify_accepted` (segment by `from` = watch vs. leave; `beautify_kept_original`/`beautify_failed` are exits).
- [ ] **Step 3: Commit**

```bash
git add docs/analytics/mixpanel-tracking-plan.md
git commit -m "docs(analytics): add beautify events + funnel to tracking plan"
```

---

## Final verification (before PR)

- [ ] Backend: `pytest tests/test_beautify_*.py tests/test_classify_gender_openai.py -v` all green; `python test_server.py` green (beautify real-call leg noted).
- [ ] Mobile: `npx tsc --noEmit` clean; `yarn lint` no new errors; `yarn jest` green; `./scripts/auxi-lint-tokens.sh` + `auxi/scripts/auxi-lint-ds-primitives.sh` clean.
- [ ] Cross-repo contract: `API_DOCUMENTATION.md` matches the 4 shipped routes (tech-lead sign-off per umbrella rule).
- [ ] Manual smoke (real backend on :5001): upload Mode A (unchanged) + Mode B (studio shot → pending → review → accept/regenerate/keep); leave pending → tile shimmer → ready snackbar → review.
- [ ] Downstream gates (not in this plan): qa-ui Compare on the two new screens; designer step-6.5 gate; qa-mobile sim smoke; Maestro flow authored by qa-ui.

## Notes / assumptions to confirm at execution

- `gpt-image-1` `images.edit` exact kwargs (`size`, whether it accepts a plain `BytesIO`) may need a one-line tweak against the installed `openai` SDK version — verify in Task 2 smoke; unit tests mock the client so they stay green regardless.
- The mobile axios seam (`wardrobeApi` construction + interceptor) — adapt the Task 9 test mock to the real instance.
- `AiConsentDialog`/`useAiConsentGate` exact hook name — the report cites `src/services/aiConsent.ts` + `src/components/features/AiConsentDialog.tsx`; wire `ensureAiConsent()` to whatever the try-on path already uses.
- `ds.color.*` token names, `MacgieLoader` prop API, and the tab route name (`MainTabs`) — confirm against `src/theme/theme.ts`, `src/components/macgie/MacgieLoader.tsx`, and `AppNavigator.tsx`; no raw hex.
- **Deferred (not a task):** the abandoned-candidate sweep script (spec §8 — discards `ready` candidates older than ~7 days). Low priority: an uncommitted candidate is harmless (never shown in the grid). Add later as a cron/backfill mirroring `scripts/backfill_cutout_images.py` if candidate rows accumulate.
