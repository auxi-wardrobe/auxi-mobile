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

// Global size multiplier applied to EVERY item. Item anchors (centres) stay
// fixed, so raising this grows items into the surrounding whitespace and tightens
// the composition without rearranging it. 1.0 = original size; 1.5 = +50%.
const GLOBAL_SCALE = 1.5;

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
  ONE_PIECE: 1.0,
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

const SKELETONS: Record<string, Partial<Record<GarmentRole, Anchor>>> = {
  // Dress alone — right-of-centre, large, leaving the left column open (1+x).
  ONE_PIECE: { ONE_PIECE: { x: 0.6, y: 0.5 } },
  // Top + Bottom — tee upper-left, jeans lower-right (2+1).
  'BOTTOM|TOP': {
    TOP: { x: 0.4, y: 0.34 },
    BOTTOM: { x: 0.66, y: 0.5 },
  },
  // Outerwear + Top + Bottom — jacket left, tee upper-right, jeans right (3+x).
  'BOTTOM|OUTER|TOP': {
    OUTER: { x: 0.3, y: 0.34 },
    TOP: { x: 0.6, y: 0.32 },
    BOTTOM: { x: 0.74, y: 0.52 },
  },
  // Outer + Mid + Top + Bottom — four-garment shelf (4+x, 5+x).
  'BOTTOM|MID|OUTER|TOP': {
    OUTER: { x: 0.26, y: 0.36 },
    MID: { x: 0.5, y: 0.34 },
    TOP: { x: 0.7, y: 0.32 },
    BOTTOM: { x: 0.8, y: 0.54 },
  },
};

// ── Whitespace zones for accessories (normalized centres). Negative space the
// skeleton deliberately leaves open; multiple items in one zone stack downward.
const ZONES: Record<string, Anchor> = {
  SHOES: { x: 0.2, y: 0.82 }, // bottom-left anchor
  MID_LEFT: { x: 0.23, y: 0.5 }, // cap / sunglasses / shoulder-bag column
  TOP_LEFT: { x: 0.18, y: 0.17 }, // scarf / headwear in upper whitespace
  BOTTOM_RIGHT: { x: 0.8, y: 0.82 }, // briefcase bag (balances bottom-left shoes)
  MID_RIGHT: { x: 0.67, y: 0.66 }, // belt by the lower torso
  BOTTOM_MID: { x: 0.48, y: 0.88 }, // jewellery / watch fill remaining space
};
const ZONE_STACK_STEP = 0.12; // normalized-height offset per stacked item

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

const frameSize = (role: Role, W: number) =>
  BASE_FRAME_RATIO * W * ROLE_SCALE[role] * GLOBAL_SCALE;

const place = (node: Node, a: Anchor, W: number, H: number): Placed => ({
  ...node,
  cx: a.x * W,
  cy: a.y * H,
  size: frameSize(node.role, W),
  baseZ: ROLE_ZBAND[node.role] * 100,
});

// ── 4. Garment skeleton: signature → template, or a procedural shelf ──────────
const buildSkeleton = (garments: Node[], W: number, H: number): Placed[] => {
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
      return { x: clamp(lastUpperX + 0.16, 0.45, 0.82), y: 0.52 };
    }
    const i = Math.max(0, uppers.indexOf(role));
    return { x: clamp(0.3 + i * 0.2, 0.2, 0.78), y: 0.33 };
  };

  return roles.map(role => place(byRole.get(role)!, anchorFor(role), W, H));
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
 * items: skeleton first, accessories into whitespace, bag balanced, collisions
 * resolved, z dense-ranked. Identical input always yields identical output.
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

  // 4. Skeleton.
  const placed: Placed[] = buildSkeleton(garments, W, H);

  // 6. Accessories into whitespace zones (stacking within a zone).
  const zoneUsed = new Map<string, number>();
  const zoneAnchor = (zone: string): Anchor => {
    const n = zoneUsed.get(zone) ?? 0;
    zoneUsed.set(zone, n + 1);
    const base = ZONES[zone];
    return { x: base.x, y: base.y + n * ZONE_STACK_STEP };
  };

  for (const node of accessories) {
    let zone: string;
    if (node.role === 'BAG') {
      // The bag balances the lighter side. Left already heavy (shoes + left
      // accessories) → bottom-right; otherwise tuck it into the left column.
      const { left, right } = sideWeight(placed, W);
      zone = left >= right ? 'BOTTOM_RIGHT' : 'MID_LEFT';
    } else {
      // Non-garment, non-bag (bag handled above) → its preferred whitespace zone.
      zone = ACCESSORY_ZONE[node.role as Exclude<AccessoryRole, 'BAG'>];
    }
    const p = place(node, zoneAnchor(zone), W, H);
    resolveCollision(p, placed, W, H); // 7. only the accessory moves
    placed.push(p);
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
