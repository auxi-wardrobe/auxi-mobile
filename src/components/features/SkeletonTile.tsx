/**
 * AU-307 phase 04 — Skeleton tile rendered in non-pinned outfit slots while
 * the pin-driven `/build` (or `/try_another`) request is in flight, and, via
 * `LoadableRemoteImage`, over every card image across the app until it loads.
 *
 * Matches the dims of the `GarmentPreview` tile exactly so the swap to the real
 * tile on success doesn't shift layout. The loading motion is the shared
 * `Shimmer` sweep — a cream (#f2efec) highlight travelling across a tan
 * (#e0d2c4) base — so all card loading states read as one language. Halted on a
 * static base frame under OS "Reduce Motion" (handled by `Shimmer`).
 */
import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '../../theme/theme';
import { Shimmer } from './Shimmer';

export interface SkeletonTileProps {
  width?: number;
  height?: number;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const SkeletonTile: React.FC<SkeletonTileProps> = ({
  width,
  height,
  style,
  testID = 'skeleton-tile',
}) => (
  <Shimmer
    width={width}
    height={height}
    style={[styles.tile, ...(Array.isArray(style) ? style : style ? [style] : [])]}
    testID={testID}
  />
);

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
  },
});

export default SkeletonTile;
