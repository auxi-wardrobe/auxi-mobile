# Strategy: mood-aware recommendations ("wear the feeling you want")

**Goal.** A user should be able to ask for a feeling — *calm*, *relaxed*,
*confident* — and have the recommender surface outfits that fit it, informed by
**how that user has said outfits make them feel**. Tagging an outfit "relaxed"
should make relaxed-feeling outfits more likely next time.

This doc is the end-to-end design and the **contract the backend (Valen) still
needs to implement**. The mobile foundation is done (see _Client status_); the
learning loop itself is server-side.

---

## Current state (two mood systems, not connected)

### System A — recommendation mood bias (live)
- Home's 3 mode pills map to an engine mood: **Safe→`calm`, Power→`confident`,
  Creative→`playful`** (now centralised in `services/mood/mood-vocabulary.ts`).
- Sent as `intent.mood` on `POST /recommendation/build`. Engine vocab (5):
  `calm · confident · playful · low_energy · grounded` (`services/v05Api.ts`).
- Valen ("Layer 4") biases scoring using each garment's machine-tagged
  `WardrobeItem.mood`. So the bias is driven by **item attributes**, not by the
  user's feedback, and the UI only ever requests 3 of the 5 moods.

### System B — mood feedback (live, capture only)
- `MoodFeedbackSheet` captures up to 8 chips from a 15-term vocab
  (`components/features/mood-chips.ts`, mirrors backend `mood_vocab.py`):
  `feels_like_me, confident, relaxed, polished, comfortable, sharp, effortless,
  elevated, professional, prepared, easy, attractive, expressive, functional,
  lightweight, not_quite_me`.
- Stored on `favorites.mood_tags` via `POST /favourites`.
- Consumed today **only** for: the favourite card vibe pill, the prompt-policy
  tier, and analytics. It does **not** influence recommendations.

### The gap
1. **No feedback→engine loop** — `favorites.mood_tags` is never read back into
   scoring.
2. **Vocabulary mismatch** — the two vocabs overlap only on `confident`.
3. **Limited desired-feeling input** — only the 3 mode pills.

---

## Target closed loop

```
user taps "Wear this" / picks a feeling
        │
        ▼
MoodFeedbackSheet  ──► favorites.mood_tags (feedback vocab, 15)
        │                         │
        │      feedbackMoodsToIntentMoods()   ← mood-vocabulary.ts (this PR)
        ▼                         ▼
   analytics            user mood-affinity profile (engine vocab, 5)
                                  │
                                  ▼
        Valen scoring: bias toward items/outfits the user has
        historically felt <requested mood> about
                                  │
                                  ▼
        POST /recommendation/build  ──►  outfits matching the feeling
```

---

## Vocabulary mapping (v1 heuristic)

One engine mood per feedback chip. Lives in `FEEDBACK_MOOD_TO_INTENT`
(`services/mood/mood-vocabulary.ts`); tune against real `mood_feedback_submitted`
data — it's a one-file change.

| Engine mood | Feedback chips |
|-------------|----------------|
| `calm`      | relaxed, comfortable, effortless |
| `confident` | confident, sharp, elevated, polished, attractive |
| `playful`   | expressive |
| `low_energy`| lightweight, easy |
| `grounded`  | feels_like_me, professional, prepared, functional |
| _(dropped)_ | not_quite_me (soft-negative — rejection, not a target) |

> Open question for product/data: `low_energy` is thinly populated and `playful`
> maps from a single chip. Consider expanding the feedback→engine buckets or the
> engine vocab once usage data lands.

---

## Backend contract (what Valen still needs)

1. **Build a per-user mood-affinity profile.** Aggregate the user's
   `favorites.mood_tags` (mapped feedback→engine via the table above) into a
   weighted vector over the 5 engine moods (recency- and frequency-weighted).
   Negative `not_quite_me` should *down*-weight the items/styles it was attached
   to.

2. **Consume it in scoring (Layer 4 extension).** When `intent.mood = M`, boost
   candidates whose items/style-signature the user has historically felt `M`
   about (their affinity), in addition to the existing item-`mood` bias.

3. **Optional request hint (forward-compatible).** Accept an optional
   `intent.preferred_moods?: Mood[]` on `POST /recommendation/build` so the
   client can pass an explicit multi-mood request. MUST be ignored if absent and
   MUST NOT 400 on unknown — mirrors the `favorites.title` forward-compat
   precedent. The client will start sending it once this is confirmed (kept OFF
   until then to avoid a strict-schema 400).

4. **Keep `mood_vocab.py` and `mood-chips.ts` byte-identical** (already a stated
   invariant) and treat `services/mood/mood-vocabulary.ts` as the shared mapping
   contract — if the engine prefers to own the mapping, expose it via the policy
   endpoint and the client will read it instead of hard-coding.

---

## Client status (done in this change)

- ✅ **`services/mood/mood-vocabulary.ts`** — single source of truth bridging
  the feedback vocab (15) and mode pills → engine vocab (5), with a `__DEV__`
  coverage guard.
- ✅ **HomeScreen** consumes `moodForMode()` (removed the duplicated inline
  `moodMap`).
- ✅ **`mood_feedback_submitted`** now carries `intent_moods` (engine-vocab
  projection) so the mapping can be validated against real usage before any
  backend wiring.
- ✅ **`not_quite_me` no longer saves to favourites** (keeps the saved list to
  genuinely loved looks; recorded as feedback-only).
- ⛔ **Not done (backend):** the affinity profile + Layer-4 consumption + the
  `preferred_moods` request field. Tracked above.

---

## Phasing

- **P0 (this change):** vocabulary bridge + analytics signal + dead-code-free
  client foundation. No behaviour/scoring change.
- **P1 (backend):** affinity profile from `favorites.mood_tags`; consume in
  scoring. Validate the mapping with P0 analytics first.
- **P2:** richer desired-feeling UI (a mood picker beyond the 3 pills) sending
  `intent.preferred_moods`.
- **P3:** tune the mapping / engine vocab from data; consider per-item learned
  moods from feedback (not just machine tags).
