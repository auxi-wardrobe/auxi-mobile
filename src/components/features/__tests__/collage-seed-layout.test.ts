import {
  seedCanvasLayout,
  CollageSeedItem,
} from '../collage-seed-layout';

const W = 382; // Home collage tile width

const mk = (id: string, category: string): CollageSeedItem => ({
  id,
  imageUri: `https://img/${id}.png`,
  category,
});

const byId = (out: ReturnType<typeof seedCanvasLayout>) =>
  new Map(out.map(o => [o.id, o]));

describe('seedCanvasLayout — deterministic outfit collage engine', () => {
  it('returns an empty layout for no items / zero width', () => {
    expect(seedCanvasLayout([], W)).toEqual([]);
    expect(seedCanvasLayout([mk('a', 'Top')], 0)).toEqual([]);
  });

  it('is deterministic: identical input → identical output', () => {
    const items = [
      mk('top', 'Top'),
      mk('bot', 'Bottom'),
      mk('shoe', 'Shoes'),
      mk('bag', 'Bag'),
    ];
    expect(seedCanvasLayout(items, W)).toEqual(seedCanvasLayout(items, W));
  });

  it('is independent of input order (sorted by priority/category/id)', () => {
    const a = [mk('top', 'Top'), mk('bot', 'Bottom'), mk('shoe', 'Shoes')];
    const shuffled = [a[2], a[0], a[1]];
    expect(seedCanvasLayout(shuffled, W)).toEqual(seedCanvasLayout(a, W));
  });

  it('scales accessories down and keeps main garments dominant', () => {
    const out = byId(
      seedCanvasLayout(
        [mk('top', 'Top'), mk('shoe', 'Shoes'), mk('bag', 'Bag'), mk('watch', 'Watch')],
        W,
      ),
    );
    const top = out.get('top')!;
    const shoe = out.get('shoe')!;
    const bag = out.get('bag')!;
    const watch = out.get('watch')!;
    // Hierarchy: top (95%) > shoe (50%) > bag (40%) > watch (18%).
    expect(top.width).toBeGreaterThan(shoe.width);
    expect(shoe.width).toBeGreaterThan(bag.width);
    expect(bag.width).toBeGreaterThan(watch.width);
  });

  it('places items along the body spine (head→torso→legs→feet)', () => {
    const out = byId(
      seedCanvasLayout(
        [mk('hat', 'Hat'), mk('top', 'Top'), mk('bot', 'Bottom'), mk('shoe', 'Shoes')],
        W,
      ),
    );
    const cy = (id: string) => out.get(id)!.y + out.get(id)!.height / 2;
    expect(cy('hat')).toBeLessThan(cy('top'));
    expect(cy('top')).toBeLessThan(cy('bot'));
    expect(cy('bot')).toBeLessThan(cy('shoe'));
  });

  it('layers garments bottom→top: bottom < shoes < top via zIndex', () => {
    const out = byId(
      seedCanvasLayout([mk('top', 'Top'), mk('bot', 'Bottom'), mk('shoe', 'Shoes')], W),
    );
    expect(out.get('bot')!.zIndex).toBeLessThan(out.get('shoe')!.zIndex);
    expect(out.get('shoe')!.zIndex).toBeLessThan(out.get('top')!.zIndex);
  });

  it('STABILITY: adding an item in another region leaves the rest untouched', () => {
    const base = byId(
      seedCanvasLayout([mk('top', 'Top'), mk('bot', 'Bottom'), mk('shoe', 'Shoes')], W),
    );
    const withBag = byId(
      seedCanvasLayout(
        [mk('top', 'Top'), mk('bot', 'Bottom'), mk('shoe', 'Shoes'), mk('bag', 'Bag')],
        W,
      ),
    );
    // Bag is SIDE-region and lower priority: existing pieces keep their x/y.
    for (const id of ['top', 'bot', 'shoe']) {
      expect(withBag.get(id)!.x).toBeCloseTo(base.get(id)!.x, 5);
      expect(withBag.get(id)!.y).toBeCloseTo(base.get(id)!.y, 5);
    }
  });

  it('STABILITY: adding a jacket keeps the lower body (bottom/shoes) fixed', () => {
    const base = byId(
      seedCanvasLayout([mk('top', 'Top'), mk('bot', 'Bottom'), mk('shoe', 'Shoes')], W),
    );
    const withJacket = byId(
      seedCanvasLayout(
        [mk('top', 'Top'), mk('bot', 'Bottom'), mk('shoe', 'Shoes'), mk('jkt', 'Outerwear')],
        W,
      ),
    );
    // Outerwear shares the TORSO region with Top, so Top may fan aside — but the
    // skeleton outside that region must not move.
    for (const id of ['bot', 'shoe']) {
      expect(withJacket.get(id)!.x).toBeCloseTo(base.get(id)!.x, 5);
      expect(withJacket.get(id)!.y).toBeCloseTo(base.get(id)!.y, 5);
    }
  });

  it('renders an outerwear layer above the top it overlaps', () => {
    const out = byId(
      seedCanvasLayout([mk('top', 'Top'), mk('jkt', 'Outerwear')], W),
    );
    expect(out.get('jkt')!.zIndex).toBeGreaterThan(out.get('top')!.zIndex);
  });

  it('classifies free-form wardrobe categories (pinned items)', () => {
    // A pinned item carries its raw stored category, not the canonical label.
    const out = byId(
      seedCanvasLayout([mk('a', 'Blue Denim Jacket'), mk('b', 'Skinny Jeans')], W),
    );
    // Jacket → TORSO (upper), Jeans → LEGS (lower).
    const cyA = out.get('a')!.y + out.get('a')!.height / 2;
    const cyB = out.get('b')!.y + out.get('b')!.height / 2;
    expect(cyA).toBeLessThan(cyB);
  });

  it('adapts to canvas size: doubling width doubles the geometry', () => {
    const items = [mk('top', 'Top'), mk('shoe', 'Shoes')];
    const small = byId(seedCanvasLayout(items, W));
    const large = byId(seedCanvasLayout(items, W * 2));
    for (const id of ['top', 'shoe']) {
      expect(large.get(id)!.width).toBeCloseTo(small.get(id)!.width * 2, 5);
      expect(large.get(id)!.x).toBeCloseTo(small.get(id)!.x * 2, 5);
      expect(large.get(id)!.y).toBeCloseTo(small.get(id)!.y * 2, 5);
    }
    expect(large.get('top')!.zIndex).toBe(small.get('top')!.zIndex);
  });

  it('unknown category falls back without crashing', () => {
    const out = seedCanvasLayout([mk('x', 'Mystery Gadget')], W);
    expect(out).toHaveLength(1);
    expect(out[0].width).toBeGreaterThan(0);
  });
});
