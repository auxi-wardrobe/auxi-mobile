# Models Documentation - Wardrobe Backend

> **Last Updated**: February 15, 2026
> **Project**: Wardrobe Backend (Local-First MVP)
> **Python**: 3.9+ (Tested on 3.13)

---

## Table of Contents

1. [Overview](#overview)
2. [Database Models (ORM)](#database-models-orm)
   - [User](#user)
   - [RefreshToken](#refreshtoken)
   - [WardrobeItem](#wardrobeitem)
   - [Favorite](#favorite)
   - [Body](#body)
   - [TryOnImage](#tryonimage)
   - [RecommendationLog](#recommendationlog)
3. [ML/Processing Models](#mlprocessing-models)
   - [GarmentSegmenter](#garmentsegmenter)
   - [PoseDetector](#posedetector)
   - [GarmentWarper](#garmentwarper)
   - [GarmentCompositor](#garmentcompositor)
   - [ModelCache](#modelcache)
4. [Model Dependencies](#model-dependencies)
5. [Usage Examples](#usage-examples)

---

## Overview

The Wardrobe Backend uses two categories of models:

1. **Database Models (ORM)**: SQLAlchemy models for data persistence (users, wardrobe items, etc.)
2. **ML/Processing Models**: Computer vision and machine learning models for image processing (segmentation, pose detection, etc.)

### Architecture Pattern

```
Database Models (models/*.py)
    ↓
Repository Layer (repositories/*.py)
    ↓
Service Layer (services/*.py)
    ↓
Blueprint Layer (blueprints/*/routes.py)
```

ML models are accessed directly through service layers or utility functions.

---

## Database Models (ORM)

All database models use SQLAlchemy ORM and are located in `models/` directory. They inherit from `Base` (SQLAlchemy declarative base) and are integrated with FastAPI using dependency injection for database sessions.

### User

**File**: `models/user.py`
**Table**: `users`

**Purpose**: Stores user account information and authentication data.

#### Fields

| Field            | Type        | Constraints               | Description                                        |
| ---------------- | ----------- | ------------------------- | -------------------------------------------------- |
| `id`             | String(36)  | Primary Key               | UUID (auto-generated)                              |
| `email`          | String(255) | Unique, Not Null, Indexed | User email (login identifier)                      |
| `password_hash`  | String(255) | Not Null                  | Bcrypt hashed password                             |
| `role`           | String(50)  | Default: 'user'           | User role (user/admin)                             |
| `is_first_login` | Boolean     | Default: True             | Flag for first-time login                          |
| `gender`         | String(20)  | Nullable                  | User gender preference (MASCULINE/FEMININE/UNISEX) |
| `user_metadata`  | JSON        | Default: {}               | JSON storage for user preferences                  |
| `created_at`     | DateTime    | Auto UTC timestamp        | Account creation timestamp                         |
| `updated_at`     | DateTime    | Auto UTC timestamp        | Last update timestamp                              |

#### Relationships

- **`refresh_tokens`**: One-to-Many with `RefreshToken` (cascade delete)

#### Methods

```python
def to_dict(self) -> dict:
    """
    Serialize user to dictionary (excludes password_hash)

    Returns:
        {
            'id': str,
            'email': str,
            'role': str,
            'is_first_login': bool,
            'gender': str,
            'user_metadata': dict
        }
    """
```

#### Usage Example (FastAPI)

```python
from models.user import User
from sqlalchemy import select
from sqlalchemy.orm import Session

async def user_operations(db: Session):
    # Create user
    user = User(
        email='john@example.com',
        password_hash=bcrypt.hashpw('password123', bcrypt.gensalt()),
        role='user'
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Query user (SQLAlchemy 2.0 style)
    stmt = select(User).where(User.email == 'john@example.com')
    user = db.execute(stmt).scalars().first()
    print(user.to_dict())
```

**Note**: In FastAPI endpoints, use `db: Session = Depends(get_db)` to inject the database session.

---

### RefreshToken

**File**: `models/token.py`
**Table**: `refresh_tokens`

**Purpose**: Manages JWT refresh tokens for secure authentication and token rotation.

#### Fields

| Field             | Type        | Constraints                      | Description                          |
| ----------------- | ----------- | -------------------------------- | ------------------------------------ |
| `id`              | String(36)  | Primary Key                      | UUID (auto-generated)                |
| `user_id`         | String(36)  | Foreign Key (users.id), Not Null | Associated user                      |
| `jti`             | String(36)  | Unique, Not Null, Indexed        | JWT Token ID (for revocation)        |
| `token_hash`      | String(255) | Nullable                         | Optional opaque token hash           |
| `issued_at`       | DateTime    | Auto UTC timestamp               | Token issuance time                  |
| `expires_at`      | DateTime    | Not Null                         | Token expiration time                |
| `revoked_at`      | DateTime    | Nullable                         | Revocation timestamp (null = active) |
| `replaced_by_jti` | String(36)  | Nullable                         | JTI of replacement token (rotation)  |

#### Properties

```python
@property
def is_active(self) -> bool:
    """
    Check if token is currently active

    Returns:
        True if token is not revoked and not expired
    """
```

#### Usage Example (FastAPI)

```python
from models.token import RefreshToken
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

async def token_operations(db: Session, user_id: str):
    # Create refresh token
    token = RefreshToken(
        user_id=user_id,
        jti=str(uuid.uuid4()),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db.add(token)
    db.commit()
    db.refresh(token)

    # Check if active
    if token.is_active:
        print("Token is valid")

    # Revoke token
    token.revoked_at = datetime.now(timezone.utc)
    db.commit()
```

**FastAPI Integration**: Pass `db: Session = Depends(get_db)` to endpoints using this pattern.

---

### WardrobeItem

**File**: `models/wardrobe.py`
**Table**: `wardrobe_items`

**Purpose**: Single table for **both** system-wide baseline items ("Common Items") and user-personal wardrobe items. The `owner_id` column and `is_common_item` flag distinguish the two archetypes. Soft-delete (`is_deleted`) keeps rows in the table; queries filter them out at read time.

#### Item Archetypes

| Archetype                         | `owner_id`                  | `user_id` | `is_common_item` | Who creates it                    |
| --------------------------------- | --------------------------- | --------- | ---------------- | --------------------------------- |
| **Common Item** (system baseline) | `"SYSTEM"` (literal string) | `NULL`    | `True`           | Seeder (`common_items/seeder.py`) |
| **Personal Item** (user-owned)    | User UUID                   | User UUID | `False`          | Clone endpoint or direct upload   |

> `owner_id` has **no foreign-key constraint** — the literal string `"SYSTEM"` cannot satisfy an FK to `users.id`.

#### Fields — Base Columns

| Field        | Type        | Constraints                            | Description                                                      |
| ------------ | ----------- | -------------------------------------- | ---------------------------------------------------------------- |
| `id`         | String(36)  | Primary Key                            | UUID (auto-generated)                                            |
| `user_id`    | String(36)  | FK → `users.id`, **Nullable**, Indexed | `NULL` for Common Items; equals `owner_id` for personal items    |
| `category`   | String(50)  | Not Null                               | Garment category: `top`, `bottom`, `shoes`, `dress`, `outerwear` |
| `image_url`  | String(512) | Not Null                               | S3 URL or local path (empty string for seeded Common Items)      |
| `name`       | String(255) | Nullable                               | Human-readable name (e.g. "White T-Shirt")                       |
| `created_at` | DateTime    | Auto UTC                               | Row creation timestamp                                           |
| `updated_at` | DateTime    | Auto UTC                               | Last-update timestamp (auto-updates on save)                     |

#### Fields — Common Items Columns

Added by migration `f8a1b2c3d4e5`. These columns drive the ID naming convention and the structured metadata consumed by the decision engine.

| Field                 | Type       | Constraints                   | Description                                                                             |
| --------------------- | ---------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| `owner_id`            | String(36) | **Not Null**, Indexed         | `"SYSTEM"` for Common Items; user UUID for personal items                               |
| `human_readable_id`   | String(64) | **Unique**, Nullable, Indexed | Format: `{NS}_{LAYER}_{CODE}_{COLOR}_{FIT}_{IDX:02d}` — see ID Convention below         |
| `category_code`       | String(10) | Nullable                      | Short code: `UND`, `TEE`, `SHR`, `BLZ`, `JKT`, `JNS`, `CHI`, `PNT`, `SNK`, `BTS`, `LOF` |
| `layer_code`          | String(5)  | Nullable                      | Dressing-layer: `L1` (base), `L2` (mid), `L3` (outer), `BT` (bottom), `SH` (shoes)      |
| `styling_metadata`    | JSON       | Nullable                      | Scoring dict — see schema below                                                         |
| `physical_attributes` | JSON       | Nullable                      | Physical-trait dict — see schema below                                                  |
| `is_common_item`      | Boolean    | Default `False`, Indexed      | `True` → system baseline; immutable via public API                                      |
| `is_deleted`          | Boolean    | Default `False`, Indexed      | Soft-delete flag; row stays in DB                                                       |
| `gender_tags`         | JSON       | Nullable (will be non-null)   | Multi-dimensional style tags: `["M", "W", "U"]` — see Gender Tagging section below      |

##### Gender Tagging System

**Added**: February 16, 2026 (Migration `70f003cf4254`)

Multi-dimensional gender tagging based on **Style Archetypes** rather than biological gender. Items can have multiple tags to accurately represent their styling characteristics.

**Tags**:

- `"M"` (Menswear): Structured silhouettes, broad shoulders, angular cuts
- `"W"` (Womenswear): Curved silhouettes, decorative elements, fitted designs
- `"U"` (Unisex): Neutral styling, relaxed fit, minimal gender-coded elements

**Default Values by Category** (applied by seeder):

```python
{
    'DRS': ['W'],           # Dresses → Women only
    'JMP': ['W'],           # Jumpsuits → Women only
    'TEE': ['M', 'W', 'U'], # T-shirts → Universal
    'HDD': ['M', 'W', 'U'], # Hoodies → Universal
    'KNT': ['M', 'W', 'U'], # Knitwear → Universal
    'SNK': ['M', 'W', 'U'], # Sneakers → Universal
    'JNS': ['M', 'W', 'U'], # Jeans → Universal
    'PNT': ['M', 'W', 'U'], # Pants → Universal
    'BTS': ['M', 'W', 'U'], # Boots → Universal
    'BAG': ['M', 'W', 'U'], # Bags → Universal
    'SHR': ['M', 'U'],      # Shirts → Menswear + Unisex
    'CHI': ['M', 'U'],      # Chinos → Menswear + Unisex
    'JKT': ['M', 'U'],      # Jackets → Menswear + Unisex
    'BLZ': ['M'],           # Blazers → Menswear only
}
```

**Filtering Behavior** (Recommendation Engine):

- **MASCULINE users**: See items with `"M"` in tags (strict filtering)
- **FEMININE users**: See items with `"W"` in tags (strict filtering)
- **UNISEX/null preference**: See all items (no filtering)

**Scoring Priority** (for sorting):

1. **Exact match** (100 points): Item has user's preferred tag
2. **Unisex fallback** (80 points): Item has `"U"` but not preferred tag
3. **Cross-gender** (10 points): Item has opposite tag (low priority)

**Validation** (enforced by seeder):

- Must be an array
- Cannot be empty
- Only values: `"M"`, `"W"`, `"U"`

##### `styling_metadata` JSON Schema

```json
{
  "formality_score": 3, // 1-10  (1 = very casual, 10 = very formal)
  "warmth_level": 2, // 1-5   (1 = lightest, 5 = heaviest)
  "versatility_score": 10, // 1-10  (number of outfit contexts it fits)
  "visual_weight": 2, // 1-5   (visual prominence in an outfit)
  "climate_fit": "HOT" // "HOT" | "MILD" | "COOL"
}
```

##### `physical_attributes` JSON Schema

```json
{
  "color_code": "WHT", // WHT | BLK | NVY | GRY | BEG | TAN
  "fit_code": "REG", // SLM | REG | OVS | TLR
  "pattern_type": "SOLID", // SOLID | STRIPED | PLAID | …
  "is_tuckable": true, // boolean
  "is_water_resistant": false // boolean
}
```

##### ID Convention

`{NAMESPACE}_{LAYER}_{ITEM_CODE}_{COLOR}_{FIT}_{INDEX:02d}`

| Segment   | Allowed values                                                              | Example |
| --------- | --------------------------------------------------------------------------- | ------- |
| Namespace | `SYS` (seeded), `USR` (cloned to user)                                      | `SYS`   |
| Layer     | `L1`, `L2`, `L3`, `BT`, `SH`                                                | `L2`    |
| Item Code | `UND`, `TEE`, `SHR`, `BLZ`, `JKT`, `JNS`, `CHI`, `PNT`, `SNK`, `BTS`, `LOF` | `TEE`   |
| Color     | `WHT`, `BLK`, `NVY`, `GRY`, `BEG`, `TAN`                                    | `WHT`   |
| Fit       | `SLM`, `REG`, `OVS`, `TLR`                                                  | `REG`   |
| Index     | `01`, `02`, … (per-user, per unique attribute combo)                        | `01`    |

Full example: `SYS_L2_TEE_WHT_REG_01` — the first system White T-Shirt.
Generated by `common_items/id_generator.py → generate_human_readable_id()`.

##### `category_code` → `category` Mapping

Defined in `common_items/constants.py → CATEGORY_CODE_TO_CATEGORY`:

| category_code       | category    |
| ------------------- | ----------- |
| `UND`, `TEE`, `SHR` | `top`       |
| `BLZ`, `JKT`        | `outerwear` |
| `JNS`, `CHI`, `PNT` | `bottom`    |
| `SNK`, `BTS`, `LOF` | `shoes`     |

#### Fields — Gemini Metadata Columns

Populated when a garment image is analyzed by Google Gemini. All nullable; serialized in `to_dict()` only when the value is not `None`.

| Field                 | Type        | Description                                    |
| --------------------- | ----------- | ---------------------------------------------- |
| `description`         | Text        | Detailed free-text description                 |
| `colors`              | JSON        | `["light blue", "white"]`                      |
| `color_hex`           | JSON        | `["#7BA5D6", "#FFFFFF"]`                       |
| `dominant_color`      | String(50)  | Single dominant color name                     |
| `pattern`             | String(50)  | `"solid"`, `"striped"`, `"floral"`, …          |
| `fabric_type`         | String(50)  | `"denim"`, `"cotton"`, `"silk"`, …             |
| `fabric_texture`      | String(100) | Free-text texture note                         |
| `subcategory`         | String(50)  | `"shirt"`, `"blouse"`, `"jeans"`, …            |
| `formality_level`     | String(50)  | `"casual"`, `"business_casual"`, `"formal"`    |
| `style_tags`          | JSON        | `["classic", "versatile"]`                     |
| `occasion`            | JSON        | `["casual", "work"]`                           |
| `weather_suitability` | JSON        | `["warm", "mild"]`                             |
| `season`              | JSON        | `["spring", "summer"]`                         |
| `mood`                | JSON        | `["relaxed", "confident"]`                     |
| `works_well_with`     | JSON        | `["jeans", "chinos"]`                          |
| `layering_potential`  | JSON        | `["can_be_layered_over", "can_be_worn_alone"]` |
| `ai_confidence`       | JSON        | `{"category": 0.98, "colors": 0.95}`           |
| `user_edited`         | Boolean     | `True` after a manual metadata override        |
| `user_edits`          | JSON        | `{"fields_changed": ["name", "colors"]}`       |

#### Methods

```python
def to_dict(self) -> dict:
    """
    Serialize wardrobe item to dictionary.

    Base fields (always present in output):
        id, owner_id, user_id, category, image_url, name,
        human_readable_id, category_code, layer_code,
        styling_metadata, physical_attributes, gender_tags,
        is_common_item, is_deleted, created_at, updated_at

    Gemini metadata fields (included only when not None):
        description, colors, color_hex, dominant_color, pattern,
        fabric_type, fabric_texture, subcategory, formality_level,
        style_tags, occasion, weather_suitability, season, mood,
        works_well_with, layering_potential, ai_confidence,
        user_edited, user_edits
    """
```

#### Usage Examples (FastAPI)

```python
from models.wardrobe import WardrobeItem
from sqlalchemy import select
from sqlalchemy.orm import Session

async def wardrobe_operations(db: Session, user_id: str):
    # --- Create a personal item (direct upload) ---
    item = WardrobeItem(
        owner_id=user_id,          # REQUIRED – user UUID
        user_id=user_id,
        category='top',
        image_url='https://s3.amazonaws.com/bucket/shirt.jpg',
        name='Blue Denim Shirt'
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    # --- Clone a Common Item into a user's wardrobe (preferred path) ---
    from services.wardrobe_service import WardrobeService
    service = WardrobeService()
    cloned = service.clone_common_item(user_id=user_id, source_item_id=sys_item.id)
    # cloned["human_readable_id"] == "USR_L2_TEE_WHT_REG_01"
    # cloned["is_common_item"]     == False

    # --- Query a user's active tops (excludes soft-deleted rows) ---
    stmt = select(WardrobeItem).filter(
        WardrobeItem.owner_id == user_id,
        WardrobeItem.category == 'top',
        WardrobeItem.is_deleted == False
    ).order_by(WardrobeItem.created_at.desc())
    tops = db.execute(stmt).scalars().all()

    # --- List all system Common Items (public catalog) ---
    stmt = select(WardrobeItem).filter(
        WardrobeItem.is_common_item == True,
        WardrobeItem.is_deleted == False
    ).order_by(WardrobeItem.layer_code, WardrobeItem.category_code)
    common = db.execute(stmt).scalars().all()

    # --- Soft-delete a user's own item (with guard checks) ---
    deleted = service.soft_delete_item(item_id=item.id, requester_user_id=user_id)
    # Row still exists; deleted["is_deleted"] == True
```

**FastAPI Integration**: Use `db: Session = Depends(get_db)` to inject the database session into endpoints.

---

---

### Favorite

**File**: `models/favorite.py`
**Table**: `favorites`

**Purpose**: Stores user's favorite outfits, linking to multiple `WardrobeItem`s.

#### Fields

| Field                  | Type         | Constraints                               | Description                            |
| ---------------------- | ------------ | ----------------------------------------- | -------------------------------------- |
| `id`                   | String(36)   | Primary Key                               | UUID (auto-generated)                  |
| `user_id`              | String(36)   | Foreign Key (users.id), Not Null, Indexed | Owner of the favorite                  |
| `outfit_context`       | JSON         | Default: `{}`                             | Context data (occasion, weather, etc.) |
| `outfit_thumbnail_url` | String(1024) | Nullable                                  | URL to outfit thumbnail image          |
| `created_at`           | DateTime     | Auto UTC timestamp                        | Creation timestamp                     |
| `updated_at`           | DateTime     | Auto UTC timestamp                        | Last update timestamp                  |

#### Relationships

- **`items`**: Many-to-Many with `WardrobeItem` via `favorite_items` association table.

#### Methods

```python
def to_dict(self) -> dict:
    """
    Serialize favorite to dictionary

    Returns:
        {
            'id': str,
            'user_id': str,
            'outfit_items': [dict],  # List of wardrobe items
            'outfit_context': dict,
            'outfit_thumbnail_url': str,
            'created_at': str (ISO format),
            'updated_at': str (ISO format)
        }
    """
```

#### Usage Example

```python
from models.favorite import Favorite
from sqlalchemy.orm import Session

async def create_favorite(db: Session, user_id: str, shirt, pants):
    # Create favorite
    fav = Favorite(
        user_id=user_id,
        outfit_context={'occasion': 'work'},
        outfit_thumbnail_url='https://s3...'
    )
    fav.items.extend([shirt, pants])  # Add items
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav
```

---

### Body

**File**: `models/body.py`
**Table**: `bodies`

**Purpose**: Stores user's body/selfie images for virtual try-on.

#### Fields

| Field        | Type        | Constraints                               | Description                    |
| ------------ | ----------- | ----------------------------------------- | ------------------------------ |
| `id`         | String(36)  | Primary Key                               | UUID (auto-generated)          |
| `user_id`    | String(36)  | Foreign Key (users.id), Not Null, Indexed | Image owner                    |
| `image_url`  | String(512) | Not Null                                  | S3 URL or local path to selfie |
| `created_at` | DateTime    | Auto UTC timestamp                        | Upload timestamp               |

#### Methods

```python
def to_dict(self) -> dict:
    """
    Serialize body image to dictionary

    Returns:
        {
            'id': str,
            'user_id': str,
            'image_url': str,
            'created_at': str (ISO format)
        }
    """
```

#### Usage Example (FastAPI)

```python
from models.body import Body
from sqlalchemy import select
from sqlalchemy.orm import Session

async def body_operations(db: Session, user_id: str):
    # Store selfie
    body = Body(
        user_id=user_id,
        image_url='https://s3.amazonaws.com/bucket/selfie.jpg'
    )
    db.add(body)
    db.commit()
    db.refresh(body)

    # Get user's selfies
    stmt = select(Body).filter_by(user_id=user_id).order_by(Body.created_at.desc())
    selfies = db.execute(stmt).scalars().all()
    return selfies
```

---

### TryOnImage

**File**: `models/tryon.py`
**Table**: `tryon_images`

**Purpose**: Stores generated try-on composite images with processing metadata.

#### Fields

| Field                | Type        | Constraints                               | Description                         |
| -------------------- | ----------- | ----------------------------------------- | ----------------------------------- |
| `id`                 | String(36)  | Primary Key                               | UUID (auto-generated)               |
| `user_id`            | String(36)  | Foreign Key (users.id), Not Null, Indexed | Image owner                         |
| `job_id`             | String(50)  | Not Null, Indexed                         | Processing job identifier           |
| `image_url`          | String(512) | Not Null                                  | S3 URL or local path to result      |
| `processing_time_ms` | Integer     | Nullable                                  | Processing duration in milliseconds |
| `created_at`         | DateTime    | Auto UTC timestamp                        | Generation timestamp                |

#### Methods

```python
def to_dict(self) -> dict:
    """
    Serialize try-on image to dictionary

    Returns:
        {
            'id': str,
            'user_id': str,
            'job_id': str,
            'image_url': str,
            'processing_time_ms': int,
            'created_at': str (ISO format)
        }
    """
```

#### Usage Example (FastAPI)

```python
from models.tryon import TryOnImage
from sqlalchemy import select
from sqlalchemy.orm import Session

async def tryon_operations(db: Session, user_id: str):
    # Store try-on result
    tryon = TryOnImage(
        user_id=user_id,
        job_id='job_abc123',
        image_url='https://s3.amazonaws.com/bucket/tryon_result.jpg',
        processing_time_ms=2500
    )
    db.add(tryon)
    db.commit()
    db.refresh(tryon)

    # Query by job ID
    stmt = select(TryOnImage).where(TryOnImage.job_id == 'job_abc123')
    result = db.execute(stmt).scalars().first()
    return result
```

---

### RecommendationLog

**File**: `models/recommendation_log.py`
**Table**: `recommendation_logs`

**Purpose**: Tracks every recommendation API call (`/start` and `/next`) for analytics, user history, and debugging.

#### Fields

| Field                  | Type        | Constraints                               | Description                                   |
| ---------------------- | ----------- | ----------------------------------------- | --------------------------------------------- |
| `id`                   | String(36)  | Primary Key                               | UUID (auto-generated)                         |
| `user_id`              | String(36)  | Foreign Key (users.id), Not Null, Indexed | Log owner                                     |
| `session_id`           | String(36)  | Not Null, Indexed                         | Groups related requests (start + variations)  |
| `request_type`         | String(10)  | Not Null                                  | 'start' or 'next'                             |
| `weather_context`      | JSON        | Nullable                                  | {temp_c, lat, long}                           |
| `user_context`         | JSON        | Nullable                                  | {gender, occasion, custom_context}            |
| `previous_outfit_hash` | String(255) | Nullable                                  | Hash of previous outfit (for 'next' requests) |
| `variation_axis`       | String(20)  | Nullable                                  | SILHOUETTE, LAYERING, COLOR, NEW_ANCHOR       |
| `outfit_hash`          | String(255) | Not Null                                  | Generated outfit identifier                   |
| `outfit_items`         | JSON        | Not Null                                  | Array of wardrobe item IDs                    |
| `styling_note`         | Text        | Nullable                                  | AI-generated styling description              |
| `fallback_flags`       | JSON        | Nullable                                  | Array of fallback indicators                  |
| `processing_time_ms`   | Integer     | Nullable                                  | API processing duration in milliseconds       |
| `created_at`           | DateTime    | Not Null, Auto UTC timestamp              | Log creation timestamp                        |

#### Relationships

- **`user`**: Many-to-One with `User` (backref: `recommendation_logs`)

#### Methods

```python
def to_dict(self) -> dict:
    """
    Serialize recommendation log to dictionary

    Returns:
        {
            'id': str,
            'user_id': str,
            'session_id': str,
            'request_type': str,  # 'start' or 'next'
            'weather_context': dict,  # {temp_c, lat, long}
            'user_context': dict,  # {gender, occasion}
            'previous_outfit_hash': str,
            'outfit_hash': str,
            'outfit_items': [str],  # List of item IDs
            'styling_note': str,
            'variation_axis': str,  # SILHOUETTE|LAYERING|COLOR|NEW_ANCHOR
            'fallback_flags': [str],
            'processing_time_ms': int,
            'created_at': str (ISO format)
        }
    """
```

#### Usage Examples

```python
from models.recommendation_log import RecommendationLog
from repositories.recommendation_log_repository import RecommendationLogRepository

# Create repository instance
log_repo = RecommendationLogRepository()

# Log a recommendation start
log_data = {
    'user_id': user.id,
    'session_id': 'session_abc123',
    'request_type': 'start',
    'weather_context': {'temp_c': 22, 'lat': 37.7749, 'long': -122.4194},
    'user_context': {'gender': 'MASCULINE', 'occasion': 'work'},
    'outfit_hash': 'TEE_WHT_REG|JNS_NVY_SLM|SNK_WHT_low',
    'outfit_items': ['item_id_1', 'item_id_2', 'item_id_3'],
    'styling_note': 'A comfortable and professional look for work.',
    'fallback_flags': [],
    'processing_time_ms': 150
}
log = log_repo.create(log_data)

# Log a variation request
variation_log_data = {
    'user_id': user.id,
    'session_id': 'session_abc123',  # Same session
    'request_type': 'next',
    'weather_context': {'temp_c': 22, 'lat': 37.7749, 'long': -122.4194},
    'user_context': {'gender': 'MASCULINE', 'occasion': 'work'},
    'previous_outfit_hash': 'TEE_WHT_REG|JNS_NVY_SLM|SNK_WHT_low',
    'variation_axis': 'SILHOUETTE',
    'outfit_hash': 'TEE_WHT_OVS|JNS_NVY_SLM|SNK_WHT_low',
    'outfit_items': ['item_id_4', 'item_id_2', 'item_id_3'],
    'styling_note': 'Changed the silhouette for a more relaxed fit.',
    'processing_time_ms': 120
}
variation_log = log_repo.create(variation_log_data)

# Get all logs for a session
session_logs = log_repo.get_by_session('session_abc123')
for log in session_logs:
    print(f"{log.request_type}: {log.outfit_hash} ({log.processing_time_ms}ms)")

# Get user's recommendation history
history = log_repo.get_user_history(user.id, limit=20)
print(f"User has {len(history)} recommendation logs")

# Group by session for display
sessions = {}
for log in history:
    if log.session_id not in sessions:
        sessions[log.session_id] = []
    sessions[log.session_id].append(log)

print(f"User has {len(sessions)} recommendation sessions")
```

#### Use Cases

**1. User History View**

```python
# Display past recommendations to user
def get_user_recent_recommendations(user_id: str, limit: int = 5):
    logs = log_repo.get_user_history(user_id, limit=limit)

    # Group by session
    sessions = {}
    for log in logs:
        if log.session_id not in sessions:
            sessions[log.session_id] = {
                'started_at': log.created_at,
                'context': log.user_context,
                'outfits': []
            }
        sessions[log.session_id]['outfits'].append({
            'items': log.outfit_items,
            'note': log.styling_note
        })

    return list(sessions.values())
```

**2. Analytics Queries (FastAPI)**

```python
# Analytics queries using SQLAlchemy 2.0 syntax
from sqlalchemy import select, func, distinct
from sqlalchemy.orm import Session

async def analytics_queries(db: Session, user_id: str):
    # Count unique sessions per user
    stmt = select(func.count(distinct(RecommendationLog.session_id))).filter(
        RecommendationLog.user_id == user_id
    )
    session_count = db.execute(stmt).scalar()

    # Get average processing time
    stmt = select(func.avg(RecommendationLog.processing_time_ms)).filter(
        RecommendationLog.user_id == user_id
    )
    avg_time = db.execute(stmt).scalar()

    # Most common occasions
    stmt = select(
        func.json_extract(RecommendationLog.user_context, '$.occasion'),
        func.count('*')
    ).filter(
        RecommendationLog.user_id == user_id,
        RecommendationLog.request_type == 'start'
    ).group_by(
        func.json_extract(RecommendationLog.user_context, '$.occasion')
    ).order_by(func.count('*').desc()).limit(5)

    popular_occasions = db.execute(stmt).all()
```

**3. Debugging**

```python
# Reproduce a session
def replay_session(session_id: str):
    logs = log_repo.get_by_session(session_id)

    if not logs:
        return None

    first_log = logs[0]
    print(f"Session: {session_id}")
    print(f"Context: {first_log.weather_context}, {first_log.user_context}")

    for idx, log in enumerate(logs):
        print(f"\nRequest {idx + 1} ({log.request_type}):")
        print(f"  Outfit: {log.outfit_hash}")
        print(f"  Items: {log.outfit_items}")
        if log.variation_axis:
            print(f"  Variation: {log.variation_axis}")
        print(f"  Processing: {log.processing_time_ms}ms")
```

#### Repository Pattern

The `RecommendationLogRepository` provides clean data access:

```python
class RecommendationLogRepository:
    def create(self, log_data: dict) -> RecommendationLog
    def get_by_session(self, session_id: str) -> List[RecommendationLog]
    def get_user_history(self, user_id: str, limit: int) -> List[RecommendationLog]
    def get_by_id(self, log_id: str) -> Optional[RecommendationLog]
    def count_user_sessions(self, user_id: str) -> int
    def get_latest_session(self, user_id: str) -> Optional[str]
```

#### Migration

**Migration File**: `migrations/versions/d1e2f3a4b5c6_add_recommendation_logs.py`

Applied on: February 15, 2026

Creates:

- `recommendation_logs` table with all fields
- Index on `user_id` for fast user queries
- Index on `session_id` for session grouping

#### API Integration

Logs are created automatically by:

- `POST /api/v2/recommendation/start` - Logs initial outfit generation
- `POST /api/v2/recommendation/next` - Logs each variation request

Logs can be retrieved via:

- `GET /api/v2/recommendation/history` - Returns grouped session history

See `API_DOCUMENTATION.md` (line ~2586) for full API specification.

#### Performance Notes

- **Write Performance**: ~10-20ms per log (includes JSON serialization)
- **Query Performance**: Indexed queries are fast (<50ms for 100 logs)
- **Storage**: ~1KB per log on average
- **Retention**: Consider archiving logs older than 6 months

#### Best Practices

1. **Non-Blocking Logging**: Logging failures don't break API calls

   ```python
   try:
       log_repo.create(log_data)
   except Exception as e:
       logger.error(f"Failed to log: {e}")
       # Continue processing
   ```

2. **Session Grouping**: Always use consistent `session_id` for related requests

   ```python
   # Start: generate new session_id
   session_id = str(uuid.uuid4())

   # Next: reuse same session_id
   logs = log_repo.get_by_session(session_id)
   ```

3. **Context Preservation**: Copy context from first log for 'next' requests
   ```python
   first_log = log_repo.get_by_session(session_id)[0]
   new_log_data = {
       'weather_context': first_log.weather_context,
       'user_context': first_log.user_context,
       # ... other fields
   }
   ```

---

## ML/Processing Models

ML models handle computer vision tasks like segmentation, pose detection, warping, and compositing. They are lazily loaded and cached for performance.

### GarmentSegmenter

**File**: `models/segmentation.py`
**Purpose**: Background removal and garment segmentation using rembg/U2Net.

#### Architecture

Uses **rembg** library which internally uses **U2Net** (Universal U-shaped Network) for background removal.

#### Supported Models

- `u2net` - General purpose (default)
- `u2netp` - Lightweight version
- `u2net_cloth_seg` - Optimized for clothing

#### Key Methods

##### `__init__(model_name: str = 'u2net')`

Initialize segmenter with specified model.

##### `segment(image: Image.Image, return_mask_only: bool = False) -> Tuple[Optional[Image.Image], Optional[Image.Image]]`

Segment garment from image.

**Args**:

- `image`: Input PIL Image
- `return_mask_only`: If True, only return mask (faster)

**Returns**:

- `(segmented_image, mask)` tuple
  - `segmented_image`: RGBA image with transparent background
  - `mask`: Binary mask (grayscale L mode)

##### `segment_from_path(image_path: str, return_mask_only: bool = False) -> Tuple[Optional[Image.Image], Optional[Image.Image]]`

Convenience method to segment from file path.

##### `estimate_garment_type(mask: Image.Image) -> str`

Estimate garment type using shape heuristics.

**Returns**: `'top'`, `'bottom'`, `'dress'`, `'shoes'`, `'accessory'`, or `'unknown'`

**Heuristics**:

- Aspect ratio (height/width)
- Vertical position (top/middle/bottom of image)
- Fill ratio (percentage of bounding box filled)

##### `get_mask_stats(mask: Image.Image) -> dict`

Get statistics about the mask.

**Returns**:

```python
{
    'valid': bool,
    'width': int,
    'height': int,
    'total_pixels': int,
    'foreground_pixels': int,
    'background_pixels': int,
    'coverage_percent': float
}
```

#### Global Instance

```python
def get_segmenter(model_name: str = 'u2net') -> GarmentSegmenter:
    """Get or create global segmenter instance"""
```

#### Usage Example

```python
from models.segmentation import get_segmenter
from PIL import Image

# Get global segmenter
segmenter = get_segmenter(model_name='u2net_cloth_seg')

# Segment garment
image = Image.open('shirt.jpg')
segmented_img, mask = segmenter.segment(image)

# Estimate type
garment_type = segmenter.estimate_garment_type(mask)
print(f"Detected: {garment_type}")

# Get statistics
stats = segmenter.get_mask_stats(mask)
print(f"Coverage: {stats['coverage_percent']}%")

# Save results
segmented_img.save('shirt_no_bg.png')
mask.save('shirt_mask.png')
```

#### Dependencies

- `rembg` - Background removal library
- `PIL` (Pillow) - Image processing
- `numpy` - Numerical operations

---

### PoseDetector

**File**: `models/pose_detection.py`
**Purpose**: Detect body keypoints in selfie images using MediaPipe Pose.

#### Architecture

Uses **MediaPipe Pose** for 33-point body landmark detection with visibility scores.

#### Landmarks

33 body landmarks including:

- Face: nose, eyes, ears, mouth
- Upper body: shoulders, elbows, wrists, hands
- Lower body: hips, knees, ankles, feet

See `LANDMARKS` class attribute for full mapping.

#### Key Methods

##### `__init__(min_detection_confidence: float = 0.5, min_tracking_confidence: float = 0.5)`

Initialize pose detector with confidence thresholds.

##### `detect_pose(image: Image.Image) -> Optional[Dict]`

Detect pose in image.

**Returns**:

```python
{
    'landmarks': [
        {'x': float, 'y': float, 'z': float, 'visibility': float},
        # ... 33 landmarks
    ],
    'world_landmarks': [
        {'x': float, 'y': float, 'z': float},  # 3D coords in meters
        # ... 33 landmarks
    ],
    'image_width': int,
    'image_height': int
}
```

Coordinates:

- `x, y`: Normalized [0, 1]
- `z`: Depth relative to hip
- `visibility`: Confidence score [0, 1]

##### `get_keypoints(pose_data: Dict, keypoint_names: List[str]) -> Dict[str, Tuple[int, int]]`

Convert normalized coordinates to pixel coordinates for specific keypoints.

**Args**:

- `pose_data`: Result from `detect_pose()`
- `keypoint_names`: List of landmark names (e.g., `['left_shoulder', 'right_shoulder']`)

**Returns**: Dict mapping names to `(x, y)` pixel coordinates

##### `get_body_box(pose_data: Dict, garment_type: str) -> Optional[Dict]`

Get bounding box for garment placement.

**Args**:

- `garment_type`: `'top'`, `'bottom'`, `'dress'`, `'shoes'`, `'accessory'`

**Returns**:

```python
{
    'x': int, 'y': int,  # Top-left corner
    'width': int, 'height': int,
    'center_x': int, 'center_y': int,
    'keypoints': Dict[str, Tuple[int, int]]
}
```

**Keypoint Mapping**:

- `top`: shoulders + hips
- `bottom`: hips + knees + ankles
- `dress`: shoulders + ankles
- `shoes`: ankles + heels + foot indices

##### `validate_pose_for_garment(pose_data: Dict, garment_type: str) -> Tuple[bool, str]`

Validate if pose is suitable for garment type.

**Returns**: `(is_valid, reason)` tuple

Checks:

- Required keypoints are detected
- Visibility scores above threshold (0.5)
- Keypoints appropriate for garment type

##### `get_pose_angle(pose_data: Dict) -> float`

Estimate body rotation angle from frontal view.

**Returns**: Angle in degrees (-90 to 90, 0 = frontal)

#### Global Instance

```python
def get_pose_detector(
    min_detection_confidence: float = 0.5,
    min_tracking_confidence: float = 0.5
) -> PoseDetector:
    """Get or create global pose detector instance"""
```

#### Usage Example

```python
from models.pose_detection import get_pose_detector
from PIL import Image

# Get detector
detector = get_pose_detector(min_detection_confidence=0.6)

# Detect pose
selfie = Image.open('selfie.jpg')
pose_data = detector.detect_pose(selfie)

if pose_data:
    # Get specific keypoints
    keypoints = detector.get_keypoints(pose_data, [
        'left_shoulder', 'right_shoulder',
        'left_hip', 'right_hip'
    ])

    # Get body box for garment
    body_box = detector.get_body_box(pose_data, garment_type='top')
    print(f"Place garment at: ({body_box['x']}, {body_box['y']})")
    print(f"Size: {body_box['width']}x{body_box['height']}")

    # Validate pose
    is_valid, reason = detector.validate_pose_for_garment(pose_data, 'top')
    if not is_valid:
        print(f"Pose issue: {reason}")

    # Check rotation
    angle = detector.get_pose_angle(pose_data)
    if angle > 45:
        print("Warning: Body is too turned away")
```

#### Dependencies

- `mediapipe` - Pose detection library
- `PIL` (Pillow) - Image processing
- `numpy` - Numerical operations

---

### GarmentWarper

**File**: `models/warping.py`
**Purpose**: Transform garment images to match body pose using affine/perspective transforms.

#### Architecture

Uses **OpenCV** (cv2) for geometric transformations.

#### Key Methods

##### `__init__()`

Initialize warper (checks for OpenCV availability).

##### `calculate_transform(garment_box: Dict, body_box: Dict, transform_type: str = 'affine') -> Optional[np.ndarray]`

Calculate transformation matrix to fit garment to body.

**Args**:

- `garment_box`: Source dimensions
  ```python
  {
      'width': int,
      'height': int,
      'center_x': int (optional),
      'center_y': int (optional)
  }
  ```
- `body_box`: Target dimensions
  ```python
  {
      'x': int, 'y': int,
      'width': int, 'height': int,
      'center_x': int, 'center_y': int
  }
  ```
- `transform_type`: `'affine'` or `'perspective'`

**Returns**:

- 2x3 matrix for affine transform
- 3x3 matrix for perspective transform

**Algorithm**:

- Calculates scale factors (preserves aspect ratio)
- Centers garment on body box
- Aligns to top of body box

##### `warp_garment(garment_image: Image.Image, garment_mask: Optional[Image.Image], transform_matrix: np.ndarray, output_size: Tuple[int, int], transform_type: str = 'affine') -> Tuple[Optional[Image.Image], Optional[Image.Image]]`

Apply transformation to garment image and mask.

**Args**:

- `garment_image`: PIL Image of garment
- `garment_mask`: PIL Image of mask (can be None)
- `transform_matrix`: From `calculate_transform()`
- `output_size`: `(width, height)` of output
- `transform_type`: `'affine'` or `'perspective'`

**Returns**: `(warped_image, warped_mask)` tuple of PIL Images

**Features**:

- Uses bilinear interpolation (`INTER_LINEAR`)
- Transparent border for RGBA images
- Separate mask warping

##### `warp_to_pose(garment_image: Image.Image, garment_mask: Optional[Image.Image], body_box: Dict, output_size: Optional[Tuple[int, int]] = None) -> Tuple[Optional[Image.Image], Optional[Image.Image]]`

Convenience method combining calculation and warping.

**Args**:

- `garment_image`: Source garment
- `garment_mask`: Source mask
- `body_box`: Target body box (from PoseDetector)
- `output_size`: Output dimensions (defaults to body_box image size)

**Returns**: `(warped_image, warped_mask)` tuple

#### Global Instance

```python
def get_warper() -> GarmentWarper:
    """Get or create global warper instance"""
```

#### Usage Example

```python
from models.warping import get_warper
from models.pose_detection import get_pose_detector
from PIL import Image

# Get instances
warper = get_warper()
detector = get_pose_detector()

# Load images
selfie = Image.open('selfie.jpg')
garment = Image.open('shirt.png')
mask = Image.open('shirt_mask.png')

# Detect pose and get body box
pose_data = detector.detect_pose(selfie)
body_box = detector.get_body_box(pose_data, garment_type='top')

# Warp garment to body
warped_garment, warped_mask = warper.warp_to_pose(
    garment,
    mask,
    body_box,
    output_size=(selfie.width, selfie.height)
)

# Save result
warped_garment.save('shirt_warped.png')
```

#### Advanced Usage

```python
# Manual transform calculation
garment_box = {
    'width': garment.width,
    'height': garment.height,
    'center_x': garment.width // 2,
    'center_y': garment.height // 2
}

# Calculate affine transform
matrix = warper.calculate_transform(
    garment_box,
    body_box,
    transform_type='affine'
)

# Apply warp
warped_img, warped_mask = warper.warp_garment(
    garment,
    mask,
    matrix,
    (selfie.width, selfie.height),
    transform_type='affine'
)
```

#### Dependencies

- `opencv-python` (cv2) - Image transformations
- `PIL` (Pillow) - Image I/O
- `numpy` - Array operations

---

### GarmentCompositor

**File**: `models/compositor.py`
**Purpose**: Blend warped garment images onto selfie photos with color/lighting adjustments.

#### Architecture

Uses **Pillow** for alpha blending and **OpenCV** for histogram matching.

#### Key Methods

##### `__init__()`

Initialize compositor (checks for OpenCV availability).

##### `feather_mask(mask: Image.Image, feather_amount: int = 5) -> Image.Image`

Apply Gaussian blur to mask edges for smooth blending.

**Args**:

- `mask`: Binary mask (L mode)
- `feather_amount`: Blur radius in pixels

**Returns**: Feathered mask

##### `alpha_blend(foreground: Image.Image, background: Image.Image, mask: Optional[Image.Image] = None, feather: bool = True) -> Optional[Image.Image]`

Alpha blend foreground onto background.

**Args**:

- `foreground`: Foreground image (RGBA or RGB)
- `background`: Background image (RGB)
- `mask`: Optional mask (L mode), overrides foreground alpha
- `feather`: Whether to feather mask edges

**Returns**: Blended image (RGB)

**Algorithm**:

```
result = foreground * alpha + background * (1 - alpha)
```

**Features**:

- Auto-resizes foreground to match background
- Supports custom mask or RGBA alpha channel
- Optional edge feathering
- Handles missing alpha (creates full opacity)

##### `match_lighting(source: Image.Image, target: Image.Image, mask: Optional[Image.Image] = None) -> Optional[Image.Image]`

Match lighting/color of source to target using histogram matching.

**Args**:

- `source`: Image to adjust (garment)
- `target`: Reference image (selfie)
- `mask`: Optional mask for region of interest

**Returns**: Adjusted source image

**Algorithm**:

- Calculates cumulative distribution functions (CDFs) for each RGB channel
- Creates lookup table mapping source intensities to target intensities
- Applies per-channel histogram matching

##### `composite_garment(selfie: Image.Image, garment: Image.Image, mask: Optional[Image.Image] = None, match_color: bool = False, feather: bool = True) -> Optional[Image.Image]`

Composite garment onto selfie with all enhancements.

**Args**:

- `selfie`: Background selfie image (RGB)
- `garment`: Foreground garment image (RGBA or RGB)
- `mask`: Optional mask (L mode)
- `match_color`: Whether to match garment color to selfie lighting
- `feather`: Whether to feather edges

**Returns**: Composite image (RGB)

**Pipeline**:

1. Optional: Histogram match garment to selfie lighting
2. Alpha blend with optional feathering

#### Global Instance

```python
def get_compositor() -> GarmentCompositor:
    """Get or create global compositor instance"""
```

#### Usage Example

```python
from models.compositor import get_compositor
from PIL import Image

# Get compositor
compositor = get_compositor()

# Load images
selfie = Image.open('selfie.jpg')
warped_garment = Image.open('shirt_warped.png')
warped_mask = Image.open('shirt_warped_mask.png')

# Simple alpha blend
result = compositor.alpha_blend(
    warped_garment,
    selfie,
    mask=warped_mask,
    feather=True
)

# With lighting match
result = compositor.composite_garment(
    selfie,
    warped_garment,
    mask=warped_mask,
    match_color=True,
    feather=True
)

result.save('tryon_result.jpg')
```

#### Advanced Usage

```python
# Manual feathering
feathered_mask = compositor.feather_mask(mask, feather_amount=10)

# Lighting match only
adjusted_garment = compositor.match_lighting(
    source=garment,
    target=selfie,
    mask=garment_mask
)

# Custom blending
result = compositor.alpha_blend(
    adjusted_garment,
    selfie,
    mask=feathered_mask,
    feather=False  # Already feathered
)
```

#### Dependencies

- `PIL` (Pillow) - Image processing, blending
- `opencv-python` (cv2) - Histogram matching (optional)
- `numpy` - Array operations

---

### ModelCache

**File**: `models/loader.py`
**Purpose**: Thread-safe lazy loading and caching of ML models.

#### Architecture

Singleton pattern with thread-safe model storage for performance optimization.

#### Key Methods

##### `__init__(cache_dir: str = 'models/weights')`

Initialize model cache.

**Args**:

- `cache_dir`: Directory to store downloaded models

##### `get_model(model_key: str, loader_fn: callable, force_reload: bool = False) -> Optional[Any]`

Get model from cache or load it.

**Args**:

- `model_key`: Unique identifier for the model
- `loader_fn`: Function to load the model if not cached
- `force_reload`: Force reload even if cached

**Returns**: Loaded model or None

**Features**:

- Thread-safe with locking
- Tracks load times
- Lazy loading (only loads when first requested)
- Singleton pattern

##### `is_cached(model_key: str) -> bool`

Check if model is in cache.

##### `clear_model(model_key: str) -> bool`

Remove specific model from cache.

##### `clear_all()`

Clear all models from cache (frees memory).

##### `get_stats() -> dict`

Get cache statistics.

**Returns**:

```python
{
    'cached_models': int,
    'model_keys': List[str],
    'load_times': Dict[str, float],
    'cache_dir': str
}
```

#### Global Instance

```python
def get_model_cache(cache_dir: str = 'models/weights') -> ModelCache:
    """Get or create global model cache"""
```

#### Helper Functions

```python
def download_model(model_name: str, cache_dir: str = 'models/weights') -> bool:
    """
    Pre-download model weights

    Note: rembg automatically downloads models on first use,
    so this is mainly for manual pre-download
    """
```

#### Usage Example

```python
from models.loader import get_model_cache, ModelCache

# Get global cache
cache = get_model_cache(cache_dir='models/weights')

# Define model loader
def load_my_model():
    # Expensive model loading
    import some_ml_library
    model = some_ml_library.load_model('model.pkl')
    return model

# Get model (loads on first call, cached thereafter)
model = cache.get_model('my_model_v1', load_my_model)

# Check cache status
stats = cache.get_stats()
print(f"Cached models: {stats['cached_models']}")
print(f"Load times: {stats['load_times']}")

# Force reload
model = cache.get_model('my_model_v1', load_my_model, force_reload=True)

# Clear specific model
cache.clear_model('my_model_v1')

# Clear all (free memory)
cache.clear_all()
```

#### Integration Example

```python
from models.loader import get_model_cache
from models.segmentation import GarmentSegmenter

cache = get_model_cache()

def load_segmenter():
    return GarmentSegmenter(model_name='u2net_cloth_seg')

# First call: loads and caches
segmenter = cache.get_model('segmenter', load_segmenter)

# Subsequent calls: returns cached instance
segmenter = cache.get_model('segmenter', load_segmenter)
```

#### Thread Safety

```python
import threading

def worker():
    cache = get_model_cache()
    model = cache.get_model('shared_model', load_fn)
    # Use model safely

# Multiple threads can safely access cache
threads = [threading.Thread(target=worker) for _ in range(10)]
for t in threads:
    t.start()
for t in threads:
    t.join()
```

#### Dependencies

- `threading` - Thread safety (stdlib)
- `pathlib` - Path handling (stdlib)

---

## Model Dependencies

### Database Models

All database models require:

```bash
pip install sqlalchemy
```

**Required Packages**:

- `sqlalchemy>=2.0.0` - ORM and database toolkit (used with FastAPI dependency injection)
- `fastapi` - Web framework for async request handling
- Additional: See `requirements.txt` for complete FastAPI dependencies

### ML/Processing Models

#### Core Requirements

```bash
pip install pillow numpy
```

#### Optional Dependencies (Phase 2+)

```bash
# For segmentation
pip install rembg

# For pose detection
pip install mediapipe

# For warping and compositing
pip install opencv-python
```

**Package Overview**:

| Package         | Purpose                        | Used By                          | Phase |
| --------------- | ------------------------------ | -------------------------------- | ----- |
| `pillow`        | Image I/O and basic operations | All ML models                    | 1     |
| `numpy`         | Numerical operations           | All ML models                    | 1     |
| `rembg`         | Background removal (U2Net)     | GarmentSegmenter                 | 2     |
| `mediapipe`     | Pose detection                 | PoseDetector                     | 2     |
| `opencv-python` | Transforms, histogram matching | GarmentWarper, GarmentCompositor | 2     |

#### Graceful Degradation

All ML models check for dependency availability:

```python
# Example from segmentation.py
try:
    from rembg import remove
    HAS_REMBG = True
except ImportError:
    HAS_REMBG = False
    logger.warning("rembg not available")

class GarmentSegmenter:
    def __init__(self):
        self.is_available = HAS_REMBG
```

Models will log warnings if dependencies are missing but won't crash the application.

---

## Usage Examples

### Complete Virtual Try-On Pipeline

```python
from PIL import Image
from models.segmentation import get_segmenter
from models.pose_detection import get_pose_detector
from models.warping import get_warper
from models.compositor import get_compositor

# Initialize models
segmenter = get_segmenter('u2net_cloth_seg')
detector = get_pose_detector()
warper = get_warper()
compositor = get_compositor()

# Load images
selfie = Image.open('user_selfie.jpg')
garment_raw = Image.open('shirt.jpg')

# Step 1: Segment garment
garment_img, garment_mask = segmenter.segment(garment_raw)
garment_type = segmenter.estimate_garment_type(garment_mask)
print(f"Detected garment: {garment_type}")

# Step 2: Detect pose and validate
pose_data = detector.detect_pose(selfie)
is_valid, reason = detector.validate_pose_for_garment(pose_data, garment_type)
if not is_valid:
    print(f"Pose validation failed: {reason}")
    exit(1)

# Step 3: Get body box
body_box = detector.get_body_box(pose_data, garment_type)

# Step 4: Warp garment to body
warped_garment, warped_mask = warper.warp_to_pose(
    garment_img,
    garment_mask,
    body_box,
    output_size=(selfie.width, selfie.height)
)

# Step 5: Composite with lighting match
result = compositor.composite_garment(
    selfie,
    warped_garment,
    mask=warped_mask,
    match_color=True,
    feather=True
)

# Save result
result.save('tryon_result.jpg')
print("Try-on complete!")
```

### Database Query Examples

```python
from models.user import User
from models.wardrobe import WardrobeItem
from models.body import Body
from models.tryon import TryOnImage
from extensions import db

# Get user with wardrobe items
user = User.query.filter_by(email='john@example.com').first()
items = WardrobeItem.query.filter_by(user_id=user.id).all()

# Get user's tops and bottoms
tops = WardrobeItem.query.filter_by(user_id=user.id, category='top').all()
bottoms = WardrobeItem.query.filter_by(user_id=user.id, category='bottom').all()

# Get user's most recent selfie
latest_selfie = Body.query.filter_by(user_id=user.id)\
    .order_by(Body.created_at.desc())\
    .first()

# Get try-on images from last 7 days
from datetime import datetime, timedelta
week_ago = datetime.now() - timedelta(days=7)
recent_tryons = TryOnImage.query.filter(
    TryOnImage.user_id == user.id,
    TryOnImage.created_at >= week_ago
).all()

# Count items by category (FastAPI/SQLAlchemy 2.0)
from sqlalchemy import func, select
from sqlalchemy.orm import Session

async def count_by_category(db: Session, user_id: str):
    stmt = select(
        WardrobeItem.category,
        func.count(WardrobeItem.id)
    ).where(WardrobeItem.user_id == user_id).group_by(WardrobeItem.category)

    category_counts = db.execute(stmt).all()
    print(category_counts)
    # [('top', 15), ('bottom', 8), ('shoes', 5), ...]
    return category_counts
```

### Model Caching Example

```python
from models.loader import get_model_cache
from models.segmentation import get_segmenter
from models.pose_detection import get_pose_detector

# Get cache
cache = get_model_cache()

# Load models through cache
def load_seg():
    return get_segmenter('u2net_cloth_seg')

def load_pose():
    return get_pose_detector(min_detection_confidence=0.6)

# First load (expensive)
segmenter = cache.get_model('segmenter_cloth', load_seg)
pose_detector = cache.get_model('pose_detector', load_pose)

# Check stats
stats = cache.get_stats()
print(f"Models loaded: {stats['model_keys']}")
print(f"Load times: {stats['load_times']}")

# Clear cache when done
cache.clear_all()
```

---

## Best Practices

### Database Models

1. **Always use transactions (FastAPI)**:

   ```python
   from sqlalchemy.orm import Session
   from fastapi import Depends

   async def create_item(item: ItemSchema, db: Session = Depends(get_db)):
       try:
           db.add(item)
           db.commit()
           db.refresh(item)
       except Exception as e:
           db.rollback()
           raise
   ```

   Or use SQLAlchemy context managers:

   ```python
   from sqlalchemy import create_engine
   from sqlalchemy.orm import Session

   with Session(engine) as session:
       db.add(item)
       session.commit()
       db.refresh(item)
   ```

2. **Use indexes for frequently queried fields**:

   - `user_id` columns are indexed for fast lookups
   - `email` is indexed for authentication

3. **Cascade deletes**:
   - Deleting a User automatically deletes associated RefreshTokens
   - Foreign key constraints maintain referential integrity

### ML Models

1. **Use global instances**:

   ```python
   # Good: Reuses model
   segmenter = get_segmenter()

   # Bad: Creates new instance each time
   segmenter = GarmentSegmenter()
   ```

2. **Check availability before use**:

   ```python
   if not segmenter.is_available:
       return error_response("Segmentation unavailable")
   ```

3. **Handle errors gracefully**:

   ```python
   result = segmenter.segment(image)
   if result is None:
       logger.error("Segmentation failed")
       return fallback_result
   ```

4. **Use model cache for expensive models**:

   ```python
   cache = get_model_cache()
   model = cache.get_model('key', load_fn)
   ```

5. **Clean up temporary files**:

   ```python
   from utils.file_utils import EphemeralFileManager

   with EphemeralFileManager() as fm:
       temp_path = fm.save_temp_file(image_bytes, 'jpg')
       # Process file
       # Automatically deleted on exit
   ```

---

## Performance Considerations

### Database

- **Connection Pooling**: SQLAlchemy handles connection pooling automatically in FastAPI
- **Lazy Loading**: Use `selectinload()` or `joinedload()` from `sqlalchemy.orm` for large collections
- **Eager Loading**: Use `joinedload()` or `contains_eager()` to avoid N+1 queries

**FastAPI Best Practices**:

- Use `Session` dependency injection: `db: Session = Depends(get_db)`
- Always call `db.refresh(obj)` after `db.commit()` to refresh relationship data
- Use SQLAlchemy 2.0 `select()` statements instead of `.query()` chains

### ML Models

- **Model Loading**: 1-5 seconds per model (first load)
- **Segmentation**: 0.5-2 seconds per image (depends on size)
- **Pose Detection**: 0.1-0.5 seconds per image
- **Warping**: 0.05-0.1 seconds per image
- **Compositing**: 0.05-0.1 seconds per image

**Total pipeline**: ~2-4 seconds for complete try-on

### Optimization Tips

1. **Resize large images before processing**:

   ```python
   MAX_SIZE = 1024
   if image.width > MAX_SIZE or image.height > MAX_SIZE:
       image.thumbnail((MAX_SIZE, MAX_SIZE), Image.Resampling.LANCZOS)
   ```

2. **Use lower resolution for previews**:

   ```python
   # Fast preview
   preview = image.resize((512, 512))
   result = process_image(preview)
   ```

3. **Cache segmentation masks**:

   - Segment once, reuse mask for multiple try-ons
   - Store masks in database or S3

4. **Batch processing**:
   - Process multiple images in parallel (use threading/multiprocessing)
   - Cache models globally to avoid reloading

---

## Troubleshooting

### Common Issues

#### "ModuleNotFoundError: No module named 'rembg'"

**Solution**: Install Phase 2 dependencies:

```bash
pip install rembg mediapipe opencv-python
```

#### "Segmentation unavailable"

**Cause**: rembg not installed or failed to initialize
**Solution**:

```bash
pip install rembg
# If still failing, try:
pip uninstall rembg && pip install --no-cache-dir rembg
```

#### "Pose detection failed"

**Causes**:

- Person not in frame or too small
- Image too dark or blurry
- Extreme angles or poses

**Solution**: Validate input before processing

```python
pose_data = detector.detect_pose(image)
if not pose_data:
    return error("No person detected in image")

is_valid, reason = detector.validate_pose_for_garment(pose_data, 'top')
if not is_valid:
    return error(f"Pose unsuitable: {reason}")
```

#### "Database integrity error"

**Cause**: Violating unique constraint or foreign key
**Solution**:

```python
# Check before insert
existing = User.query.filter_by(email=email).first()
if existing:
    return error("Email already exists")

# Or handle exception (FastAPI)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

try:
    db.add(user)
    db.commit()
    db.refresh(user)
except IntegrityError:
    db.rollback()
    raise HTTPException(status_code=409, detail="User already exists")
```

---

## Migration Notes

### Adding New Models (FastAPI)

1. **Create model file**: `models/new_model.py`
2. **Define SQLAlchemy model** (SQLAlchemy 2.0 style):

   ```python
   from sqlalchemy import Column, String, Integer, DateTime
   from sqlalchemy.orm import declarative_base
   from datetime import datetime
   import uuid

   Base = declarative_base()

   class NewModel(Base):
       __tablename__ = 'new_models'
       id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
       created_at = Column(DateTime, default=datetime.utcnow)
       # ... additional fields
   ```

3. **Add to `models/__init__.py`**:

   ```python
   from .new_model import NewModel
   ```

4. **Create migration** (using Alembic):
   ```bash
   alembic revision --autogenerate -m "Add NewModel"
   alembic upgrade head
   ```

**FastAPI Integration**: Pass `db: Session = Depends(get_db)` to endpoints using the new model.

### Model Versioning

For ML models:

1. Version models in cache keys: `'segmenter_v2'`
2. Support multiple versions simultaneously
3. Gradual rollout with feature flags

---

## References

### External Documentation

- **SQLAlchemy**: https://docs.sqlalchemy.org/
- **FastAPI**: https://fastapi.tiangolo.com/
- **rembg**: https://github.com/danielgatis/rembg
- **MediaPipe Pose**: https://google.github.io/mediapipe/solutions/pose
- **OpenCV**: https://docs.opencv.org/
- **Pillow**: https://pillow.readthedocs.io/

### Related Project Files

- `API_DOCUMENTATION.md` - API endpoint documentation
- `CLAUDE.md` - Developer cheatsheet
- `TRYON_BY_IDS_IMPLEMENTATION.md` - Try-on feature spec
- `requirements.txt` - Full dependencies
- `requirements-minimal.txt` - Phase 1 dependencies

---

**End of Models Documentation**
