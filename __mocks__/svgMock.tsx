import React from 'react';
import { View } from 'react-native';

// Stub for `*.svg` imports under jest. The metro-time
// react-native-svg-transformer turns SVGs into React components; jest
// has no such transform, so map every `.svg` to this no-op view.
const SvgMock = (props: Record<string, unknown>) => <View {...props} />;

export default SvgMock;
