---
description: Clear all caches, node_modules, and reinstall all dependencies.
---

Use this workflow when the project encounters severe library errors or when you want to clean your environment.

**WARNING:** This process will take time as it downloads all libraries again.

### Steps to execute:

1. Stop all running Metro Bundler and Terminal processes.

### Cleanup JavaScript

// turbo 2. `rm -rf node_modules` 3. `rm -rf template/node_modules` 4. `yarn cache clean`

### Cleanup iOS (Native)

// turbo 5. `cd template/ios && rm -rf Pods Podfile.lock build && cd ..`

### Reinstallation

// turbo 6. `yarn install` 7. `cd template && yarn install` 8. `yarn pod-install`

### Restart

// turbo 9. `yarn start --reset-cache`
