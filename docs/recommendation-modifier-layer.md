# Recommendation Architecture — Score Modifier Layer (ADR / Source of Truth)

> **Status:** Accepted — architecture locked, implementation not started.
> **Scope:** Defines the layered recommendation architecture and the Score
> Modifier Layer. This is the single source of truth for how behavioral
> personalization plugs into the engine. Supersedes ad-hoc discussion in
> chat/PR threads.
> **Audience:** Backend ("Valen"/V05) engineers, mobile engineers, product.
> **Non-goal:** This document does not introduce new backend logic. No feature
> here is built until this architecture is agreed.

---

## 0. Guiding principles

Auxi is a **Decision Reduction Engine**, not an AI stylist. Recommendation
quality must come from:

- strong garment compatibility,
- user behavior,
- wardrobe utilization,
- explainable ranking,

— **not** from increasingly complex fashion rules or opaque AI models.

Every part of the system below must remain:

- **Deterministic** — same inputs produce the same outputs (and the same
  explanation).
- **Explainable** — every influence on a recommendation can be named in plain
  language.
- **Maintainable** — new behavioral signals are added in one place, not as new
  feature silos.
- **Bounded** — behavior reranks good outfits; it never rescues a bad one.

### 0.1 Recommendation principles

The product philosophy that future decisions must stay aligned with. When a new
feature is proposed, it should be checkable against these:

1. **Outfit correctness always comes before personalization.** A correct,
   compatible outfit with no personalization beats a personalized but
   incompatible one, every time.
2. **User behavior adjusts ranking, not compatibility.** Behavior changes *which
   valid outfit surfaces first* — never what counts as valid.
3. **Personalization should feel gradual, not unpredictable.** Signals decay and
   blend; the feed should drift, not lurch. No single action should swing the
   recommendation violently.
4. **The system should get smarter over time without getting less explainable.**
   Every added signal must be nameable (a reason token) and bounded. Smarter is
   never an excuse for opaque.
5. **One extension point.** New behavioral intelligence is added as a modifier in
   the Personalization Layer — never by editing the Core engine.

---

## 1. Overall recommendation architecture

The system is separated into **three layers** with a strict, one-directional
dependency: Presentation depends on Personalization depends on Core. Lower
layers never read from higher layers.

```
┌─────────────────────────────────────────────────────────────┐
│ 3. PRESENTATION LAYER                                         │
│    Accessories (completion) · Reason Tokens · Explanations    │
│    · UI presentation                                          │
└───────────────▲─────────────────────────────────────────────┘
                │ reads outfit + reason tokens (never writes score)
┌───────────────┴─────────────────────────────────────────────┐
│ 2. PERSONALIZATION LAYER  (Score Modifier Layer)             │
│    Final = Base Score + clamp(Σ bounded modifiers)           │
│    Recent User Action Boost · Cooldown · Rotation · Freshness │
└───────────────▲─────────────────────────────────────────────┘
                │ reranks candidates produced below (never edits them)
┌───────────────┴─────────────────────────────────────────────┐
│ 1. CORE RECOMMENDATION ENGINE  (deterministic, behavior-free)│
│    Safety Funnel → Candidate Generation → Anchor Selection   │
│    → Compatibility Matching → Base Outfit Scoring             │
└──────────────────────────────────────────────────────────────┘
```

### 1.0 Responsibilities at a glance

Recommendation is **three distinct responsibilities**. This separation is
deliberate and strict so that a future contributor can immediately tell *where a
new feature belongs* — and, just as importantly, where it does **not**.

| Layer | Does | Must never |
|-------|------|------------|
| **Core Recommendation Engine** | Builds the best outfit based on compatibility. Deterministic. No user behavior. | Read behavior, boosts, or history. Produce different output for the same inputs. |
| **Personalization Layer** | Re-ranks already-valid outfits using behavioral signals. | Generate outfits. Change compatibility rules. Make an invalid outfit valid. |
| **Presentation Layer** | Accessories, reason tokens, UI explanations. Presentation only. | Influence outfit construction, compatibility, or scoring. |

If a proposed feature *builds or repairs an outfit*, it belongs in Core. If it
*changes the order of valid outfits based on the user*, it belongs in
Personalization. If it *only affects what the user sees about an already-final
outfit*, it belongs in Presentation. There is no fourth place.

### 1.1 Core Recommendation Engine

Responsible for:

- **Safety Funnel** — weather filtering, gender/expression filtering, category
  composition rules.
- **Candidate Generation** — eligible item pools per slot.
- **Anchor Selection** — bottom-first anchor.
- **Compatibility Matching** — color harmony, silhouette balance, formality
  consistency.
- **Base Outfit Scoring** — the `base_compatibility_score`.

**Constraint:** this layer is deterministic and **must not depend on user
behavior** (no boosts, no cooldowns, no usage history). Given the same wardrobe
+ context + engine config, it always returns the same candidates and the same
base scores. This is what keeps the system testable and what guarantees that
behavior can only *reorder* — never *manufacture* — outfits.

> Today this layer is the backend "Valen"/V05 engine. The mobile app
> (`auxi-mobile`) is a thin client: it calls `/recommendation/start` and
> `/recommendation/next` and renders the result. It does not assemble or score
> outfits. See `src/services/recommendationService.ts` and
> `src/services/v05Api.ts`.

### 1.2 Personalization Layer (Score Modifier Layer)

The **only** place where behavioral signals are applied, and always **after**
the base compatibility score. Detailed in §2–§4.

Phase 1 modifiers: **Recent User Action Boost**, **Outfit Cooldown**.
Phase 2 (once telemetry exists): **Outfit Rotation**, **Closet Freshness**.
Future signals (Preference Drift, Item Reliability, Weather Tolerance,
Preference Stability, …) plug into this **same** layer as additional modifiers
— they never modify the Core engine.

### 1.3 Presentation Layer

Responsible for:

- **Accessories** — a post-processing *completion* layer (§6).
- **Reason Tokens** — emitted by modifiers and hard filters (§5).
- **Recommendation explanations** — a serialization of active reason tokens, not
  an independent system (§5).
- **UI presentation** — chips, styling notes, layout.

**Constraint:** the Presentation Layer reads the finished outfit and its reason
tokens. It never feeds back into outfit construction or scoring.

---

## 2. Score Modifier Layer

Behavioral signals are **not** implemented as separate features. They are
modifiers in one layer with a single, uniform contract.

### 2.0 Position in the recommendation flow (re-rank only — never create, remove, or repair)

This is one of the most important constraints in this document. The modifier
layer **only changes the order of already-compatible outfits.** The flow is
strictly sequential:

```
Generate valid candidates        (Core: Safety Funnel + Candidate Generation)
        ↓
Score compatibility              (Core: Base Outfit Scoring)
        ↓
Apply behavioral modifiers       (Personalization: Σ bounded modifiers)
        ↓
Re-rank candidates               (sort by final_score)
```

The modifier layer operates on the **set of outfits the Core engine already
declared valid and scored.** It therefore must never:

- **create** an outfit combination the Core engine did not generate,
- **remove** a valid outfit from consideration (a heavy enough negative modifier
  may sink an outfit to the bottom of the ranking, but it stays a valid
  candidate — it is not deleted), nor
- **repair** an incompatible outfit into a compatible one.

A behavioral modifier can never make an invalid outfit become valid. Validity is
decided once, in Core, before any behavior is applied. Personalization changes
*order*, nothing else.

### 2.1 Final score

```
final_score = base_compatibility_score + clamp( Σ modifier.value , −CLAMP, +CLAMP )
```

- `base_compatibility_score` comes from the Core engine and is always the
  dominant term.
- Each active modifier contributes a signed `value` (see §2.3).
- The modifier sum is clamped before being added (see §3).

**Behavior improves ranking. It never rescues a poor outfit.** A maxed-out
positive modifier stack must not let a low-compatibility outfit outrank a
high-compatibility one. This is enforced by the clamp (§3.2).

### 2.2 Modifier contract

Every modifier — present and future — implements the same interface:

| Field | Meaning |
|-------|---------|
| `code` | Stable identifier, e.g. `NEW_ITEM_BOOST`, `COOLDOWN`, `ROTATION`, `FRESHNESS`. |
| `enabled` | Independently toggleable (config flag). Disabled → contributes nothing, emits no token. |
| `weight` | Configurable scalar magnitude (see §3.1). |
| `decay` | Configurable decay function (see §4.2). |
| `priority` | Integer used for deterministic conflict resolution (§3.3). |
| `evaluate(item/outfit, context, telemetry) → { value, reason_token } | null` | Returns the signed contribution and its reason token, or `null` if it does not apply. |

A modifier that returns `null` does not participate and produces no
explanation. A modifier that returns a non-null value **must** emit a reason
token (§5) — there is no silent scoring.

### 2.3 Scope of a modifier

Modifiers may target either:

- an **item** (e.g. New Item Boost, Freshness, Rotation, Cooldown-by-item), in
  which case an outfit's modifier contribution aggregates its items' values, or
- an **outfit** (e.g. Cooldown on a recently *shown* outfit hash).

Both resolve into the same `Σ modifier.value` term. The aggregation rule
(sum of per-item contributions + per-outfit contributions, then clamp) is fixed
so the result is deterministic.

### 2.4 Configuration surface

All modifier tunables live as new keys inside the existing, versioned admin
`scoring_weights` configuration block (DRAFT → ACTIVE → ARCHIVED). This means
weights, decay, priority, clamp, and enable/disable flags are all
admin-tunable, A/B-able, and rollback-able **without a code deploy**. No
modifier hardcodes its constants.

---

## 3. Guardrails

The non-negotiable rules that keep behavior subordinate to garment
compatibility.

### 3.1 Bounded modifier weights

Each modifier's `weight` is bounded by config to a defined range. No single
modifier may contribute more than its configured maximum. Weights are expressed
on the same scale as `base_compatibility_score` so magnitudes are comparable and
auditable.

### 3.2 Score clamping (the dominance guarantee)

The **sum** of all modifier values is clamped to `[−CLAMP, +CLAMP]` before being
added to the base score:

```
modifier_sum = clamp( Σ modifier.value , −CLAMP, +CLAMP )
```

`CLAMP` is configured such that it is **strictly smaller than the meaningful gap
between a good and a poor base compatibility score**. Consequence: a poor outfit
plus the maximum positive modifier stack still ranks below a good outfit with no
modifiers. This is the mechanical guarantee that *behavior reranks, it never
rescues.*

### 3.3 Modifier priority & conflict resolution

When modifiers of opposing polarity target the same item/outfit (e.g. a newly
uploaded item the user also wore yesterday gets both `NEW_ITEM_BOOST +` and
`COOLDOWN −`):

1. All applicable modifiers still evaluate and emit their reason tokens (for
   transparency).
2. Their values sum normally, then the global clamp (§3.2) applies.
3. **Deterministic precedence rule:** recency/cooldown (negative) takes
   precedence over boost/freshness (positive) for the *same* item. Concretely,
   when both a positive and a negative modifier apply to one item, the negative
   is evaluated at full weight and the positive is suppressed for that item
   (it may not flip the item's net contribution positive). "I literally wore
   this yesterday" always wins over "it's new."
4. Ties in ordering are broken by `priority`, then by a stable key (item id /
   outfit hash) so output order is fully reproducible.

### 3.4 Determinism of decay

Time-based decay makes the same request return different results on different
days. That is acceptable for a daily feed but must be deliberate:

- **Primary decay axis is exposure** — number of times the item has been
  *successfully recommended* — because it is reproducible and directly models
  the goal ("the user has now seen ways to wear it").
- **Wall-clock is a secondary expiry** applied via `min()` (a boost expires at
  whichever comes first: exposure count reached, or time window elapsed).
- The reference timestamp used for any wall-clock decay must be captured per
  request so a given recommendation can be reproduced for debugging.

---

## 4. Recent User Action Boost

Generalizes the existing exploration-item logic (AU-351
`is_exploration_item` / `exploration_waiting`, "Waiting for the right occasion")
into **one** mechanism rather than several independent features.

### 4.1 Product behavior

When a user adds new wardrobe items, the engine should **temporarily prioritize
those items whenever context allows**, so users immediately discover ways to
wear newly added clothing. This is a **temporary positive modifier, not a hard
rule** — the item is favored when it fits the context, never forced into every
outfit.

### 4.2 Supported actions

The boost is a family of positive modifiers keyed by a recent user action:

| Action | Status | Polarity |
|--------|--------|----------|
| Upload Item | Phase 1 | `+` |
| Edit Item | Phase 1 | `+` |
| Favorite Item | Phase 1 | `+` |
| Newly Purchased Item | Future | `+` |

Each action registers a bounded, decaying positive modifier (per §3.1, §3.4).
Decay is exposure-primary with a wall-clock `min()` expiry; both are config.

### 4.3 The negative twin: Cooldown

**Recently worn** items contribute a **negative** cooldown modifier through the
exact same machinery (same contract, opposite sign). This is why Boost and
Cooldown are one architecture, not two: a positive decaying modifier and a
negative decaying modifier over user-action / wear telemetry.

> Telemetry note: a coarse signal exists today
> (`WardrobeItem.usage_frequency: 'NORMAL' | 'LESS_USED'`, `style_tags:
> 'less-used'`). Per-item recommend counts and `last_recommended_at` timestamps
> do **not** yet exist and are the prerequisite for Rotation and Freshness
> (Phase 2). Recently-*shown* outfit hashes are already held in backend
> **session state** (the engine's per-session recently-shown set), which is
> sufficient for Phase 1 Cooldown without a new telemetry store. (This is
> session-internal state, not a public REST endpoint.)

---

## 4A. Item lifecycle (how the modifiers interact over time)

The modifiers above are easier to reason about when viewed as **stages in a
single item's life.** The same item moves through these states as the user
interacts with it; each state is just a different modifier (or none) firing on
that item. This is the mental model for how modifiers compose over time — not a
separate mechanism.

| Lifecycle stage | Trigger | Modifier | Polarity | Phase |
|-----------------|---------|----------|----------|-------|
| **New upload** | User adds the item (upload / edit / favorite) | `RECENT_ACTION_BOOST` (temporary) | `+` | 1 |
| **Frequently recommended** | Item has been successfully recommended enough times | boost **decays to zero** (exposure-primary decay, §3.4) | → `neutral` | 1 |
| **Recently worn** | Item appeared/was worn very recently | `COOLDOWN` | `−` | 1 |
| **Long time unused** | Item not recommended for a long window | `FRESHNESS` | `+` | 2 |
| **Highly preferred** | Behavior shows strong, stable preference | personalization boost (e.g. `ITEM_RELIABILITY`) | `+` | 3+ |

```
   upload/edit/favorite
          │  RECENT_ACTION_BOOST (+, decaying)
          ▼
   [ surfaced often ] ──exposure──▶ boost expires (neutral)
          │
          ▼
   worn / shown recently ──▶ COOLDOWN (−, decaying)
          │
          ▼ (time passes, not surfaced)
   long unused ──▶ FRESHNESS (+)   ◀── prevents items being forgotten
          │
          ▼ (repeated positive behavior)
   highly preferred ──▶ personalization boost (+)
```

Key properties this view makes obvious:

- **Stages are not exclusive.** A freshly uploaded item the user also wore
  yesterday is in *both* "new upload" and "recently worn" simultaneously — the
  conflict-resolution rule (§3.3) decides the net effect (cooldown wins).
- **Every transition is a decaying modifier, never a flag flip.** An item is
  never permanently "boosted" or permanently "buried"; modifiers fade so the
  item naturally returns to neutral. This is what keeps personalization
  *gradual* (principle §0.1.3).
- **Lifecycle never changes validity.** Every stage only adjusts ranking among
  outfits the Core engine already deemed valid (§2.0). A buried item is still a
  valid candidate; a boosted item is still only surfaced when context allows.

---

## 5. Reason tokens (explainability)

Explainability is **not** a separate system. Each modifier — and each hard
Safety-Funnel filter — emits a reason token, and the UI explanation is simply
the serialization of the active tokens.

### 5.1 Token shape

```jsonc
{
  "code": "NEW_ITEM_BOOST",      // stable identifier, matches the modifier
  "polarity": "+",               // "+" | "-" | "neutral"
  "human_text": "You recently uploaded this blazer."
}
```

Examples:

| code | polarity | human_text |
|------|----------|------------|
| `NEW_ITEM_BOOST` | `+` | "You recently uploaded this blazer." |
| `COOLDOWN` | `−` | "You wore these trousers yesterday." |
| `FRESHNESS` | `+` | "This shirt hasn't been worn recently." |
| `WEATHER_OK` | `neutral` | "Weather is suitable." |

### 5.2 Serialization → explanation

```
Today's recommendation
• You recently uploaded this blazer.      ← NEW_ITEM_BOOST
• Weather is suitable.                     ← WEATHER_OK
• Your grey trousers haven't been worn recently.  ← FRESHNESS
```

The explanation is deterministic and always consistent with engine behavior,
because it is generated *from* the modifiers that actually fired — there is no
second, divergent explanation path. The existing free-text `reasoning_human`
field becomes an optional LLM-polished fallback, not the source of truth.

### 5.3 Mobile contract (this repo)

`auxi-mobile`'s only Phase 1 responsibility is rendering. When the backend
contract is final, the outfit response gains a `reason_tokens` field:

```ts
reason_tokens: ReasonToken[];
```

added to whichever outfit struct the backend serializes. Note the two existing
structs differ in what they already carry, so the new field must be added to
both contracts that reach the client:

- `V05Outfit` (`src/services/v05Api.ts`) currently exposes `reasoning_human`
  (the free-text styling note) and `outfit_hash`.
- the legacy `Outfit` (`src/services/recommendationService.ts`) exposes
  `styling_note`, `outfit_hash`, and `fallback_flags`.

The Home recommendation surface renders the tokens as "Because:" chips. No
scoring, boosting, or cooldown logic ever runs on the client.

> **Sequencing decision:** the mobile-side `ReasonToken` type + `reason_tokens`
> stub is **postponed until the backend response contract is finalized**, to
> avoid the client and server drifting on field names/shape. The mobile work is
> a fast follow once the backend emits the contract — not a blocker, and not
> started speculatively.

---

## 6. Accessories

Accessories remain a **post-processing completion layer** in the Presentation
Layer. They complete an already-good outfit and **never** participate in:

- Anchor Selection
- Compatibility Matching
- Outfit Scoring
- Try Another (the controlled-variation axes stay garment-only: Silhouette →
  Layering → Color → New Anchor)

Accessory ranking may use **only**:

- context (weather, occasion),
- availability (what the user owns),
- accessory preference (a *separate* signal space from garment personalization,
  so accessory likes never pollute garment scores).

Nothing else. An accessory must never determine whether an outfit is considered
good.

---

## 7. Coverage

**Wardrobe Coverage is a product metric, not an optimization target.** Defined
as the percentage of user-owned items recommended within a rolling window, it is
reported as product analytics / user insight / a dashboard number.

The engine improves coverage **as a side effect** of Rotation, Freshness, and
Cooldown — never by explicitly optimizing a set-level coverage objective (which
would fight determinism and add disproportionate complexity).

---

## 8. Roadmap & scope

### Phase 0 — Telemetry substrate (prerequisite, backend)

Per-`(user, item)` `{ times_recommended, last_recommended_at, times_accepted }`
and per-`(user, accessory)` shown/liked counts. Rotation, Freshness, and
accessory learning are guesses without this.

### Phase 1 — Minimal, high-visibility (locked scope)

- **Score Modifier Layer** (the framework + clamp + config surface)
- **Recent User Action Boost** (Upload / Edit / Favorite)
- **Outfit Cooldown** (uses the backend's per-session recently-shown hashes)
- **Reason Tokens** (+ mobile chip rendering)

Rationale: largest user-visible improvement (post-upload "aha" + "stop showing
me the same thing") for the least logic, and it stands up the framework every
later signal reuses.

### Phase 2 — Once telemetry exists

- **Outfit Rotation**
- **Closet Freshness**

### Phase 3+ — Advanced behavioral intelligence (future)

- Preference Drift, Item Reliability, Weather Tolerance, Preference Stability.
- Implemented as **materialized per-user features** refreshed on a defined batch
  cadence, fed into the **same** Score Modifier Layer as additional modifiers.
  They must never bypass the deterministic Core engine or introduce live opaque
  inference into the request path.

### Work-split note (mobile vs backend)

Almost all of the above is backend ("Valen"/V05) work. In `auxi-mobile` the only
shippable Phase 1 surface is the **reason-token render contract + chip UI**
(§5.3), and that is **deferred until the backend response contract is finalized**
so the two don't drift. Backend implementation may begin now; the mobile stub is
a fast follow once the contract lands. Tickets should be split along that
boundary.

---

## 9. Summary of invariants (the things that must never break)

1. The Core engine is deterministic and behavior-free.
2. Behavior is applied only in the Score Modifier Layer, only after base scoring.
3. **Modifiers only re-rank already-valid outfits.** They never create, remove,
   or repair an outfit combination, and never make an invalid outfit valid.
   Validity is decided once, in Core, before any behavior is applied (§2.0).
4. `final = base + clamp(Σ modifiers)`; the clamp is smaller than the
   good-vs-poor base-score gap, so behavior reranks but never rescues.
5. Every non-null modifier and every hard filter emits a reason token; the
   explanation is their serialization — no second explanation path.
6. Accessories are presentation-only and never touch construction, compatibility,
   scoring, or Try Another.
7. Coverage is a metric, not an objective.
8. New behavioral signals are added as modifiers in this layer — never by editing
   the Core engine.
