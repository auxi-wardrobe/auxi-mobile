module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // SVGs are React components at metro time (react-native-svg-transformer);
    // jest has no such transform, so stub every `.svg` import to a no-op view.
    '\\.svg$': '<rootDir>/__mocks__/svgMock.tsx',
  },
  // The react-native preset's default transformIgnorePatterns only whitelists
  // `react-native` + `@react-native(-community)`. Several RN-ecosystem deps ship
  // untranspiled ESM/TS source (import/export syntax) that Jest then fails to
  // parse — this surfaces on the full-app App.test.tsx render, which imports the
  // whole tree. Extend the whitelist so Babel transforms them. Native bridges
  // these packages expose are separately stubbed in jest.setup.js for any that
  // get *called* at mount; the patterns below only cover *parsing* their source.
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      [
        '(jest-)?react-native',
        '@react-native(-community)?',
        '@react-navigation',
        '@react-native-google-signin',
        '@invertase/react-native-apple-authentication',
        '@sentry/react-native',
        'react-native-localize',
        'react-native-geolocation-service',
        'react-native-image-picker',
        'react-native-gesture-handler',
      ].join('|') +
      ')/)',
  ],
};
