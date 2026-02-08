---
description: Complete procedure to install and run the React Native app smoothly.
---

To maintain a professional workflow and avoid common bugs in this project, follow these steps:

### 1. Initial Setup or Fresh Start (Clean Install)

If you have just pulled new code or are experiencing dependency issues:
// turbo

1. `yarn install` (in the root directory)
2. `cd template && yarn install` (since this project uses a template structure)
3. `yarn pod-install` (to install iOS dependencies)

### 2. Daily Development Launch

Open 2 Terminal windows:

**Terminal 1: Run Metro Bundler**
// turbo

1. `yarn start --reset-cache`

**Terminal 2: Run App on Device/Simulator**
// turbo

1. `yarn ios` (for iPhone) or `yarn android` (for Android)

### 3. Workflow for Adding New Libraries (Important!)

Every time you run `yarn add <library-name>`, remember:
// turbo

1. `yarn pod-install`
2. Stop the running app and rerun `yarn ios` or `yarn android` to rebuild the native "shell".

### 4. Handling "Strange" Errors (The Miracle Fix)

If the app doesn't update code or crashes unexpectedly:
// turbo

1. Stop Metro Bundler (Ctrl+C)
2. `yarn start --reset-cache`
3. (iOS) `cd ios && rm -rf build && pod install && cd ..`
4. Rebuild the app.

### 5. Check Code Quality before Commit

// turbo

1. `yarn lint`
