/**
 * DatabaseScreen — name search (header search icon, far right).
 *
 * Coverage:
 *  1. header right slot carries the search toggle; field hidden until tapped
 *  2. typing filters the grid by item name (case/diacritic-insensitive)
 *  3. no hits → search-specific empty copy
 *  4. closing search clears the query and restores the full grid
 *  5. a selection made before narrowing survives the filter
 *
 * Patterns follow ItemDetailScreen.test.tsx: react-test-renderer, query by
 * testID, flush microtasks inside act().
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { DatabaseScreen } from '../DatabaseScreen';

jest.mock('@react-navigation/native', () => {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: () => true,
  };
  return {
    useNavigation: () => navigation,
    useIsFocused: () => true,
  };
});

jest.mock('react-i18next', () => {
  const en = require('../../translations/en-EN.json').boilerplate;
  const t = (key: string, opts?: Record<string, unknown>) => {
    const value = key
      .split('.')
      .reduce<unknown>(
        (acc, part) =>
          acc && typeof acc === 'object'
            ? (acc as Record<string, unknown>)[part]
            : undefined,
        en,
      );
    if (typeof value !== 'string') {
      return key;
    }
    return value.replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
      String(opts?.[name] ?? ''),
    );
  };
  const translation = { t };
  return { useTranslation: () => translation };
});

jest.mock('../../services/analytics', () => ({ track: jest.fn() }));

const ITEMS = [
  { id: 'a', name: 'Áo sơ mi trắng', category: 'top', image_url: '' },
  { id: 'b', name: 'Blue Jeans', category: 'bottom', image_url: '' },
  { id: 'c', name: 'White Sneakers', category: 'shoes', image_url: '' },
];

jest.mock('../../services/wardrobeService', () => ({
  wardrobeService: {
    getCommonItems: jest.fn(() => Promise.resolve(ITEMS)),
    cloneCommonItem: jest.fn(),
  },
}));

jest.mock('../../utils/url', () => ({
  resolveItemImageSources: () => [],
}));

const byTestID = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id && typeof n.type !== 'string');
const one = (root: ReactTestInstance, id: string) => {
  const found = byTestID(root, id);
  expect(found.length).toBeGreaterThan(0);
  return found[0];
};
const tileNames = (root: ReactTestInstance) =>
  root
    .findAll(
      n =>
        typeof n.type !== 'string' &&
        typeof n.props?.testID === 'string' &&
        /^database-item-/.test(n.props.testID),
    )
    .map(n => n.props.accessibilityLabel as string)
    .filter((label, i, all) => all.indexOf(label) === i);

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const renderScreen = async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<DatabaseScreen />);
  });
  await flush();
  return renderer.root;
};

describe('DatabaseScreen search', () => {
  it('opens a name search from the header and filters the grid', async () => {
    const root = await renderScreen();
    expect(tileNames(root)).toHaveLength(3);
    expect(byTestID(root, 'database-search-input')).toHaveLength(0);

    await act(async () => {
      one(root, 'database-search-toggle').props.onPress();
    });
    expect(
      byTestID(root, 'database-search-toggle-open').length,
    ).toBeGreaterThan(0);

    await act(async () => {
      one(root, 'database-search-input').props.onChangeText('ao so mi');
    });
    expect(tileNames(root)).toEqual(['Áo sơ mi trắng']);

    await act(async () => {
      one(root, 'database-search-input').props.onChangeText('WHITE sneak');
    });
    expect(tileNames(root)).toEqual(['White Sneakers']);
  });

  it('shows search-specific empty copy and restores the grid on close', async () => {
    const root = await renderScreen();
    await act(async () => {
      one(root, 'database-search-toggle').props.onPress();
    });
    await act(async () => {
      one(root, 'database-search-input').props.onChangeText('tuxedo');
    });
    expect(tileNames(root)).toHaveLength(0);
    const empty = root.findAll(
      n =>
        typeof n.type === 'string' && n.props.testID === 'database-empty-state',
    )[0];
    expect(empty.props.children).toBe('No items match “tuxedo”');

    await act(async () => {
      one(root, 'database-search-toggle-open').props.onPress();
    });
    expect(byTestID(root, 'database-search-input')).toHaveLength(0);
    expect(tileNames(root)).toHaveLength(3);
  });

  it('keeps a selection made before narrowing the results', async () => {
    const root = await renderScreen();
    await act(async () => {
      one(root, 'database-item-b').props.onPress();
    });
    await act(async () => {
      one(root, 'database-search-toggle').props.onPress();
    });
    await act(async () => {
      one(root, 'database-search-input').props.onChangeText('jeans');
    });
    expect(byTestID(root, 'database-select-check-b').length).toBeGreaterThan(0);
    expect(one(root, 'database-add-items-submit').props.disabled).toBe(false);
  });
});
