import React from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme/theme';

interface OnboardingSelectionCardProps {
  label: string;
  selected: boolean;
  dimmed?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

interface OnboardingSelectionFigureProps {
  source: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export const OnboardingSelectionCard: React.FC<OnboardingSelectionCardProps> = ({
  label,
  selected,
  dimmed,
  style,
  children,
}) => (
  <View
    style={[
      styles.card,
      selected && styles.cardSelected,
      dimmed && styles.cardDimmed,
      style,
    ]}
  >
    <View style={styles.artwork}>{children}</View>
    <View style={styles.labelSlot}>
      <View style={[styles.labelPill, selected && styles.labelPillSelected]}>
        <Text style={[styles.labelText, selected && styles.labelTextSelected]}>{label}</Text>
      </View>
    </View>
  </View>
);

export const OnboardingSelectionFigure: React.FC<OnboardingSelectionFigureProps> = ({
  source,
  style,
  imageStyle,
}) => (
  <View style={[styles.figureFrame, style]}>
    <Image source={source} resizeMode="cover" style={[styles.figureImage, imageStyle]} />
  </View>
);

const styles = StyleSheet.create({
  card: {
    aspectRatio: 183 / 244,
    backgroundColor: '#DEDEDE',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cardSelected: {
    borderWidth: 4,
    borderColor: theme.colors.figmaAction,
  },
  cardDimmed: {
    opacity: 0.5,
  },
  artwork: {
    ...StyleSheet.absoluteFillObject,
  },
  labelSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  labelPill: {
    minWidth: 69,
    height: 19,
    paddingHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'rgba(39, 42, 50, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelPillSelected: {
    backgroundColor: 'rgba(39, 42, 50, 0.85)',
  },
  labelText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 8,
    lineHeight: 10,
    color: '#87898B',
    textAlign: 'center',
  },
  labelTextSelected: {
    color: theme.colors.white,
  },
  figureFrame: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  figureImage: {
    ...StyleSheet.absoluteFillObject,
  },
});
