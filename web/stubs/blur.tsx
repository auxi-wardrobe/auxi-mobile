import React from 'react';
import { View } from 'react-native';

// CSS-ish frosted fallback for @react-native-community/blur on web.
export const BlurView = ({ children, style }: any) => (
  <View style={[{ backgroundColor: 'rgba(255,255,255,0.55)' }, style]}>
    {children}
  </View>
);
export const VibrancyView = BlurView;
export default BlurView;
