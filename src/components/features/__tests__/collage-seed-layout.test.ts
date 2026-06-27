import { seedCanvasLayout, CollageSeedItem } from '../collage-seed-layout';

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

  it('STABILITY: adding an accessory leaves every garment fixed', () => {
    const base = byId(
      seedCanvasLayout([mk('jkt', 'Jacket'), mk('tee', 'Top'), mk('jean', 'Jeans')], W),
    );
    const withAcc = byId(
      seedCanvasLayout(
        [mk('jkt', 'Jacket'), mk('tee', 'Top'), mk('jean', 'Jeans'), mk('cap', 'Hat'), mk('sh', 'Shoes')],
        W,
      ),
    );
    for (const id of ['jkt', 'tee', 'jean']) {
      expect(cx(withAcc.get(id)!)).toBeCloseTo(cx(base.get(id)!), 5);
      expect(cy(withAcc.get(id)!)).toBeCloseTo(cy(base.get(id)!), 5);
    }
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
