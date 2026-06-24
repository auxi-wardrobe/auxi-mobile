/**
 * MAvatar — self-contained avatar (image · initials · icon fallback).
 *
 *   import { MAvatar } from '../components/design-system/lib';
 *   <MAvatar size="lg" initials="MG" />
 *   <MAvatar size="sm" source={{ uri }} />
 *   <MAvatar size="sm" />            // user-icon fallback
 *
 * Tokens encapsulated INSIDE.
 */
import React from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icons } from '../../../assets/icons';
import { color, role, type } from '../m-tokens';

const IconUser = Icons.User;

export interface MAvatarProps {
  size?: 'lg' | 'sm';
  initials?: string;
  source?: ImageSourcePropType;
  testID?: string;
  accessibilityLabel?: string;
}

export const MAvatar: React.FC<MAvatarProps> = ({
  size = 'sm',
  initials,
  source,
  testID,
  accessibilityLabel,
}) => {
  const lg = size === 'lg';
  const base = lg ? styles.avLg : styles.avSm;
  if (source) {
    return (
      <Image
        source={source}
        style={[base, styles.img]}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }
  if (initials) {
    return (
      <View
        style={base}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={lg ? styles.avLgText : styles.avSmText}>{initials}</Text>
      </View>
    );
  }
  return (
    <View
      style={[base, styles.fallback]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    >
      <IconUser width={lg ? 40 : 22} height={lg ? 40 : 22} color={color.p50} />
    </View>
  );
};

const styles = StyleSheet.create({
  avLg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: role.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avSm: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: role.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avLgText: { fontFamily: type.h1.fontFamily, fontSize: 30, color: color.p50 },
  avSmText: { fontFamily: type.h3.fontFamily, fontSize: 16, color: color.p50 },
  fallback: { backgroundColor: color.p400 },
  img: { resizeMode: 'cover' },
});
