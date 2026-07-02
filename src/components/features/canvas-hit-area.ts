// Canvas item hit-area geometry (pure — no RN imports, so it's unit-testable
// without loading the native surface module).
//
// An item's touch target is a centered content box matching the *visible*
// garment, not the full frame. Every garment PNG shares the same transparent
// padding, so the frame is meaningfully larger than the object you see. Making
// the whole frame touchable meant a tap on a higher-z item's transparent margin
// stole the touch from the visible garment behind it (AU-370). Mirrors
// CONTENT_RATIO in collage-seed-layout.ts; kept separate to avoid an import
// cycle (collage-seed-layout imports CanvasItemData from OutfitCanvasSurface).
export const ITEM_HIT_AREA_RATIO = 0.72;

// Centered content-box rect (in the item's own frame coordinates) used as the
// draggable/tappable hit area. Taps outside it fall through to items underneath.
export const getItemHitArea = (width: number, height: number) => ({
  left: (width * (1 - ITEM_HIT_AREA_RATIO)) / 2,
  top: (height * (1 - ITEM_HIT_AREA_RATIO)) / 2,
  width: width * ITEM_HIT_AREA_RATIO,
  height: height * ITEM_HIT_AREA_RATIO,
});
