import { Item } from '../../types/item';
import { resolveItemImage } from '../../utils/url';
import type { CanvasItemData } from './OutfitCanvasSurface';

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic editorial-flatlay collage engine.
//
// The reference templates (1+1, 2+1, 3+2, 4+4, 5+1, …) are NOT an anatomical
// body map — they're a layered flat-lay: garments form a left→right shelf
// (outer → mid → base top), the bottom drops to the lower-right, shoes anchor
// the bottom-left, and accessories fill the surrounding whitespace with the bag
// acting as a left/right balancer. This module reverse-engineers those rules
// rather than hardcoding pixel positions.
//
// Composition pipeline (coordinates are the OUTPUT, never the starting point):
//   classify roles → pick skeleton by garment signature → place skeleton
//   → scale → distribute accessories into whitespace zones → balance the bag
//   → resolve collisions → dense-rank z → emit coordinates
//
// Deterministic: identical input always yields identical output (no randomness).
// Everything is normalized to canvas size, so the same composition renders at
// the 382px Home tile, a favourite card, or the full Remix editor.
// ─────────────────────────────────────────────────────────────────────────────

// 4:3 portrait — the "Image 3:4" container. Named export: HomeScreen constants
// and the favourite / creations cards lock their surface aspectRatio to it.
export const COLLAGE_ASPECT = 4 / 3; // height / width

// A 100%-scale garment frame spans this fraction of canvas WIDTH. Identical PNG
// dimensions + identical negative padding mean object footprint is a fixed
// fraction of the frame, so scaling the frame scales the object predictably.
const BASE_FRAME_RATIO = 0.58;

// ── Composition-density targets (the optimization phase) ──────────────────────
// After the skeleton + accessories are placed, the engine measures the outfit's
// overall content bounding box and scales the whole composition until its
// dominant axis fills TARGET of the canvas — a strong editorial presence rather
// than an island of items in whitespace. Density is the lever that makes few
// items large and many items slightly smaller (more items already span more of
// the box, so they need less scaling to reach the target).
const FILL_TARGET = 0.96; // desired dominant-axis fill — items fill the canvas
const FILL_LO = 0.9;
const FILL_HI = 1.0; // cap at the canvas edge: object content fills, frame padding bleeds
const SCALE_MIN = 0.6;
const SCALE_MAX = 4.0;
const OPTIMIZE_PASSES = 8;

// Collisions test an inner CONTENT box, not the full frame: every PNG shares the
// same transparent padding, so frames can render touching/overlapping without
// the engine treating the transparent margins as a real garment collision.
const CONTENT_RATIO = 0.72;

// ── Roles ─────────────────────────────────────────────────────────────────────
// Garments form the skeleton; accessories balance the composition. Two "Top"
// garments (sweater + tee) split into MID (knit layer) and TOP (base) so the
// outer→inner shelf order is well defined.
type GarmentRole = 'ONE_PIECE' | 'OUTER' | 'MID' | 'TOP' | 'BOTTOM';
type AccessoryRole =
  | 'SHOES'
  | 'BAG'
  | 'HEADWEAR'
  | 'EYEWEAR'
  | 'NECKWEAR'
  | 'BELT'
  | 'JEWELRY'
  | 'WATCH';
type Role = GarmentRole | AccessoryRole;

const GARMENT_ORDER: GarmentRole[] = ['ONE_PIECE', 'OUTER', 'MID', 'TOP', 'BOTTOM'];
// Placement order for accessories. Shoes first (fixed anchor); bag LAST so the
// balancer can read where every other weight already landed.
const ACCESSORY_ORDER: AccessoryRole[] = [
  'SHOES',
  'NECKWEAR',
  'HEADWEAR',
  'EYEWEAR',
  'BELT',
  'JEWELRY',
  'WATCH',
  'BAG',
];

const isGarment = (r: Role): r is GarmentRole =>
  (GARMENT_ORDER as string[]).includes(r);

// ── 5. Scale relationships (relative to a 100% garment frame) ─────────────────
const ROLE_SCALE: Record<Role, number> = {
  ONE_PIECE: 1.15, // dress / jumpsuit — always the largest piece
  OUTER: 0.95,
  MID: 0.82,
  TOP: 0.74,
  BOTTOM: 0.9,
  SHOES: 0.42,
  BAG: 0.4,
  NECKWEAR: 0.4,
  HEADWEAR: 0.34,
  BELT: 0.32,
  EYEWEAR: 0.27,
  JEWELRY: 0.22,
  WATCH: 0.18,
};

// ── z layering (flat-lay stack): bottom behind, outer in front, accessories on
// top, shoes between garments and small accessories. Dense-ranked at the end. ──
const ROLE_ZBAND: Record<Role, number> = {
  BOTTOM: 10,
  ONE_PIECE: 16,
  MID: 20,
  TOP: 26,
  OUTER: 30,
  SHOES: 34,
  BAG: 38,
  BELT: 42,
  NECKWEAR: 44,
  HEADWEAR: 50,
  EYEWEAR: 52,
  JEWELRY: 54,
  WATCH: 55,
};

// ── 3/4. Skeleton templates: garment signature → normalized anchor per role ───
// Different garment combinations produce different skeletons. The signature is
// the SORTED set of present garment roles, so the same structure always maps to
// the same shelf regardless of input order. Anchors are normalized centres
// (x of width, y of height). Unseen signatures fall back to a procedural shelf.
type Anchor = { x: number; y: number };

// Anchors are clustered so garment frames OVERLAP (outer over top, top over
// bottom) and read as one connected outfit; the density optimizer then scales
// the whole cluster up to fill the canvas. Tighter spacing here = stronger
// single-skeleton silhouette.
const SKELETONS: Record<string, Partial<Record<GarmentRole, Anchor>>> = {
  // Dress alone — centred, large; left column stays open for accessories (1+x).
  ONE_PIECE: { ONE_PIECE: { x: 0.52, y: 0.46 } },
  // Top + Bottom — tee over the waistband, jeans dropping to the right-bottom (2+1).
  'BOTTOM|TOP': {
    TOP: { x: 0.44, y: 0.39 },
    BOTTOM: { x: 0.64, y: 0.71 },
  },
  // Outerwear + Top + Bottom — jacket overlaps tee; jeans to the right-bottom (3+x).
  'BOTTOM|OUTER|TOP': {
    OUTER: { x: 0.38, y: 0.39 },
    TOP: { x: 0.54, y: 0.37 },
    BOTTOM: { x: 0.68, y: 0.72 },
  },
  // Outer + Mid + Top + Bottom — four-layer shelf; jeans to the right-bottom (4+x, 5+x).
  'BOTTOM|MID|OUTER|TOP': {
    OUTER: { x: 0.36, y: 0.4 },
    MID: { x: 0.48, y: 0.38 },
    TOP: { x: 0.6, y: 0.37 },
    BOTTOM: { x: 0.7, y: 0.73 },
  },
};

// ── Whitespace zones for accessories (normalized centres). Negative space the
// skeleton deliberately leaves open; multiple items in one zone stack downward.
// Accessory whitespace zones are computed per-composition from the garment
// bounding box (see `compose`), not fixed here. Roles map to a zone name:
//   SHOES → bottom-left · MID_LEFT → cap/sunglasses/shoulder-bag column ·
//   TOP_LEFT → scarf/headwear · BOTTOM_RIGHT → briefcase bag · MID_RIGHT → belt ·
//   BOTTOM_MID → jewellery/watch.
const ZONE_STACK_STEP = 0.11; // normalized-height offset per stacked item

// Preferred whitespace zone per accessory role (bag is decided by balance).
const ACCESSORY_ZONE: Record<Exclude<AccessoryRole, 'BAG'>, string> = {
  SHOES: 'SHOES',
  NECKWEAR: 'TOP_LEFT',
  HEADWEAR: 'MID_LEFT',
  EYEWEAR: 'MID_LEFT',
  BELT: 'MID_RIGHT',
  JEWELRY: 'BOTTOM_MID',
  WATCH: 'BOTTOM_MID',
};

// ─────────────────────────────────────────────────────────────────────────────
// A pre-resolved collage item: id + already-resolved image URI + raw category.
// `category` is optional for back-compat; absent/unknown → a sensible default.
export type CollageSeedItem = { id: string; imageUri: string; category?: string };

// ── 1. Classify a free-form category string into a layout role ────────────────
const classifyRole = (raw?: string): Role => {
  const c = raw?.trim().toLowerCase() ?? '';
  if (!c) {
    return 'TOP';
  }
  const has = (...k: string[]) => k.some(s => c.includes(s));

  if (has('dress', 'jumpsuit', 'one-piece', 'one piece', 'romper', 'overall', 'gown')) {
    return 'ONE_PIECE';
  }
  if (has('outer', 'coat', 'jacket', 'blazer', 'parka', 'trench', 'windbreaker')) {
    return 'OUTER';
  }
  if (has('shoe', 'sneaker', 'boot', 'heel', 'sandal', 'loafer', 'footwear', 'trainer')) {
    return 'SHOES';
  }
  if (has('bag', 'purse', 'tote', 'clutch', 'backpack', 'satchel', 'briefcase')) {
    return 'BAG';
  }
  if (has('sunglass', 'eyewear', 'glasses')) {
    return 'EYEWEAR';
  }
  if (has('hat', 'cap', 'beanie', 'beret')) {
    return 'HEADWEAR';
  }
  if (has('scarf', 'shawl', 'bandana')) {
    return 'NECKWEAR';
  }
  if (has('belt')) {
    return 'BELT';
  }
  if (has('watch')) {
    return 'WATCH';
  }
  if (has('jewel', 'ring', 'necklace', 'earring', 'bracelet', 'pendant')) {
    return 'JEWELRY';
  }
  if (has('bottom', 'pant', 'jean', 'skirt', 'short', 'trouser', 'legging', 'chino')) {
    return 'BOTTOM';
  }
  if (has('sweater', 'knit', 'hoodie', 'cardigan', 'pullover', 'jumper')) {
    return 'MID';
  }
  if (has('top', 'shirt', 'tee', 't-shirt', 'blouse', 'tank', 'cami', 'polo')) {
    return 'TOP';
  }
  // Generic 'Accessory' (backend collapses bag/hat/belt/… into one) → treat as
  // the bag balancer, the most useful single supporting piece.
  if (has('accessor')) {
    return 'BAG';
  }
  return 'TOP';
};

// ── Geometry helpers ──────────────────────────────────────────────────────────
interface Node {
  id: string;
  imageUri: string;
  role: Role;
  category?: string; // raw category, carried through so the editor can re-seed
}

interface Placed extends Node {
  cx: number;
  cy: number;
  size: number; // full frame size (px) — rendered width/height
  baseZ: number;
  tuckUnderZ?: number;
}

interface Box {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

const contentBox = (p: { cx: number; cy: number; size: number }): Box => ({
  cx: p.cx,
  cy: p.cy,
  w: p.size * CONTENT_RATIO,
  h: p.size * CONTENT_RATIO,
});

const overlap = (a: Box, b: Box): { ox: number; oy: number } | null => {
  const ox =
    Math.min(a.cx + a.w / 2, b.cx + b.w / 2) -
    Math.max(a.cx - a.w / 2, b.cx - b.w / 2);
  const oy =
    Math.min(a.cy + a.h / 2, b.cy + b.h / 2) -
    Math.max(a.cy - a.h / 2, b.cy - b.h / 2);
  return ox > 0 && oy > 0 ? { ox, oy } : null;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const frameSize = (role: Role, W: number, scale: number) =>
  BASE_FRAME_RATIO * W * ROLE_SCALE[role] * scale;

const place = (
  node: Node,
  a: Anchor,
  W: number,
  H: number,
  scale: number,
): Placed => ({
  ...node,
  cx: a.x * W,
  cy: a.y * H,
  size: frameSize(node.role, W, scale),
  baseZ: ROLE_ZBAND[node.role] * 100,
});

// ── 4. Garment skeleton: signature → template, or a procedural shelf ──────────
const buildSkeleton = (
  garments: Node[],
  W: number,
  H: number,
  scale: number,
): Placed[] => {
  // One item per garment role (deterministic: nodes arrive pre-sorted by role).
  const byRole = new Map<GarmentRole, Node>();
  for (const g of garments) {
    if (!byRole.has(g.role as GarmentRole)) {
      byRole.set(g.role as GarmentRole, g);
    }
  }
  const roles = [...byRole.keys()];
  const signature = [...roles].sort().join('|');
  const template = SKELETONS[signature];

  const anchorFor = (role: GarmentRole): Anchor => {
    if (template?.[role]) {
      return template[role]!;
    }
    // Procedural fallback for unseen garment combinations: lay the upper layers
    // left→right (outer→mid→top), drop the bottom to the lower-right, place a
    // lone dress right-of-centre.
    const uppers = (['OUTER', 'MID', 'TOP'] as GarmentRole[]).filter(r =>
      roles.includes(r),
    );
    if (role === 'ONE_PIECE') {
      return { x: 0.6, y: 0.5 };
    }
    if (role === 'BOTTOM') {
      const lastUpperX = uppers.length ? 0.3 + (uppers.length - 1) * 0.2 : 0.5;
      // Drop the bottom toward the right-bottom of the cluster.
      return { x: clamp(lastUpperX + 0.2, 0.5, 0.84), y: 0.72 };
    }
    const i = Math.max(0, uppers.indexOf(role));
    return { x: clamp(0.3 + i * 0.2, 0.2, 0.78), y: 0.33 };
  };

  return roles.map(role => place(byRole.get(role)!, anchorFor(role), W, H, scale));
};

// Union content bounding box of a placed composition (visible-object footprint).
const contentBounds = (placed: Placed[]) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of placed) {
    const half = (p.size * CONTENT_RATIO) / 2;
    minX = Math.min(minX, p.cx - half);
    maxX = Math.max(maxX, p.cx + half);
    minY = Math.min(minY, p.cy - half);
    maxY = Math.max(maxY, p.cy + half);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
};

// ── 6. Distribute accessories into whitespace; bag balances left/right ────────
const sideWeight = (items: Placed[], W: number): { left: number; right: number } => {
  let left = 0;
  let right = 0;
  for (const p of items) {
    const w = ROLE_SCALE[p.role];
    if (p.cx < W / 2) {
      left += w;
    } else {
      right += w;
    }
  }
  return { left, right };
};

// ── 7. Collision: push an accessory out of overlaps (content box, min move).
// When it can't escape within budget it tucks UNDER the obstacle (lower z).
const resolveCollision = (p: Placed, others: Placed[], W: number, H: number) => {
  const budget = 0.16 * W;
  let travel = 0;
  let box = contentBox(p);
  for (const o of others) {
    const ob = contentBox(o);
    const ov = overlap(box, ob);
    if (!ov) {
      continue;
    }
    const allowed = 0.12;
    const tolX = Math.min(box.w, ob.w) * allowed;
    const tolY = Math.min(box.h, ob.h) * allowed;
    if (ov.ox <= tolX && ov.oy <= tolY) {
      continue;
    }
    const needX = ov.ox - tolX;
    const needY = ov.oy - tolY;
    let dx = 0;
    let dy = 0;
    if (needX < needY) {
      dx = (box.cx >= ob.cx ? 1 : -1) * needX;
    } else {
      dy = (box.cy >= ob.cy ? 1 : -1) * needY;
    }
    const next: Box = { ...box, cx: box.cx + dx, cy: box.cy + dy };
    const mag = Math.hypot(dx, dy);
    const escapes = next.cx < 0 || next.cx > W || next.cy < 0 || next.cy > H;
    if (travel + mag > budget || escapes) {
      p.tuckUnderZ = Math.min(p.tuckUnderZ ?? Infinity, o.baseZ);
      continue;
    }
    travel += mag;
    box = next;
  }
  p.cx = box.cx;
  p.cy = box.cy;
};

/**
 * Core engine. Compose a deterministic editorial flat-lay from pre-resolved
 * items, then run a density-optimization pass so the outfit fills the canvas:
 *   classify → skeleton → accessories → measure density → rescale to target
 *   → re-centre → dense-rank z. Identical input always yields identical output.
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

  // Classify and sort into a deterministic, input-order-independent order.
  const nodes: Node[] = items.map(it => ({
    id: it.id,
    imageUri: it.imageUri,
    role: classifyRole(it.category),
    category: it.category,
  }));
  const garmentRank = (r: Role) =>
    isGarment(r) ? GARMENT_ORDER.indexOf(r) : 99;
  const accessoryRank = (r: Role) =>
    isGarment(r) ? 99 : ACCESSORY_ORDER.indexOf(r as AccessoryRole);
  const idCmp = (a: Node, b: Node) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  const garments = nodes
    .filter(n => isGarment(n.role))
    .sort((a, b) => garmentRank(a.role) - garmentRank(b.role) || idCmp(a, b));
  const accessories = nodes
    .filter(n => !isGarment(n.role))
    .sort((a, b) => accessoryRank(a.role) - accessoryRank(b.role) || idCmp(a, b));

  // ── Build one full composition at a given size scale (skeleton first, then
  // accessories into whitespace). Pure function of `scale` → re-runnable by the
  // optimizer. The garment skeleton is built before any accessory is placed.
  const compose = (scale: number): Placed[] => {
    const placed: Placed[] = buildSkeleton(garments, W, H, scale); // 4. skeleton

    // Anchor accessory zones to the GARMENT skeleton's bounding box, so they
    // always land in the real whitespace beside/below the cluster regardless of
    // how large the density pass scaled it (a fixed column would collide once
    // the garments grow). Left column hugs the cluster's left edge, the bag
    // balances off the right edge, shoes/jewellery sit just below.
    const gb = contentBounds(placed);
    const leftX = clamp(gb.minX - 0.05 * W, 0.06 * W, 0.32 * W);
    const rightX = clamp(gb.maxX + 0.05 * W, 0.68 * W, 0.94 * W);
    const midY = (gb.minY + gb.maxY) / 2;
    const botY = clamp(gb.maxY + 0.03 * H, 0.55 * H, 0.92 * H);
    const zonesPx: Record<string, Anchor> = {
      SHOES: { x: clamp(gb.minX + 0.04 * W, 0.1 * W, 0.4 * W), y: botY },
      MID_LEFT: { x: leftX, y: midY },
      TOP_LEFT: { x: leftX, y: clamp(gb.minY + 0.04 * H, 0.08 * H, midY) },
      BOTTOM_RIGHT: { x: rightX, y: botY },
      MID_RIGHT: { x: clamp(gb.maxX - 0.04 * W, 0.55 * W, 0.92 * W), y: midY + 0.14 * H },
      BOTTOM_MID: { x: (gb.minX + gb.maxX) / 2, y: botY },
    };

    const zoneUsed = new Map<string, number>();
    const zoneAnchor = (zone: string): Anchor => {
      const n = zoneUsed.get(zone) ?? 0;
      zoneUsed.set(zone, n + 1);
      const base = zonesPx[zone];
      // Stack extra items in a zone downward; return normalized for `place`.
      return { x: base.x / W, y: (base.y + n * ZONE_STACK_STEP * H) / H };
    };
    for (const node of accessories) {
      let zone: string;
      if (node.role === 'BAG') {
        // The bag balances the lighter side. Left already heavy (shoes + left
        // accessories) → bottom-right; otherwise tuck it into the left column.
        const { left, right } = sideWeight(placed, W);
        zone = left >= right ? 'BOTTOM_RIGHT' : 'MID_LEFT';
      } else {
        zone = ACCESSORY_ZONE[node.role as Exclude<AccessoryRole, 'BAG'>];
      }
      const p = place(node, zoneAnchor(zone), W, H, scale);
      resolveCollision(p, placed, W, H); // 7. only the accessory moves
      placed.push(p);
    }
    return placed;
  };

  // ── 5. Optimization pass: measure the composition's dominant-axis fill and
  // rescale toward the density target, iterating until it lands in the band
  // (or scale clamps). Fewer items need more scaling to reach the target, so
  // this naturally makes sparse outfits larger and busy ones slightly smaller.
  let scale = 1.2;
  let placed = compose(scale);
  for (let pass = 0; pass < OPTIMIZE_PASSES; pass++) {
    const b = contentBounds(placed);
    const fill = Math.max(b.w / W, b.h / H);
    if (fill >= FILL_LO && fill <= FILL_HI) {
      break;
    }
    const next = clamp(
      scale * clamp(FILL_TARGET / Math.max(fill, 0.01), 0.7, 1.4),
      SCALE_MIN,
      SCALE_MAX,
    );
    if (next === scale) {
      break; // clamped — no further movement possible
    }
    scale = next;
    placed = compose(scale);
  }

  // ── Re-centre the whole composition in the canvas (editorial framing).
  const bounds = contentBounds(placed);
  const dx = W / 2 - (bounds.minX + bounds.maxX) / 2;
  const dy = H / 2 - (bounds.minY + bounds.maxY) / 2;
  for (const p of placed) {
    p.cx += dx;
    p.cy += dy;
  }

  // ── Final per-role nudges, applied AFTER re-centring so they aren't damped by
  // the centring shift. Shoes are pushed right of the bottom-left corner.
  const SHOES_NUDGE_X = 0.15 * W;
  for (const p of placed) {
    if (p.role === 'SHOES') {
      p.cx += SHOES_NUDGE_X;
    }
  }

  // ── z-order: base band, demoted beneath any tuck-under target, dense-ranked.
  const ranked = placed
    .map(p => ({
      p,
      z: p.tuckUnderZ != null ? Math.min(p.baseZ, p.tuckUnderZ - 1) : p.baseZ,
    }))
    .sort((a, b) => a.z - b.z || (a.p.id < b.p.id ? -1 : 1));
  const rank = new Map<string, number>();
  ranked.forEach((e, i) => rank.set(e.p.id, i + 1));

  // 8. Emit coordinates (top-left x/y, frame size, dense-ranked z).
  return placed.map(p => ({
    id: p.id,
    imageSource: { uri: p.imageUri },
    x: p.cx - p.size / 2,
    y: p.cy - p.size / 2,
    width: p.size,
    height: p.size,
    zIndex: rank.get(p.id)!,
    category: p.category,
  }));
};

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
