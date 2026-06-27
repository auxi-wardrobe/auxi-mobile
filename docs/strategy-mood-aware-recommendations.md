# Strategy: feeling-aware recommendations ("wear the feeling you want")

**Goal.** Move Macgie from *"recommend based on clothes"* toward *"recommend
based on how this person wants to feel."* A user asks for a feeling — *calm*,
*relaxed*, *confident* — and the recommender surfaces outfits that fit it,
**informed by how that user has actually felt in past outfits.** That is a
stronger long-term differentiator than another ranking heuristic.

> **v2 (post-review).** Restructured around *what gets learned*. The 5-mood
> engine vector stays as Layer 4's **serving interface**, but the thing we
> **store and learn** is a richer **Feeling Memory** tied to **style
> signatures + context** — so future personalization needs no second migration.

---

## Three distinct signals

Personalization lives in keeping these separate. Today Layer 4 only uses the
third; P1 introduces the second.

| # | Signal | Example | Source |
|---|--------|---------|--------|
| 1 | **User intent** | "I want to feel relaxed" | mode pills / future picker |
| 2 | **User emotional memory** | "I usually feel relaxed wearing *these kinds of* outfits" | `favorites.mood_tags` + feedback |
| 3 | **Clothing semantic** | "These linen pants are machine-tagged calm" | `WardrobeItem.mood` (machine) |

The critical nuance for (2): the user is **not** saying "this outfit *is*
relaxed." They're saying **"this outfit made *me* feel relaxed."** That's an
**emotional outcome**, not a mood attribute — which is why we call it **Feeling
Memory**, not a "mood-affinity profile."

---

## Current state (two systems, not connected)

- **System A (live):** Home mode pills → `intent.mood` on
  `POST /recommendation/build`. Engine vocab (5): `calm · confident · playful ·
  low_energy · grounded` (`services/v05Api.ts`). Valen "Layer 4" biases scoring
  off each garment's machine-tagged `WardrobeItem.mood` — signal #3 only.
- **System B (live, capture only):** `MoodFeedbackSheet` captures a 15-term
  feedback vocab (`mood-chips.ts` ↔ backend `mood_vocab.py`) → stored on
  `favorites.mood_tags`. Used only for the favourite vibe pill, prompt-policy
  tier, and analytics.

**The gap:** `favorites.mood_tags` is never read back into scoring; the vocabs
overlap only on `confident`; desired-feeling input is limited to 3 pills.

---

## What to learn (the core of P1)

### Don't: a flat per-user mood vector
```
user: { calm: 0.8, confident: 0.3, playful: 0.1 }
```
Works, but **lossy**. It can answer "this user likes relaxed" — but never *why
relaxed looks relaxed for THIS user*, which is the question that makes Macgie a
stylist instead of a ranker.

### Do: Feeling Memory → Style Signature (+ Context) → weighted, with confidence
```
Feeling            Context           Style signature                 weight  conf
─────────────────────────────────────────────────────────────────────────────────
relaxed            weekend           linen · oversized · wide-leg ·   0.82   HIGH (n=19)
                                     cream palette · minimal accs
relaxed            office            loose trousers · soft knit       0.61   MED  (n=7)
confident          —                 tailored blazer · pointed shoe · 0.80   LOW  (n=2)
                                     black · gold jewelry
```

Three things this buys us:

1. **Style signature, not just a label.** Scoring boosts *outfits matching
   tailored / black / structured / gold-accessory* — not "boost confident
   outfits." Far richer and explainable.
2. **Context-conditioned.** *relaxed + weekend → oversized knitwear* vs
   *relaxed + office → loose trousers*. Same feeling, different look by
   situation.
3. **Confidence (sample count).** `0.80 @ n=2` ≠ `0.80 @ n=40`. Layer 4 must
   down-weight thin evidence; store `weight`, `samples`, and a `confidence`
   tier per entry.

The 5-mood vector can remain the **serving interface** Layer 4 reads today; the
Feeling-Memory representation is the **storage/learning foundation** beneath it.

---

## Capture schema (start now, the highest-leverage change)

Record richer events than `favorite → mood_tags`. The unit is:

```
Recommendation ID → Outfit ID → Mood tags → Context
                                              ├─ occasion / mode
                                              ├─ weather + temperature
                                              ├─ season
                                              └─ time of day
```

- **Now (P0.5, client):** the `mood_feedback_submitted` analytics event carries
  `intent_moods` (engine projection) and `occasion` so we can already measure
  *Feeling × Context* and validate the mapping before any backend wiring.
- **P1 (backend):** persist the same shape against `favorites` (forward-compat
  `context` blob) so the Feeling Memory can be learned per feeling × context.

This is what later unlocks "*relaxed + weekend → oversized knit*" learning. It's
cheap to start emitting and impossible to reconstruct retroactively, so it goes
first.

---

## Layer 4 becomes additive

Today: `score += machineItemMood`. Target:

```
score =  machine_item_mood              (signal #3, today)
      +  user_feeling_memory            (signal #2 — style-signature match for the requested feeling)
      +  wardrobe_style_memory          (what this user actually wears/keeps)
      +  recent_feedback                (last few accept/reject signals)
```

Think Spotify: not "recommend Jazz" but "you tend to enjoy slower acoustic music
after work." Each term is independently tunable and individually measurable.

---

## `not_quite_me` = identity mismatch, **not** negative mood

We already stopped saving `not_quite_me` to favourites. Go further in scoring:

```
not_quite_me  →  reduce similarity to that style neighborhood
              ✗  do NOT "boost the opposite"
```

It means *"don't repeat this style neighborhood,"* **not** *"this user is the
opposite mood."* Inferring `not me → must be playful` is wrong. Model it as a
**down-weight on the rejected outfit's style signature**, scoped to that
neighborhood.

---

## Vocabulary mapping (pragmatic v1)

One engine mood per feedback chip — `FEEDBACK_MOOD_TO_INTENT` in
`services/mood/mood-vocabulary.ts`:

| Engine mood | Feedback chips |
|-------------|----------------|
| `calm`      | relaxed, comfortable, effortless |
| `confident` | confident, sharp, elevated, polished, attractive |
| `playful`   | expressive |
| `low_energy`| lightweight, easy |
| `grounded`  | feels_like_me, professional, prepared, functional |
| _(dropped)_ | not_quite_me (handled as identity mismatch) |

- **Good enough for v1.** Because `intent_moods` is instrumented, we can measure
  e.g. *"how many users who say `relaxed` actually favourite `confident`-mapped
  outfits?"* — if a mapping is wrong, the data will show it (e.g. `prepared`
  may turn out closer to `confident` than `grounded`).
- **Don't hardcode forever — but not yet.** Serving the mapping from the policy
  endpoint (so mappings change without an app release) moves to **P2**. v1 stays
  in-client.

---

## Client status — done (P0, no behaviour/scoring change)

- ✅ `services/mood/mood-vocabulary.ts` — single source of truth bridging the
  15-term feedback vocab + mode pills → 5-term engine vocab, `__DEV__` guard.
- ✅ HomeScreen consumes `moodForMode()` (removed the duplicated inline map).
- ✅ `mood_feedback_submitted` carries `intent_moods` (+ `occasion` context, P0.5)
  — validate the mapping and Feeling × Context against real usage first.
- ✅ `not_quite_me` no longer saves to favourites (kept as feedback-only).
- ⛔ **Backend (P1):** Feeling Memory store (feeling × context × style-signature,
  with confidence), additive Layer 4, `intent.preferred_moods` field.

---

## Roadmap

```
P0  Vocabulary bridge + intent_moods/context analytics        ✅ (this change)
P1  Feeling Memory  — feeling × context × style-signature, with confidence;
    additive Layer 4 (memory + machine mood + wardrobe + recent feedback)
P2  Expanded feeling picker (intent.preferred_moods) + mapping served via policy
P3  Learn personal style signatures directly (mapping no longer needed)
P4  Predict feelings before asking — "This outfit will probably make you feel confident"
P5  Personal emotional model — "you usually feel confident in monochrome and
    relaxed in softer silhouettes"
```

P5 is where Macgie stops being an outfit recommender and becomes a personal
stylist that understands the user's relationship with clothing.

---

## Backend contract summary (P1)

1. **Feeling Memory store** — per user, keyed by `feeling × context`, valued by a
   **style-signature weight vector** with `samples` + `confidence`. Built from
   `favorites.mood_tags` (mapped feedback→engine) + the captured context.
2. **Additive Layer 4** — `machine_mood + feeling_memory + wardrobe_style_memory
   + recent_feedback`, each independently weighted; confidence scales the
   feeling-memory term.
3. **`not_quite_me`** — down-weights the rejected style neighborhood; never
   boosts an opposite.
4. **`intent.preferred_moods?: Mood[]`** on `POST /recommendation/build` —
   forward-compatible (ignore if absent, never 400). Client enables after
   confirmation.
5. **Keep `mood_vocab.py` ↔ `mood-chips.ts` byte-identical**; treat
   `mood-vocabulary.ts` as the shared mapping contract until P2 serves it from
   the policy endpoint.

## Assessment
The 5-engine-mood vector remains the serving interface for Layer 4 today; the
richer **Feeling Memory tied to style signatures + context (with confidence)** is
the learning foundation — adopting it now avoids a second architectural
migration when P3–P5 land.
