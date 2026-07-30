import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MDivider, MRadio } from '../../../components/design-system/lib';
import { capsuleStyles as s } from '../styles';

interface BuildMethodOptionProps {
  /** Leading glyph (person / sparkle) — 24×24, tinted by the caller. */
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  /** Localized "Coming soon" pill under the description (AI option). */
  badgeLabel?: string;
  /** Hairline under the row (omitted on the last option). */
  divider?: boolean;
  testID: string;
  accessibilityLabel?: string;
}

/**
 * One row of the "Choose how to build your capsule" picker: leading icon,
 * title + description, optional "Coming soon" pill, trailing radio. The whole
 * row is the hit target — the radio mirrors selection, it isn't a second
 * target (so Maestro only ever has one thing to tap per option).
 */
export const BuildMethodOption: React.FC<BuildMethodOptionProps> = ({
  icon,
  title,
  description,
  selected,
  onSelect,
  badgeLabel,
  divider = true,
  testID,
  accessibilityLabel,
}) => (
  <>
    <Pressable
      style={s.methodOption}
      onPress={onSelect}
      testID={selected ? `${testID}-selected` : testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {icon}
      <View style={s.methodOptionBody}>
        <Text style={s.methodOptionTitle}>{title}</Text>
        <Text style={s.methodOptionDesc}>{description}</Text>
        {!!badgeLabel && (
          <View style={s.methodBadge} testID={`${testID}-badge`}>
            <Text style={s.methodBadgeText}>{badgeLabel}</Text>
          </View>
        )}
      </View>
      {/* Presentational: the row above owns the press + a11y semantics. */}
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <MRadio selected={selected} />
      </View>
    </Pressable>
    {divider && <MDivider />}
  </>
);
