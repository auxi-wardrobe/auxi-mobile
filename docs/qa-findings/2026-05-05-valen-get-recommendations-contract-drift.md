# `/recommendation/valen-get-recommendations` mobile/backend contract drift — Home renders empty

**Severity**: blocker (for Home swipe data flows; Phase A/B/C swipe verification cannot proceed)
**Repro rate**: 2/2 attempts (curl, both with and without `mode`)
**Build**: branch `main`, working-tree HEAD `9306047f0e10127de74d3c8e763d1f1fd9f91710` with uncommitted Phase A/B/C diff
**Device**: iOS Simulator iPhone 16 (UDID `6371F8E8-893E-4D7C-8683-8A128B7996F8`), iOS 18.x; backend `:5001` PID 97618

## Steps

1. Login as `test@example.com` (POST `/api/login` → 200, JWT issued).
2. Mobile `recommendationService.valenGetRecommendation({ mode })` posts to
   `/api/recommendation/valen-get-recommendations`. Body shape sent (verbatim
   from `auxi/src/services/recommendationService.ts:99-119`):
   ```json
   { "temperature": 22, "user": { "gender": "MASCULINE", "occasion": "work" } }
   ```
   With Phase C mode override:
   ```json
   { "temperature": 22, "user": { "gender": "MASCULINE", "occasion": "work" }, "mode": "power" }
   ```
3. Replicated via curl from terminal with the JWT — same payload either way.

## Expected

`HTTP 200 { outfits: Outfit[] }` so HomeScreen can render at least one
outfit sheet and the 5 swipe flows in `auxi/docs/HOME_SWIPE_PLAN.md` §6 can
be exercised.

## Actual

`HTTP 400 Validation Error` — backend rejects the body before reaching the
engine. Wire excerpt (request_id `2abce9f0-14b9-4678-8f43-09d69bf86682`):

```json
{
  "error": "Validation Error",
  "message": "Invalid request data",
  "details": [
    {"type":"missing","loc":["body","formality"],"msg":"Field required"},
    {"type":"missing","loc":["body","gender"],"msg":"Field required"},
    {"type":"missing","loc":["body","prompt"],"msg":"Field required"},
    {"type":"missing","loc":["body","system_instruction"],"msg":"Field required"},
    {"type":"missing","loc":["body","model_name"],"msg":"Field required"}
  ]
}
```

Same response with `mode: "power"` appended (request_id
`c1898ae8-7dec-4e39-bc93-4176706a97f4`). The new Phase B/C fields
(`pinned_item_id`, `mode`) are silently accepted but the call still 400s
because of the five missing top-level fields.

Net effect on Home UI: `listOutfits` stays empty, the FlatList renders no
sheets, swipe / heart / pin / "Show another" / "This works" / "Edit context"
have nothing to act on. Phase A/B/C cannot be functionally verified.

## Suspected area

- Mobile sender: `auxi/src/services/recommendationService.ts:96-125`
  (`valenGetRecommendation`) — sends `temperature, user.gender, user.occasion`.
- Backend receiver: `wardrobe-backend/routers/recommendation.py:677-732`
  + `ValenRecommendationRequest` schema — requires `temperature`, `gender`
  (top-level, not nested), `formality`, `prompt`, `system_instruction`,
  `model_name`.
- Drift is **pre-existing** to the swipe redesign — Phase A/B/C added
  `pinned_item_id` and `mode` on the wire but did NOT cause this. The body
  shape was already incompatible before this branch.

## Routing

- **backend-dev** (primary): align `ValenRecommendationRequest` to the
  shape mobile already sends (`temperature` number, `user.{gender,occasion}`
  nested) OR
- **tech-lead**: arbitrate the contract — confirm the fields
  `prompt`/`system_instruction`/`model_name` are server-owned defaults
  (mobile should not have to send those) and the `formality` field needs
  to be derived from `user.occasion` server-side.
- **mobile-dev** (only if tech-lead rules the backend shape stands):
  update `valenGetRecommendation` payload + `API_DOCUMENTATION.md` per
  the umbrella's two-repo contract rule.

## Why this blocks Phase A/B/C verification

`auxi/docs/HOME_SWIPE_PLAN.md` §6 lists 5 flows — 4 of them (cold swipe,
3-swipe ContextChipsModal trigger, heart resets the counter, pin
reshuffle) require at least one rendered outfit sheet. With `listOutfits`
empty those flows have no surface. Only the static-render checks (mode
pill row visible + selectable, header heart visible, no JS crash) can be
verified independently — and even those need the user past Login.
