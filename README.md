# auxi

`auxi` is a React Native app for contextual outfit recommendations, personal wardrobe management, and virtual try-on generation from body photos. This repository contains the mobile client for the authentication, onboarding, recommendation, wardrobe, and try-on flows.

## Key Features

- Sign up, sign in, and store access tokens securely with `react-native-keychain`.
- New-user onboarding flow: welcome screen, location permission, style preference selection, and initial setup completion.
- Outfit recommendations on the Home screen, including location access for weather-based logic and the ability to save favorite looks.
- Wardrobe management: browse items, filter by category, add photos from camera or gallery, and edit item metadata in the detail screen.
- Body photo management and virtual try-on generation for a selected outfit.
- User settings: daily reminder, style direction, and preference reset.

## Tech Stack

- React Native `0.83.1`
- React `19`
- TypeScript
- React Navigation
- TanStack Query
- Axios
- `react-native-image-picker`
- `react-native-geolocation-service`
- `react-native-keychain`
- `react-native-svg`
- `react-native-toast-message`

## Environment Requirements

- Node.js `>= 20`
- npm or yarn
- Xcode + CocoaPods for iOS
- Android Studio + Android SDK for Android
- A local backend API running on port `5001`

## Installation

Install JavaScript dependencies:

```bash
npm install
```

Or:

```bash
yarn install
```

### iOS Setup

```bash
bundle install
cd ios
bundle exec pod install
cd ..
```

### Start Metro

```bash
npm start
```

### Run the App

Android:

```bash
npm run android
```

iOS:

```bash
npm run ios
```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm start` | Start the Metro bundler |
| `npm run android` | Build and run the app on Android |
| `npm run ios` | Build and run the app on iOS |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest |
| `yarn ios:sim` | Open the iOS Simulator and run the iOS build (this script internally uses `yarn`) |

## Backend Configuration

The app currently calls the API through hardcoded constants in:

- `src/services/apiClient.ts`
- `src/services/auth.ts`

By default, the code points to:

- `http://localhost:5001`

Notes:

- iOS Simulator usually works with `http://localhost:5001`.
- Android Emulator should use `http://10.0.2.2:5001` when the backend runs on your local machine.
- For a physical device, use the LAN IP address of the machine running the backend.
- The `.env` file currently contains `API_URL=http://localhost:5001`, but the current service layer does not read that value yet.

## Main Folder Structure

```text
.
├── android/              # Native Android project
├── ios/                  # Native iOS project
├── src/
│   ├── assets/           # Images, icons, SVG files
│   ├── components/       # UI components
│   ├── context/          # Auth context
│   ├── navigation/       # Navigation stacks
│   ├── screens/          # Main screens
│   ├── services/         # API and service layer
│   ├── theme/            # Theme and typography
│   ├── translations/     # i18n resources
│   ├── types/            # Type definitions
│   └── utils/            # Utility functions
├── docs/                 # Additional documentation
└── docs_agent/           # Backend docs, flows, and model references
```

## Related Documentation

- `docs_agent/API_DOCUMENTATION.md`: full backend API documentation.
- `docs_agent/MODELS_DOCUMENTATION.md`: backend models and field definitions.
- `docs_agent/QUICK_REFERENCE.md`: quick endpoint and flow reference.
- `docs/ICONS.md`: notes about icons and assets.

If you are changing the service layer or integrating a new backend contract, read `docs_agent/` first to avoid mismatched API assumptions.

## Quick Smoke Test

- Launch the app and sign up or sign in.
- If this is a new user, complete onboarding to enter the main app flow.
- Open Home to verify the recommendation flow.
- Open Wardrobe to verify item loading and image upload.
- Open Body to test body image upload and try-on generation.

## Common Issues

- The app cannot reach the API: verify whether you should use `localhost`, `10.0.2.2`, or your LAN IP.
- iOS build fails after adding a native package: run `bundle exec pod install` again inside the `ios/` directory.
- `ios:sim` does not work: that script depends on `yarn`, so install yarn or open Simulator manually and use `npm run ios`.
