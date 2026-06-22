import { Item } from '../../types/item';
import { GRID_GAP, GRID_FIT_H } from './constants';

export type GridLayout =
  | {
      kind: 'fullPlusSmall';
      full: Item;
      small: Item | null;
    }
  | {
      kind: 'twoRowOneLarge';
      row1: [Item | null, Item | null];
      row2Large: Item | null;
    }
  | {
      kind: 'twoByTwo';
      rows: [[Item | null, Item | null], [Item | null, Item | null]];
    }
  | {
      kind: 'heroStackPlusRows';
      hero: Item;
      stack: [Item, Item];
      rest: Item[];
    };

export const pickLayout = (items: Item[]): GridLayout | null => {
  const filled = items.filter((it): it is Item => !!it);
  const count = filled.length;

  if (count === 0) return null;

  if (count <= 2) {
    return {
      kind: 'fullPlusSmall',
      full: filled[0],
      small: filled[1] ?? null,
    };
  }
  if (count === 3) {
    return {
      kind: 'twoRowOneLarge',
      row1: [filled[0], filled[1]],
      row2Large: filled[2],
    };
  }
  if (count === 4) {
    return {
      kind: 'twoByTwo',
      rows: [
        [filled[0], filled[1]],
        [filled[2], filled[3]],
      ],
    };
  }
  return {
    kind: 'heroStackPlusRows',
    hero: filled[0],
    stack: [filled[1], filled[2]],
    rest: filled.slice(3),
  };
};

export const computeHeroRowHeight = (restCount: number): number => {
  const rows = 1 + Math.ceil(restCount / 3);
  const available = GRID_FIT_H - GRID_GAP;
  return Math.floor((available - (rows - 1) * GRID_GAP) / rows);
};
