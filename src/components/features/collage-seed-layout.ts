import { Item } from '../../types/item';
import { resolveItemImage } from '../../utils/url';
import type { CanvasItemData } from './OutfitCanvasSurface';

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic outfit-collage layout engine.
//
// Replaces the old hand-placed Figma seed tables (one fixed arrangement per
// item-count) with a rule-based system that derives every item's position from
// its CATEGORY alone. Same input → identical output, no randomness.
//
// The core invariant that buys "stable layout" (adding an item must not
// rearrange the existing outfit): **an item's anchor is a pure function of its
// own category/region, never of the set of items present.** A Top always snaps
// to the TORSO anchor whether or not a jacket is also on the canvas, so adding
// the jacket can't move the Top (beyond a bounded same-region fan — see below).
//
// Pipeline:  category → CategorySpec → semantic region → canvas anchor → frame
//            size → collision-resolve (push, or tuck-under when dense) → z-order.
//
// Everything is expressed RELATIVE TO canvas width (normalized anchors, fractional
// scales), so the identical composition renders at any surface size — the 382px
// Home tile, the full Remix editor, or a favourite card.
// ─────────────────────────────────────────────────────────────────────────────

// 4:3 portrait — the "Image 3:4" container the collage is composed into. Kept as
// a named export: HomeScreen constants, favourite + creations cards lock their
// surface aspectRatio to it.
export const COLLAGE_ASPECT = 4 / 3; // height / width

// A 100%-scale garment frame spans this fraction of the canvas WIDTH. Because
// every source PNG shares identical dimensions and identical negative padding,
// the object footprint is a fixed fraction of its frame, so scaling the frame
// scales the object predictably and the frame centre == the object centre.
const BASE_FRAME_RATIO = 0.6;

// ── Semantic body regions (anatomical anchors along a vertical spine) ──────────
type BodyRegion =
  | 'HEAD'
  | 'FACE'
  | 'NECK'
  | 'TORSO'
  | 'WAIST'
  | 'LEGS'
  | 'FEET'
  | 'SIDE'
  | 'WRIST';

// Skeleton = main garment, visual focus, never displaced by collision.
// Accessory = supporting piece, may be pushed or tucked under to fit.
type LayerKind = 'skeleton' | 'accessory';

interface CategorySpec {
  region: BodyRegion;
  // Relative to a 100% garment frame (see BASE_FRAME_RATIO). Mirrors the agreed
  // visual-hierarchy table: main garments dominate, accessories support.
  scale: number;
  // Higher = more important. Drives placement order, collision authority (the
  // lower-priority item always yields) and the z-order base.
  priority: number;
  // Base layering band. Lower renders behind. Bottom < shoes < top/dress <
  // outerwear < waist < bag < head/face/jewellery — the flat-lay stacking order.
  zBand: number;
  layer: LayerKind;
  // Max fraction of THIS item that may stay covered before collision pushes it
  // out. Slight overlap (10–20%) is desirable; shoes are pinned to 0.
  overlap: number;
  // How far (fraction of canvas width) this item may travel to dodge a collision
  // before it gives up and tucks UNDER the obstacle instead. Skeleton barely
  // moves; accessories get a small budget; dense outfits trip the tuck-under.
  maxTravel: number;
}

// ── 1. Category definitions ───────────────────────────────────────────────────
// Add a future category = add one row here. The engine reads these fields
// generically and never special-cases a category by name.
const CATEGORY_TABLE: Record<string, CategorySpec> = {
  // Skeleton — the main silhouette.
  Dress: { region: 'TORSO', scale: 1.0, priority: 100, zBand: 20, layer: 'skeleton', overlap: 0.15, maxTravel: 0.04 },
  Outerwear: { region: 'TORSO', scale: 1.0, priority: 95, zBand: 30, layer: 'skeleton', overlap: 0.2, maxTravel: 0.04 },
  Top: { region: 'TORSO', scale: 0.95, priority: 90, zBand: 22, layer: 'skeleton', overlap: 0.2, maxTravel: 0.04 },
  Bottom: { region: 'LEGS', scale: 0.95, priority: 90, zBand: 12, layer: 'skeleton', overlap: 0.2, maxTravel: 0.04 },
  Shoes: { region: 'FEET', scale: 0.5, priority: 80, zBand: 15, layer: 'skeleton', overlap: 0.0, maxTravel: 0.06 },

  // Accessories — supporting pieces.
  Bag: { region: 'SIDE', scale: 0.4, priority: 50, zBand: 40, layer: 'accessory', overlap: 0.1, maxTravel: 0.12 },
  Scarf: { region: 'NECK', scale: 0.4, priority: 45, zBand: 35, layer: 'accessory', overlap: 0.3, maxTravel: 0.1 },
  Hat: { region: 'HEAD', scale: 0.35, priority: 45, zBand: 50, layer: 'accessory', overlap: 0.2, maxTravel: 0.1 },
  Belt: { region: 'WAIST', scale: 0.35, priority: 40, zBand: 36, layer: 'accessory', overlap: 0.3, maxTravel: 0.1 },
  Eyewear: { region: 'FACE', scale: 0.28, priority: 35, zBand: 52, layer: 'accessory', overlap: 0.2, maxTravel: 0.1 },
  Jewelry: { region: 'FACE', scale: 0.22, priority: 30, zBand: 54, layer: 'accessory', overlap: 0.2, maxTravel: 0.1 },
  Watch: { region: 'WRIST', scale: 0.18, priority: 25, zBand: 55, layer: 'accessory', overlap: 0.2, maxTravel: 0.1 },

  // Generic fallback for the backend's collapsed 'Accessory' family (and any
  // unknown accessory). Behaves like a balancing side piece.
  Accessory: { region: 'SIDE', scale: 0.4, priority: 50, zBand: 40, layer: 'accessory', overlap: 0.1, maxTravel: 0.12 },
};

// Deterministic tie-break order when two items share a priority. Independent of
// input array order, so the layout is identical however the items arrive.
const CATEGORY_ORDER = Object.keys(CATEGORY_TABLE);

const DEFAULT_SPEC = CATEGORY_TABLE.Top;

// ── 3. Canvas zones: body region → normalized anchor + fan rule ────────────────
// Anchor is the normalized (0–1, origin top-left, y-down) centre an item snaps
// to. The spine HEAD→FACE→NECK→TORSO→WAIST→LEGS→FEET also defines the flat-lay
// reading order. SIDE / WRIST are pulled off-centre so the bag balances the
// composition. `fanAxis`/`fanStep` spread multiple items sharing a region.
interface Zone {
  anchor: { x: number; y: number };
  fanAxis: { x: number; y: number };
  fanStep: number; // normalized spacing between fanned siblings
}

const ZONES: Record<BodyRegion, Zone> = {
  HEAD: { anchor: { x: 0.5, y: 0.1 }, fanAxis: { x: 1, y: 0 }, fanStep: 0.14 },
  FACE: { anchor: { x: 0.5, y: 0.16 }, fanAxis: { x: 1, y: 0 }, fanStep: 0.12 },
  NECK: { anchor: { x: 0.5, y: 0.23 }, fanAxis: { x: 1, y: 0 }, fanStep: 0.1 },
  TORSO: { anchor: { x: 0.5, y: 0.37 }, fanAxis: { x: 1, y: 0 }, fanStep: 0.16 },
  WAIST: { anchor: { x: 0.5, y: 0.55 }, fanAxis: { x: 1, y: 0 }, fanStep: 0.0 },
  LEGS: { anchor: { x: 0.5, y: 0.68 }, fanAxis: { x: 1, y: 0 }, fanStep: 0.0 },
  FEET: { anchor: { x: 0.5, y: 0.9 }, fanAxis: { x: 1, y: 0 }, fanStep: 0.16 },
  SIDE: { anchor: { x: 0.82, y: 0.6 }, fanAxis: { x: 0, y: 1 }, fanStep: 0.16 },
  WRIST: { anchor: { x: 0.78, y: 0.5 }, fanAxis: { x: 0, y: 1 }, fanStep: 0.12 },
};

// ─────────────────────────────────────────────────────────────────────────────
// A pre-resolved collage item: id + already-resolved image URI + its category.
// Decouples the layout math from the full `Item` shape so the Home collage view
// and the Remix canvas (which only receive lightweight nav params) can seed the
// identical arrangement. `category` is optional for back-compat — absent/unknown
// categories fall back to DEFAULT_SPEC.
export type CollageSeedItem = { id: string; imageUri: string; category?: string };

// Map a free-form stored category string to a canonical engine category. Mirrors
// the keyword families in outfit-normalize.ts but resolves the finer accessory
// types (bag / hat / belt / …) when the source string carries them. Most
// specific silhouettes are tested first (one-piece before top, outer before top,
// skirt before shirt).
const resolveCategory = (raw?: string): CategorySpec => {
  const c = raw?.trim().toLowerCase() ?? '';
  if (!c) {
    return DEFAULT_SPEC;
  }
  const has = (...keys: string[]) => keys.some(k => c.includes(k));

  if (has('dress', 'jumpsuit', 'one-piece', 'one piece', 'romper', 'overall')) {
    return CATEGORY_TABLE.Dress;
  }
  if (has('outer', 'coat', 'jacket', 'blazer')) {
    return CATEGORY_TABLE.Outerwear;
  }
  if (has('shoe', 'sneaker', 'boot', 'heel', 'sandal', 'loafer', 'footwear')) {
    return CATEGORY_TABLE.Shoes;
  }
  if (has('bag', 'purse', 'tote', 'clutch', 'backpack')) {
    return CATEGORY_TABLE.Bag;
  }
  if (has('sunglass', 'eyewear', 'glasses')) {
    return CATEGORY_TABLE.Eyewear;
  }
  if (has('hat', 'cap', 'beanie')) {
    return CATEGORY_TABLE.Hat;
  }
  if (has('scarf')) {
    return CATEGORY_TABLE.Scarf;
  }
  if (has('belt')) {
    return CATEGORY_TABLE.Belt;
  }
  if (has('watch')) {
    return CATEGORY_TABLE.Watch;
  }
  if (has('jewel', 'ring', 'necklace', 'earring', 'bracelet')) {
    return CATEGORY_TABLE.Jewelry;
  }
  if (has('bottom', 'pant', 'jean', 'skirt', 'short', 'trouser', 'legging')) {
    return CATEGORY_TABLE.Bottom;
  }
  if (has('top', 'shirt', 'tee', 'blouse', 'sweater', 'hoodie', 'knit')) {
    return CATEGORY_TABLE.Top;
  }
  if (has('accessor')) {
    return CATEGORY_TABLE.Accessory;
  }
  return DEFAULT_SPEC;
};

// ── 4. Scaling: relative to canvas width (adaptive by construction) ────────────
const frameSize = (spec: CategorySpec, canvasW: number): number =>
  canvasW * BASE_FRAME_RATIO * spec.scale;

// ── 5/6. Collision geometry ────────────────────────────────────────────────────
interface Box {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

// Overlap extents (px) of two centre-boxes, or null when disjoint.
const overlap = (a: Box, b: Box): { ox: number; oy: number } | null => {
  const ox =
    Math.min(a.cx + a.w / 2, b.cx + b.w / 2) -
    Math.max(a.cx - a.w / 2, b.cx - b.w / 2);
  const oy =
    Math.min(a.cy + a.h / 2, b.cy + b.h / 2) -
    Math.max(a.cy - a.h / 2, b.cy - b.h / 2);
  return ox > 0 && oy > 0 ? { ox, oy } : null;
};

interface Node {
  id: string;
  imageUri: string;
  spec: CategorySpec;
  sortKey: number; // index in CATEGORY_ORDER, for deterministic tie-break
}

interface Placed extends Node {
  cx: number;
  cy: number;
  size: number;
  baseZ: number;
  tuckUnderZ?: number; // when set, render just beneath this z (dense tuck-under)
}

// ── 2. Placement order: priority DESC, then deterministic category, then id ────
const order = (a: Node, b: Node): number =>
  b.spec.priority - a.spec.priority ||
  a.sortKey - b.sortKey ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Core engine. Map pre-resolved items to overlapping canvas positions using the
 * category → region → anchor → collision pipeline. Deterministic: identical
 * input always yields identical output.
 */
export const seedCanvasLayout = (
  items: CollageSeedItem[],
  surfaceWidth: number,
): CanvasItemData[] => {
  if (items.length === 0 || surfaceWidth <= 0) {
    return [];
  }
  const W = surfaceWidth;
  const H = surfaceWidth * COLLAGE_ASPECT;

  const nodes: Node[] = items.map(it => {
    const spec = resolveCategory(it.category);
    return {
      id: it.id,
      imageUri: it.imageUri,
      spec,
      sortKey: Math.max(0, CATEGORY_ORDER.indexOf(specKey(spec))),
    };
  });

  // Group by region for fanning. Within a region, the highest-priority item
  // holds the anchor (offset 0) and siblings fan outward — so adding a lower
  // sibling never moves the region's primary garment.
  const byRegion = new Map<BodyRegion, Node[]>();
  for (const n of nodes) {
    const list = byRegion.get(n.spec.region) ?? [];
    list.push(n);
    byRegion.set(n.spec.region, list);
  }
  for (const list of byRegion.values()) {
    list.sort(order);
  }

  const anchorOf = (n: Node): { cx: number; cy: number } => {
    const zone = ZONES[n.spec.region];
    const peers = byRegion.get(n.spec.region)!;
    const i = peers.indexOf(n);
    // Fan from the primary: 0, +1, -1, +2, -2, … (primary stays at anchor).
    const rung = i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 === 1 ? 1 : -1);
    const off = rung * zone.fanStep;
    return {
      cx: (zone.anchor.x + off * zone.fanAxis.x) * W,
      cy: (zone.anchor.y + off * zone.fanAxis.y) * H,
    };
  };

  // ── 6. Progressive placement: place high→low, resolve each new item only
  // against already-placed (higher-priority) items. Same-region siblings are
  // intentional layering/fan — never collision-resolved against each other.
  const placed: Placed[] = [];
  for (const n of [...nodes].sort(order)) {
    const { cx, cy } = anchorOf(n);
    const size = frameSize(n.spec, W);
    let box: Box = { cx, cy, w: size, h: size };
    let travel = 0;
    const budget = n.spec.maxTravel * W;
    const isShoe = n.spec.region === 'FEET';
    let tuckUnderZ: number | undefined;

    for (const other of placed) {
      if (other.spec.region === n.spec.region) {
        continue; // same region: layered/fanned, not collided
      }
      const otherBox: Box = {
        cx: other.cx,
        cy: other.cy,
        w: other.size,
        h: other.size,
      };
      const o = overlap(box, otherBox);
      if (!o) {
        continue;
      }
      const allowed = isShoe ? 0 : Math.min(n.spec.overlap, other.spec.overlap);
      const tolX = Math.min(box.w, otherBox.w) * allowed;
      const tolY = Math.min(box.h, otherBox.h) * allowed;
      if (o.ox <= tolX && o.oy <= tolY) {
        continue; // within the desirable-overlap margin
      }

      // Minimum-translation dodge. Shoes may only move DOWN (stay at the feet).
      const needX = o.ox - tolX;
      const needY = o.oy - tolY;
      let dx = 0;
      let dy = 0;
      if (!isShoe && needX < needY) {
        dx = (box.cx >= otherBox.cx ? 1 : -1) * needX;
      } else {
        dy = (isShoe ? 1 : box.cy >= otherBox.cy ? 1 : -1) * needY;
      }

      const next: Box = { ...box, cx: box.cx + dx, cy: box.cy + dy };
      const mag = Math.hypot(dx, dy);
      const escapesCanvas =
        next.cx < 0 || next.cx > W || next.cy < 0 || next.cy > H;

      if (travel + mag > budget || escapesCanvas) {
        // Dense outfit: stop shoving. Keep the item near its anchor and let it
        // tuck UNDER the obstacle (lower z, partial overlap) — e.g. shoes
        // peeking out beneath a long coat hem instead of dropping off-canvas.
        tuckUnderZ = Math.min(tuckUnderZ ?? Infinity, other.baseZ);
        continue;
      }
      travel += mag;
      box = next;
    }

    placed.push({
      ...n,
      cx: box.cx,
      cy: box.cy,
      size,
      baseZ: n.spec.zBand * 100 + n.spec.priority,
      tuckUnderZ,
    });
  }

  // ── z-order: base band, demoted just beneath any tuck-under target, then
  // dense-ranked to a gap-free 1..n the renderer can use directly.
  const withZ = placed.map(p => ({
    p,
    z: p.tuckUnderZ != null ? Math.min(p.baseZ, p.tuckUnderZ - 1) : p.baseZ,
  }));
  withZ.sort((a, b) => a.z - b.z || (a.p.id < b.p.id ? -1 : 1));

  const rank = new Map<string, number>();
  withZ.forEach((e, i) => rank.set(e.p.id, i + 1));

  // ── 8. Output: top-left x/y (matching CanvasItemData), size baked into
  // width/height, rotation 0 (deterministic, no jitter), z = dense rank.
  return placed.map(p => ({
    id: p.id,
    imageSource: { uri: p.imageUri },
    x: p.cx - p.size / 2,
    y: p.cy - p.size / 2,
    width: p.size,
    height: p.size,
    zIndex: rank.get(p.id)!,
  }));
};

// Reverse-lookup a spec's canonical key for the deterministic tie-break. Specs
// are shared object refs in CATEGORY_TABLE, so identity comparison is exact
// (Accessory + Bag share field values but are distinct entries).
function specKey(spec: CategorySpec): string {
  for (const key of CATEGORY_ORDER) {
    if (CATEGORY_TABLE[key] === spec) {
      return key;
    }
  }
  return 'Top';
}

/**
 * Map an outfit's items to seeded canvas positions for the collage-play view.
 * Thin wrapper over `seedCanvasLayout` that resolves each `Item`'s image URI and
 * forwards its category to the layout engine.
 */
export const seedFromOutfit = (
  items: Array<Item | null>,
  surfaceWidth: number,
): CanvasItemData[] =>
  seedCanvasLayout(
    items
      .filter((it): it is Item => !!it)
      .map(it => ({
        id: it.id,
        imageUri: resolveItemImage(it) || '',
        category: it.category,
      })),
    surfaceWidth,
  );
