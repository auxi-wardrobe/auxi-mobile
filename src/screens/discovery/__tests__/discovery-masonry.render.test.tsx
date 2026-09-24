/**
 * Proves the thing the design asks for end to end: a Discovery cover takes the
 * full column width, and its HEIGHT comes from the aspect ratio the admin
 * uploaded — so two covers of different shapes render at different heights.
 *
 * Renders the real `useDiscoveryMasonry` + `DiscoveryOutfitCard` against a
 * mocked `Image.getSize`, then reads the frame's resolved style. A unit test on
 * the packer alone can't catch a card that quietly re-imposes a fixed height.
 */
import React from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { DiscoveryOutfitCard } from '../DiscoveryOutfitCard';
import { useDiscoveryMasonry } from '../useDiscoveryMasonry';
import { TILE_WIDTH } from '../discovery-grid';
import type { DiscoveryOutfitCard as CardData } from '../../../services/discoveryService';

jest.mock('../../../theme/motion', () => {
  const actual = jest.requireActual('../../../theme/motion');
  return { ...actual, useReducedMotion: () => true };
});

// url -> [pixelWidth, pixelHeight], as the admin uploaded them.
const SIZES: Record<string, [number, number]> = {
  'https://cdn.test/tall.jpg': [800, 1600], // 1:2 portrait
  'https://cdn.test/wide.jpg': [1600, 900], // 16:9 landscape
  'https://cdn.test/square.jpg': [1000, 1000], // 1:1
};

const outfit = (id: string, url: string | null): CardData => ({
  id,
  title: `Outfit ${id}`,
  composite_image_url: url,
  season: null,
  gender: null,
  trend_tags: [],
  item_count: 3,
});

const Harness: React.FC<{ outfits: CardData[] }> = ({ outfits }) => {
  const { columns } = useDiscoveryMasonry(outfits);
  return (
    <View>
      {columns.map((column, columnIndex) => (
        <View key={columnIndex}>
          {column.map(tile => (
            <DiscoveryOutfitCard
              key={tile.item.id}
              outfit={tile.item}
              index={tile.index}
              aspectRatio={tile.ratio}
              onPress={() => {}}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

/** Every rendered cover frame, keyed by the card's outfit title. */
const framesByTitle = (
  renderer: TestRenderer.ReactTestRenderer,
): Record<string, ViewStyle> => {
  const out: Record<string, ViewStyle> = {};
  renderer.root
    .findAll(
      node =>
        typeof node.type !== 'string' &&
        node.type === DiscoveryOutfitCard,
      { deep: true },
    )
    .forEach(card => {
      // The cover frame is the only node in a card carrying an aspectRatio.
      const frame = card.findAll(
        node =>
          (StyleSheet.flatten(node.props.style) as ViewStyle | undefined)
            ?.aspectRatio !== undefined,
        { deep: true },
      )[0];
      out[(card.props.outfit as CardData).title] = StyleSheet.flatten(
        frame.props.style,
      ) as ViewStyle;
    });
  return out;
};

const renderFeed = async (outfits: CardData[]) => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<Harness outfits={outfits} />);
  });
  // Let the getSize callbacks flush into state.
  await act(async () => {});
  return renderer;
};

beforeEach(() => {
  jest
    .spyOn(Image, 'getSize')
    .mockImplementation((uri, success, failure) => {
      const size = SIZES[uri];
      if (size) {
        success(size[0], size[1]);
      } else {
        failure?.(new Error('unsizable'));
      }
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Discovery cover sizing', () => {
  it('gives every cover the full column width', async () => {
    const renderer = await renderFeed([
      outfit('tall', 'https://cdn.test/tall.jpg'),
      outfit('wide', 'https://cdn.test/wide.jpg'),
    ]);

    Object.values(framesByTitle(renderer)).forEach(frame => {
      expect(frame.width).toBe(TILE_WIDTH);
      // The point of the change: no fixed height anywhere on the frame.
      expect(frame.height).toBeUndefined();
      expect(frame.maxHeight).toBeUndefined();
    });
  });

  it('keeps each uploaded ratio, so heights differ per image', async () => {
    const renderer = await renderFeed([
      outfit('tall', 'https://cdn.test/tall.jpg'),
      outfit('wide', 'https://cdn.test/wide.jpg'),
      outfit('square', 'https://cdn.test/square.jpg'),
    ]);
    const frames = framesByTitle(renderer);

    expect(frames['Outfit tall'].aspectRatio).toBeCloseTo(800 / 1600);
    expect(frames['Outfit wide'].aspectRatio).toBeCloseTo(1600 / 900);
    expect(frames['Outfit square'].aspectRatio).toBeCloseTo(1);

    // aspectRatio = width/height and width is fixed, so this IS the height.
    const heights = Object.values(frames).map(
      frame => TILE_WIDTH / (frame.aspectRatio as number),
    );
    expect(new Set(heights).size).toBe(3);
    // The portrait must render taller than the landscape — the visible effect.
    expect(TILE_WIDTH / (frames['Outfit tall'].aspectRatio as number)).toBeGreaterThan(
      TILE_WIDTH / (frames['Outfit wide'].aspectRatio as number),
    );
  });

  it('falls back to 3:4 for a cover that cannot be measured', async () => {
    const renderer = await renderFeed([
      outfit('broken', 'https://cdn.test/404.jpg'),
      outfit('none', null),
    ]);
    const frames = framesByTitle(renderer);

    expect(frames['Outfit broken'].aspectRatio).toBeCloseTo(3 / 4);
    expect(frames['Outfit none'].aspectRatio).toBeCloseTo(3 / 4);
  });
});
