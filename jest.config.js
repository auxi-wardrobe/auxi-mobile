module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // SVGs are React components at metro time (react-native-svg-transformer);
    // jest has no such transform, so stub every `.svg` import to a no-op view.
    '\\.svg$': '<rootDir>/__mocks__/svgMock.tsx',
  },
};
