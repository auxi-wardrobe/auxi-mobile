import {
  addSeededItems,
  seedCanvasLayout,
  CollageSeedItem,
} from '../collage-seed-layout';
import type { CanvasItemData } from '../OutfitCanvasSurface';

const W = 382; // Home collage tile width
const H = W * (4 / 3);

const mk = (id: string, category: string): CollageSeedItem => ({
  id,
  imageUri: `https://img/${id}.png`,
  category,
});

type Out = ReturnType<typeof seedCanvasLayout>;
const byId = (out: Out) => new Map(out.map(o => [o.id, o]));
const cx = (o: Out[number]) => o.x + o.width / 2;
const cy = (o: Out[number]) => o.y + o.height / 2;

describe('seedCanvasLayout — editorial flat-lay engine', () => {
  it('returns empty for no items / zero width', () => {
    expect(seedCanvasLayout([], W)).toEqual([]);
    expect(seedCanvasLayout([mk('a', 'Top')], 0)).toEqual([]);
  });

  it('is deterministic and input-order independent', () => {
    const a = [mk('jkt', 'Jacket'), mk('tee', 'Top'), mk('jean', 'Jeans'), mk('sh', 'Shoes')];
    const shuffled = [a[3], a[1], a[0], a[2]];
    expect(seedCanvasLayout(a, W)).toEqual(seedCanvasLayout(a, W));
    expect(seedCanvasLayout(shuffled, W)).toEqual(seedCanvasLayout(a, W));
  });

  it('lays the garment shelf outer→inner, left→right (3+1)', () => {
    const out = byId(
      seedCanvasLayout(
        [mk('jkt', 'Jacket'), mk('tee', 'Top'), mk('jean', 'Jeans'), mk('sh', 'Shoes')],
        W,
      ),
    );
    // Outerwear sits left of the base top.
    expect(cx(out.get('jkt')!)).toBeLessThan(cx(out.get('tee')!));
    // Bottom drops to the right of and below the top.
    expect(cx(out.get('jean')!)).toBeGreaterThan(cx(out.get('tee')!));
    expect(cy(out.get('jean')!)).toBeGreaterThan(cy(out.get('tee')!));
  });

  it('anchors shoes in the bottom-left', () => {
    const out = byId(
      seedCanvasLayout([mk('tee', 'Top'), mk('jean', 'Jeans'), mk('sh', 'Shoes')], W),
    );
    const sh = out.get('sh')!;
    expect(cx(sh)).toBeLessThan(W * 0.4);
    expect(cy(sh)).toBeGreaterThan(H * 0.6);
  });

  it('places a lone dress right-of-centre, leaving the left column open', () => {
    const out = byId(seedCanvasLayout([mk('dress', 'Dress'), mk('sh', 'Shoes')], W));
    expect(cx(out.get('dress')!)).toBeGreaterThan(W * 0.5);
    expect(cx(out.get('sh')!)).toBeLessThan(W * 0.4); // shoes still bottom-left
  });

  it('scales main garments large and accessories small', () => {
    const out = byId(
      seedCanvasLayout(
        [mk('jkt', 'Jacket'), mk('tee', 'Top'), mk('sh', 'Shoes'), mk('gl', 'Sunglasses')],
        W,
      ),
    );
    expect(out.get('jkt')!.width).toBeGreaterThan(out.get('tee')!.width);
    expect(out.get('tee')!.width).toBeGreaterThan(out.get('sh')!.width);
    expect(out.get('sh')!.width).toBeGreaterThan(out.get('gl')!.width);
  });

  it('stacks cap and sunglasses in the same left column (cap above)', () => {
    const out = byId(
      seedCanvasLayout(
        [mk('jkt', 'Jacket'), mk('tee', 'Top'), mk('jean', 'Jeans'), mk('sh', 'Shoes'),
         mk('cap', 'Hat'), mk('gl', 'Sunglasses')],
        W,
      ),
    );
    const cap = out.get('cap')!;
    const gl = out.get('gl')!;
    // Same column (close x), sunglasses below the cap.
    expect(Math.abs(cx(cap) - cx(gl))).toBeLessThan(W * 0.12);
    expect(cy(gl)).toBeGreaterThan(cy(cap));
  });

  it('BALANCE: bag goes opposite the heavy accessory side', () => {
    // Left is loaded with cap + sunglasses + shoes → bag balances to the right.
    const heavyLeft = byId(
      seedCanvasLayout(
        [mk('jkt', 'Jacket'), mk('tee', 'Top'), mk('jean', 'Jeans'), mk('sh', 'Shoes'),
         mk('cap', 'Hat'), mk('gl', 'Sunglasses'), mk('bag', 'Bag')],
        W,
      ),
    );
    expect(cx(heavyLeft.get('bag')!)).toBeGreaterThan(W * 0.5);

    // Dress weights the right with no left accessories → bag tucks left.
    const dress = byId(
      seedCanvasLayout([mk('dress', 'Dress'), mk('sh', 'Shoes'), mk('bag', 'Bag')], W),
    );
    expect(cx(dress.get('bag')!)).toBeLessThan(W * 0.5);
  });

  it('DENSITY: the composition fills a strong share of the canvas', () => {
    const outfits = [
      [mk('dress', 'Dress'), mk('sh', 'Shoes')], // sparse → scaled up large
      [mk('jkt', 'Jacket'), mk('tee', 'Top'), mk('jean', 'Jeans'), mk('sh', 'Shoes')],
      [mk('coat', 'Trench'), mk('knit', 'Sweater'), mk('tee', 'Top'), mk('jean', 'Jeans'),
       mk('sh', 'Shoes'), mk('bag', 'Bag'), mk('belt', 'Belt')],
    ];
    for (const items of outfits) {
      const out = seedCanvasLayout(items, W);
      const minX = Math.min(...out.map(o => o.x + o.width * 0.14));
      const maxX = Math.max(...out.map(o => o.x + o.width * 0.86));
      const minY = Math.min(...out.map(o => o.y + o.height * 0.14));
      const maxY = Math.max(...out.map(o => o.y + o.height * 0.86));
      const fill = Math.max((maxX - minX) / W, (maxY - minY) / H);
      expect(fill).toBeGreaterThan(0.8); // strong canvas presence
      expect(fill).toBeLessThan(1.05); // object content stays roughly on-canvas
    }
  });

  it('one-piece (dress / jumpsuit) is always the largest item', () => {
    const out = byId(
      seedCanvasLayout(
        [mk('dress', 'Dress'), mk('coat', 'Trench'), mk('sh', 'Shoes'), mk('bag', 'Bag')],
        W,
      ),
    );
    const dressW = out.get('dress')!.width;
    for (const id of ['coat', 'sh', 'bag']) {
      expect(dressW).toBeGreaterThan(out.get(id)!.width);
    }
  });

  it('count-relative scale: a 2-item outfit out-scales a 7-item one', () => {
    const few = byId(seedCanvasLayout([mk('dress', 'Dress'), mk('sh', 'Shoes')], W));
    const many = byId(
      seedCanvasLayout(
        [mk('coat', 'Trench'), mk('knit', 'Sweater'), mk('tee', 'Top'), mk('jean', 'Jeans'),
         mk('sh', 'Shoes'), mk('bag', 'Bag'), mk('belt', 'Belt')],
        W,
      ),
    );
    // The lone dress is scaled up far larger than a tee inside a busy outfit.
    expect(few.get('dress')!.width).toBeGreaterThan(many.get('tee')!.width);
  });

  it('is still deterministic after the optimization pass', () => {
    const items = [mk('jkt', 'Jacket'), mk('tee', 'Top'), mk('jean', 'Jeans'), mk('cap', 'Hat'), mk('sh', 'Shoes')];
    expect(seedCanvasLayout(items, W)).toEqual(seedCanvasLayout(items, W));
  });

  it('renders outerwear above the base top it overlaps', () => {
    const out = byId(seedCanvasLayout([mk('jkt', 'Jacket'), mk('tee', 'Top')], W));
    expect(out.get('jkt')!.zIndex).toBeGreaterThan(out.get('tee')!.zIndex);
  });

  it('adapts to canvas size: doubling width doubles the geometry', () => {
    const items = [mk('jkt', 'Jacket'), mk('tee', 'Top'), mk('sh', 'Shoes')];
    const small = byId(seedCanvasLayout(items, W));
    const large = byId(seedCanvasLayout(items, W * 2));
    for (const id of ['jkt', 'tee', 'sh']) {
      expect(large.get(id)!.width).toBeCloseTo(small.get(id)!.width * 2, 5);
      expect(large.get(id)!.x).toBeCloseTo(small.get(id)!.x * 2, 5);
      expect(large.get(id)!.y).toBeCloseTo(small.get(id)!.y * 2, 5);
    }
  });

  it('generalizes to an unseen combination without crashing or leaving bounds', () => {
    const out = seedCanvasLayout(
      [mk('parka', 'Parka'), mk('knit', 'Sweater'), mk('tee', 'Top'), mk('jean', 'Jeans'),
       mk('sh', 'Boots'), mk('bag', 'Tote'), mk('belt', 'Belt'), mk('w', 'Watch'),
       mk('scarf', 'Scarf')],
      W,
    );
    expect(out).toHaveLength(9);
    const z = out.map(o => o.zIndex).sort((a, b) => a - b);
    expect(z).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]); // dense, gap-free
    for (const o of out) {
      expect(cx(o)).toBeGreaterThan(0);
      expect(cx(o)).toBeLessThan(W);
      expect(o.width).toBeGreaterThan(0);
    }
  });

  it('FALLBACK: an unseen garment signature uses the procedural shelf', () => {
    // Jacket + Jeans (no top) → signature "BOTTOM|OUTER", which has no template,
    // so the procedural shelf runs. Outer stays an upper layer, bottom drops to
    // the lower-right, and everything is placed, in-bounds and densely z-ranked.
    const out = byId(
      seedCanvasLayout([mk('jkt', 'Jacket'), mk('jean', 'Jeans'), mk('sh', 'Shoes')], W),
    );
    expect(out.size).toBe(3);
    expect(cy(out.get('jean')!)).toBeGreaterThan(cy(out.get('jkt')!)); // bottom below outer
    expect(cx(out.get('jean')!)).toBeGreaterThan(cx(out.get('jkt')!)); // and to its right
    for (const o of out.values()) {
      expect(cx(o)).toBeGreaterThan(0);
      expect(cx(o)).toBeLessThan(W);
      expect(o.width).toBeGreaterThan(0);
    }
    // A second unseen signature (Outerwear alone) must also not crash.
    expect(seedCanvasLayout([mk('coat', 'Trench')], W)).toHaveLength(1);
  });

  it('never drops an input item, even two of the same garment role', () => {
    // Two TOPs + two OUTERs (layered) must all appear — none silently dropped.
    const items = [
      mk('tee1', 'Top'),
      mk('tee2', 'Top'),
      mk('jkt1', 'Jacket'),
      mk('jkt2', 'Jacket'),
      mk('jean', 'Jeans'),
      mk('sh', 'Shoes'),
    ];
    const out = seedCanvasLayout(items, W);
    expect(out).toHaveLength(items.length);
    expect(new Set(out.map(o => o.id)).size).toBe(items.length); // every id present
    const z = out.map(o => o.zIndex).sort((a, b) => a - b);
    expect(z).toEqual([1, 2, 3, 4, 5, 6]); // dense, gap-free, none collapsed
    // Same-role extras don't sit exactly on top of the primary (layered offset).
    expect(byId(out).get('tee1')!.x).not.toBe(byId(out).get('tee2')!.x);
  });

  it('NO-DROP invariant: output length == input length, every id present', () => {
    // The core data-loss guard: each input garment appears in the output exactly
    // once — no role-based dedupe/drop — across same-role garments AND same-role
    // accessories, so a whole-canvas re-seed can never delete an existing item.
    const outfits: CollageSeedItem[][] = [
      [mk('t1', 'Top'), mk('t2', 'Top'), mk('t3', 'Top')], // three of one role
      [mk('o1', 'Coat'), mk('o2', 'Jacket'), mk('m', 'Sweater'), mk('t', 'Top'), mk('b', 'Jeans')],
      [mk('sh1', 'Shoes'), mk('sh2', 'Boots'), mk('bg1', 'Tote'), mk('bg2', 'Clutch')], // dup accessories
      [mk('d1', 'Dress'), mk('d2', 'Jumpsuit'), mk('h', 'Heels')], // two one-pieces
    ];
    for (const items of outfits) {
      const out = seedCanvasLayout(items, W);
      expect(out).toHaveLength(items.length); // nothing dropped
      expect(new Set(out.map(o => o.id))).toEqual(new Set(items.map(i => i.id)));
      const z = out.map(o => o.zIndex).sort((a, b) => a - b);
      expect(z).toEqual(items.map((_, i) => i + 1)); // dense, gap-free z
      for (const o of out) {
        expect(o.width).toBeGreaterThan(0); // every item is actually placed
      }
    }
  });

  it('FALLBACK: missing / undefined category is placed, not dropped', () => {
    const out = seedCanvasLayout(
      [
        { id: 'mystery', imageUri: 'x' }, // no category → default role
        { id: 'sh', imageUri: 'x', category: 'Shoes' },
      ],
      W,
    );
    expect(out).toHaveLength(2);
    for (const o of out) {
      expect(o.width).toBeGreaterThan(0);
      expect(cx(o)).toBeGreaterThan(0);
      expect(cx(o)).toBeLessThan(W);
    }
    // Deterministic even with a missing category.
    const seeds = [{ id: 'mystery', imageUri: 'x' }, { id: 'sh', imageUri: 'x', category: 'Shoes' }];
    expect(seedCanvasLayout(seeds, W)).toEqual(seedCanvasLayout(seeds, W));
  });

  it('carries category through the output so a newly-added item can be seeded', () => {
    // The output carries each item's raw category; the editor reuses it to seed a
    // freshly-added item on the canvas rule (existing items keep their transform —
    // see the addSeededItems suite below).
    const first = seedCanvasLayout([mk('jean', 'Jeans')], W);
    expect(first[0].category).toBe('Jeans');

    const reseeded = byId(
      seedCanvasLayout(
        [
          { id: 'jean', imageUri: 'x', category: first[0].category },
          mk('sh', 'Shoes'),
        ],
        W,
      ),
    );
    // The newly added shoes land at the canonical bottom area, not at (0,0).
    expect(cy(reseeded.get('sh')!)).toBeGreaterThan(H * 0.55);
    expect(reseeded.get('jean')).toBeTruthy();
  });

  it('classifies free-form / pinned categories', () => {
    const out = byId(
      seedCanvasLayout(
        [mk('a', 'Blue Denim Jacket'), mk('b', 'Slim Trousers'), mk('c', 'Leather Sneakers')],
        W,
      ),
    );
    expect(cx(out.get('a')!)).toBeLessThan(cx(out.get('b')!)); // jacket left of trousers
    expect(cy(out.get('c')!)).toBeGreaterThan(H * 0.6); // sneakers bottom
  });
});

describe('addSeededItems — preserve-on-add', () => {
  // Build an "already arranged" canvas: seed three garments, then simulate the
  // user hand-editing each one's transform (nudge x/y, pinch scale, rotate).
  const arrangedCanvas = (): CanvasItemData[] =>
    seedCanvasLayout([mk('jkt', 'Jacket'), mk('tee', 'Top'), mk('jean', 'Jeans')], W).map(
      (c, i) => ({
        ...c,
        imageSource: { uri: `https://img/${c.id}.png` },
        x: c.x + 5,
        y: c.y - 7,
        scale: 1.3 + i * 0.2,
        rotation: 0.15 * (i + 1),
      }),
    );

  it('leaves EVERY existing item transform untouched when an item is added', () => {
    const existing = arrangedCanvas();
    // Snapshot only the transform fields before the add (value compare).
    const before = existing.map(c => ({
      id: c.id,
      x: c.x,
      y: c.y,
      width: c.width,
      height: c.height,
      scale: c.scale,
      rotation: c.rotation,
      zIndex: c.zIndex,
    }));

    const out = addSeededItems(existing, [mk('sh', 'Shoes')], W);

    for (const e of before) {
      const o = out.find(item => item.id === e.id)!;
      expect(o.x).toBe(e.x);
      expect(o.y).toBe(e.y);
      expect(o.width).toBe(e.width);
      expect(o.height).toBe(e.height);
      expect(o.scale).toBe(e.scale);
      expect(o.rotation).toBe(e.rotation);
      expect(o.zIndex).toBe(e.zIndex);
    }
  });

  it('preserves the existing image source and adds the new item, none dropped', () => {
    const existing = arrangedCanvas();
    const out = addSeededItems(existing, [mk('sh', 'Shoes'), mk('bag', 'Bag')], W);

    expect(out).toHaveLength(existing.length + 2);
    expect(new Set(out.map(o => o.id)).size).toBe(out.length); // no id collisions
    // Existing image sources survive (engine would have set { uri: '' }).
    expect(out.find(o => o.id === 'jkt')!.imageSource).toEqual({
      uri: 'https://img/jkt.png',
    });
    // New items stack ABOVE the existing arrangement.
    const maxExistingZ = Math.max(...existing.map(e => e.zIndex));
    for (const id of ['sh', 'bag']) {
      expect(out.find(o => o.id === id)!.zIndex).toBeGreaterThan(maxExistingZ);
    }
  });

  it('returns the existing canvas unchanged when nothing is added', () => {
    const existing = arrangedCanvas();
    expect(addSeededItems(existing, [], W)).toBe(existing); // same reference, no-op
  });
});
