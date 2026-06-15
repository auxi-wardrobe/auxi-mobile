import { computeSnapOffsets, SnapOffsetGroup } from '../snap-offsets';

describe('computeSnapOffsets (AU-347)', () => {
  const groups: SnapOffsetGroup[] = [
    { dayKey: 'd1', ids: ['a', 'b'] },
    { dayKey: 'd2', ids: ['c'] },
  ];

  it('sums group + card offsets into an ascending list', () => {
    const groupY = { d1: 0, d2: 500 };
    const cardY = { a: 30, b: 280, c: 30 };
    expect(computeSnapOffsets(groups, groupY, cardY)).toEqual([30, 280, 530]);
  });

  it('skips cards/groups not yet measured (grows as layout settles)', () => {
    expect(computeSnapOffsets(groups, { d1: 0 }, { a: 30 })).toEqual([30]);
  });

  it('returns empty when nothing is measured', () => {
    expect(computeSnapOffsets(groups, {}, {})).toEqual([]);
  });

  it('dedupes identical offsets and stays sorted', () => {
    const groupY = { d1: 0, d2: 0 };
    const cardY = { a: 10, b: 10, c: 10 };
    expect(computeSnapOffsets(groups, groupY, cardY)).toEqual([10]);
  });
});
