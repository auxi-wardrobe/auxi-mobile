# Infrastructure Learning Tasks - auxi-mobile

Use these tasks in Linear to learn about the auxi-mobile infrastructure. Each task is designed to help you understand a specific component of the system.

---

## Level 1: Build Configuration (Beginner)

### Task 1.1: Understand Metro Bundler
**Priority:** High | **Estimate:** 1 hour

**Description:**
Read and understand how Metro bundler is configured for this React Native project.

**Acceptance Criteria:**
- [ ] Read `metro.config.js` and understand each configuration option
- [ ] Understand how SVG files are transformed using `react-native-svg-transformer`
- [ ] Document what `getDefaultConfig()` returns and how we extend it
- [ ] Try modifying the config (add a new asset extension) and observe the effect

**Files to study:**
- `metro.config.js`

---

### Task 1.2: Understand Babel Configuration
**Priority:** High | **Estimate:** 30 minutes

**Description:**
Learn how Babel transpiles JavaScript/TypeScript in the project.

**Acceptance Criteria:**
- [ ] Read `babel.config.js` and understand the preset used
- [ ] Research what `@react-native/babel-preset` includes
- [ ] Understand how `babel-plugin-module-resolver` enables path aliases
- [ ] Check `tsconfig.json` for path alias configuration

**Files to study:**
- `babel.config.js`
- `tsconfig.json`

---

### Task 1.3: Understand TypeScript Configuration
**Priority:** Medium | **Estimate:** 30 minutes

**Description:**
Learn how TypeScript is configured for the project.

**Acceptance Criteria:**
- [ ] Read `tsconfig.json` and understand each option
- [ ] Research what `@react-native/typescript-config` extends provides
- [ ] Understand why Jest types are explicitly included
- [ ] Try adding a type error and verify TypeScript catches it

**Files to study:**
- `tsconfig.json`
- `package.json` (devDependencies for TypeScript)

---

## Level 2: Package Management (Beginner)

### Task 2.1: Analyze Dependencies
**Priority:** High | **Estimate:** 1 hour

**Description:**
Understand the project's dependency structure and key packages.

**Acceptance Criteria:**
- [ ] Review `package.json` and categorize dependencies by purpose:
  - Navigation
  - State management
  - HTTP client
  - Security
  - UI components
- [ ] Understand the difference between `dependencies` vs `devDependencies`
- [ ] Research why specific versions are pinned vs using ranges
- [ ] Document the Node version requirement (>= 20)

**Files to study:**
- `package.json`

---

### Task 2.2: Understand Ruby/CocoaPods for iOS
**Priority:** Medium | **Estimate:** 45 minutes

**Description:**
Learn how Ruby and CocoaPods manage iOS native dependencies.

**Acceptance Criteria:**
- [ ] Read `Gemfile` and understand Ruby version requirements
- [ ] Understand what CocoaPods does and why it's needed
- [ ] Read `ios/Podfile` and understand pod dependencies
- [ ] Learn the relationship between npm packages and native pods

**Files to study:**
- `Gemfile`
- `Gemfile.lock`
- `ios/Podfile`
- `.bundle/config`

---

## Level 3: Native Platform Configuration (Intermediate)

### Task 3.1: Understand Android Build Configuration
**Priority:** High | **Estimate:** 1.5 hours

**Description:**
Learn how Android builds are configured using Gradle.

**Acceptance Criteria:**
- [ ] Read `android/build.gradle` and understand project-level config
- [ ] Read `android/app/build.gradle` and understand:
  - Application ID and versioning
  - SDK versions (compile, target, min)
  - Build types (debug vs release)
  - Signing configurations
- [ ] Read `android/gradle.properties` and understand:
  - JVM memory settings
  - New Architecture flag
  - Hermes engine flag
  - Multi-architecture support

**Files to study:**
- `android/build.gradle`
- `android/app/build.gradle`
- `android/gradle.properties`

---

### Task 3.2: Understand iOS Project Structure
**Priority:** Medium | **Estimate:** 1 hour

**Description:**
Learn how the iOS project is structured and configured.

**Acceptance Criteria:**
- [ ] Understand the iOS folder structure
- [ ] Read `ios/Podfile` and understand pod configuration
- [ ] Understand `.xcode.env` and Node binary resolution
- [ ] Learn how React Native links to native iOS modules

**Files to study:**
- `ios/Podfile`
- `ios/.xcode.env`

---

### Task 3.3: Understand Hermes JavaScript Engine
**Priority:** Medium | **Estimate:** 45 minutes

**Description:**
Learn about Hermes and why it's used as the JavaScript engine.

**Acceptance Criteria:**
- [ ] Research what Hermes is and its benefits
- [ ] Find where Hermes is enabled in the configuration
- [ ] Understand the difference between Hermes and JSC (JavaScriptCore)
- [ ] Learn about bytecode precompilation benefits

**References:**
- `android/gradle.properties` (hermesEnabled=true)
- React Native documentation on Hermes

---

## Level 4: State Management (Intermediate)

### Task 4.1: Understand Auth Context
**Priority:** High | **Estimate:** 1.5 hours

**Description:**
Learn how authentication state is managed using React Context.

**Acceptance Criteria:**
- [ ] Read `src/context/AuthContext.tsx` thoroughly
- [ ] Understand the state shape: `user`, `isLoading`
- [ ] Trace through each method:
  - `login()` - How credentials are handled
  - `logout()` - How tokens are cleared
  - `checkAuth()` - How auth is verified on app load
  - `refreshUser()` - How user data is fetched
- [ ] Understand how `react-native-keychain` stores tokens securely

**Files to study:**
- `src/context/AuthContext.tsx`
- `src/services/auth.ts`

---

### Task 4.2: Understand TanStack Query Setup
**Priority:** High | **Estimate:** 1 hour

**Description:**
Learn how server state is managed using TanStack Query (React Query).

**Acceptance Criteria:**
- [ ] Find where QueryClient is created and provided
- [ ] Understand query caching and invalidation
- [ ] Find examples of useQuery usage in screens
- [ ] Document the benefits over manual fetch + useState

**Files to study:**
- `App.tsx` (QueryClientProvider)
- `src/screens/HomeScreen.tsx` (query usage example)

---

## Level 5: API & Services (Intermediate)

### Task 5.1: Understand API Client Architecture
**Priority:** High | **Estimate:** 1.5 hours

**Description:**
Learn how HTTP requests are structured and authenticated.

**Acceptance Criteria:**
- [ ] Read `src/services/apiClient.ts` and understand:
  - Base URL configuration per platform
  - Axios interceptors for token injection
  - Error handling patterns
- [ ] Understand how tokens are retrieved from Keychain
- [ ] Trace a full API request lifecycle

**Files to study:**
- `src/services/apiClient.ts`
- `src/services/auth.ts`

---

### Task 5.2: Map All Services
**Priority:** Medium | **Estimate:** 1 hour

**Description:**
Create a service map documenting all API services.

**Acceptance Criteria:**
- [ ] List all services in `src/services/`
- [ ] For each service, document:
  - Purpose
  - Endpoints used
  - Methods exposed
- [ ] Identify common patterns across services

**Files to study:**
- `src/services/itemService.ts`
- `src/services/wardrobeService.ts`
- `src/services/bodyService.ts`
- `src/services/tryOnService.ts`
- `src/services/favouriteService.ts`
- `src/services/recommendationService.ts`

---

## Level 6: Navigation (Intermediate)

### Task 6.1: Understand Navigation Architecture
**Priority:** High | **Estimate:** 1 hour

**Description:**
Learn how React Navigation is structured in the app.

**Acceptance Criteria:**
- [ ] Read `src/navigation/AppNavigator.tsx`
- [ ] Understand conditional navigation based on auth state
- [ ] Map out all navigation stacks:
  - Auth stack (login, register)
  - Onboarding stack (welcome, permissions, preferences)
  - Main app stack (home, wardrobe, etc.)
- [ ] Understand screen options and transitions

**Files to study:**
- `src/navigation/AppNavigator.tsx`
- `src/navigation/AuthNavigator.tsx`

---

## Level 7: Testing Infrastructure (Intermediate)

### Task 7.1: Understand Jest Configuration
**Priority:** Medium | **Estimate:** 45 minutes

**Description:**
Learn how testing is configured in the project.

**Acceptance Criteria:**
- [ ] Read `jest.config.js` and understand the preset
- [ ] Run existing tests with `npm test`
- [ ] Read `__tests__/App.test.tsx` to understand test structure
- [ ] Write a simple component test

**Files to study:**
- `jest.config.js`
- `__tests__/App.test.tsx`

---

## Level 8: Code Quality (Beginner)

### Task 8.1: Understand Linting Setup
**Priority:** Low | **Estimate:** 30 minutes

**Description:**
Learn how ESLint and Prettier maintain code quality.

**Acceptance Criteria:**
- [ ] Read `.eslintrc.js` configuration
- [ ] Read `.prettierrc.js` configuration
- [ ] Run `npm run lint` and understand output
- [ ] Configure your IDE to auto-lint/format

**Files to study:**
- `.eslintrc.js`
- `.prettierrc.js`

---

## Level 9: Documentation (Beginner)

### Task 9.1: Review Backend API Documentation
**Priority:** High | **Estimate:** 2 hours

**Description:**
Study the backend API documentation to understand available endpoints.

**Acceptance Criteria:**
- [ ] Read `docs_agent/API_DOCUMENTATION.md`
- [ ] Read `docs_agent/QUICK_REFERENCE.md`
- [ ] Understand authentication flow
- [ ] Map frontend services to backend endpoints

**Files to study:**
- `docs_agent/API_DOCUMENTATION.md`
- `docs_agent/MODELS_DOCUMENTATION.md`
- `docs_agent/QUICK_REFERENCE.md`

---

## Level 10: Advanced Infrastructure (Advanced)

### Task 10.1: Set Up CI/CD Pipeline
**Priority:** Low | **Estimate:** 4 hours

**Description:**
Create a CI/CD pipeline using GitHub Actions.

**Acceptance Criteria:**
- [ ] Create `.github/workflows/ci.yml`
- [ ] Configure jobs for:
  - Lint checking
  - TypeScript type checking
  - Running tests
  - Building Android APK (optional)
- [ ] Test the pipeline on a PR

**Note:** This is currently missing from the project and would be a valuable addition.

---

### Task 10.2: Add Environment Configuration
**Priority:** Medium | **Estimate:** 2 hours

**Description:**
Externalize configuration using environment variables.

**Acceptance Criteria:**
- [ ] Add `react-native-config` package
- [ ] Create `.env.example` with required variables
- [ ] Move hardcoded API URLs to environment variables
- [ ] Update `apiClient.ts` to use env config

---

## Summary

| Level | Focus Area | Tasks | Est. Total Time |
|-------|------------|-------|-----------------|
| 1 | Build Config | 3 | 2 hours |
| 2 | Package Mgmt | 2 | 1.75 hours |
| 3 | Native Platforms | 3 | 3.25 hours |
| 4 | State Mgmt | 2 | 2.5 hours |
| 5 | API Services | 2 | 2.5 hours |
| 6 | Navigation | 1 | 1 hour |
| 7 | Testing | 1 | 0.75 hours |
| 8 | Code Quality | 1 | 0.5 hours |
| 9 | Documentation | 1 | 2 hours |
| 10 | Advanced | 2 | 6 hours |

**Total: 18 tasks, ~22 hours of learning**

---

## Recommended Learning Path

1. **Week 1:** Levels 1-2 (Build & Package basics)
2. **Week 2:** Levels 3-4 (Native platforms & State management)
3. **Week 3:** Levels 5-6 (API services & Navigation)
4. **Week 4:** Levels 7-10 (Testing, Quality, Docs, Advanced)

---

*Created for infrastructure onboarding. Use these tasks in Linear to track your progress.*
