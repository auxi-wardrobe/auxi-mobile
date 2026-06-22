# Phase 01 — Bootstrap Web

**Goal:** Stand up the Vite + react-native-web build target so a trivial RN
component renders in a browser inside a phone-shaped frame, with the navigation
factory and SVG import path in place. This phase de-risks the whole project: if
Vite cannot bundle the RN dependency set, decide the fallback here.

**Prereq:** none (first phase). Spec: `spec.md` §4, §5.1, §5.3, §5.7.

**Verification spine:** there is no unit-test harness for web bundling — the
"test" for each task is the dev server rendering and a Playwright/manual browser
check. That is the same loop the project ultimately wants.

---

### Task 1: Vite scaffold + trivial RNW render (RISK GATE)

**Files:**
- Modify: `package.json` (add deps + scripts)
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `index.web.tsx`
- Create: `tsconfig.web.json`
- Create: `web/HelloWeb.tsx` (throwaway proof component, deleted in Task 4)

**Interfaces:**
- Produces: `yarn web:dev` boots a Vite server on `:5173`; `index.web.tsx` is the
  web entry that later phases extend.

- [ ] **Step 1: Install web dependencies**

```bash
yarn add react-native-web react-dom@19
yarn add -D vite @vitejs/plugin-react @types/react-dom vite-plugin-react-native-svg-transformer
yarn add @react-navigation/stack
```

- [ ] **Step 2: Add web scripts to `package.json`**

In the `"scripts"` block add:

```json
"web:dev": "vite",
"web:build": "vite build",
"web:preview": "vite preview"
```

- [ ] **Step 3: Create `tsconfig.web.json`**

```json
{
  "extends": "@react-native/typescript-config",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "moduleResolution": "Bundler",
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["index.web.tsx", "web", "src"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgrn from 'vite-plugin-react-native-svg-transformer';

export default defineConfig({
  plugins: [react(), svgrn()],
  define: {
    // RN code reads __DEV__; RNW expects browser globals.
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(
      process.env.NODE_ENV || 'development',
    ),
  },
  resolve: {
    alias: { 'react-native': 'react-native-web' },
    // .web.* wins on web; Metro never sees these extensions.
    extensions: [
      '.web.tsx', '.web.ts', '.web.jsx', '.web.js',
      '.tsx', '.ts', '.jsx', '.js', '.json',
    ],
  },
  optimizeDeps: {
    esbuildOptions: {
      // Some RN community libs ship JSX inside .js files.
      loader: { '.js': 'jsx' },
      define: { global: 'globalThis' },
    },
  },
  server: { port: 5173 },
});
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>auxi · web review</title>
    <style>
      html, body, #root { height: 100%; margin: 0; }
      #root { display: flex; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.web.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `web/HelloWeb.tsx` (throwaway proof)**

```tsx
import React from 'react';
import { View, Text } from 'react-native';

export const HelloWeb = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <Text testID="hello-web" style={{ fontSize: 24 }}>
      react-native-web is alive
    </Text>
  </View>
);
```

- [ ] **Step 7: Create `index.web.tsx`**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelloWeb } from './web/HelloWeb';

const root = createRoot(document.getElementById('root')!);
root.render(<HelloWeb />);
```

- [ ] **Step 8: Run the dev server and verify render**

Run: `yarn web:dev` then open `http://localhost:5173`.
Expected: page shows "react-native-web is alive".

**RISK GATE — if the build throws a parse error from a node_modules RN package**
(typically Flow syntax): first try stubbing that package via a `.web` shim or a
`resolve.alias` to an empty module if the trivial render doesn't need it. If the
core `react-native-web` / `react-native-svg` / `react-native-safe-area-context`
set cannot be made to bundle under Vite after reasonable effort, **STOP and
switch the bundler to the fallback**: Expo web (`npx expo install
react-native-web @expo/metro-runtime` + `expo start --web`) or webpack +
`babel-preset-expo`. Record the decision in this file before continuing.

- [ ] **Step 9: Commit**

```bash
git add package.json yarn.lock vite.config.ts index.html index.web.tsx tsconfig.web.json web/HelloWeb.tsx
git commit -m "feat(web): bootstrap vite + react-native-web target"
```

---

### Task 2: Navigation factory (native-stack → JS stack on web)

**Files:**
- Create: `src/navigation/createStack.ts`
- Create: `src/navigation/createStack.web.ts`
- Modify: `src/navigation/AppNavigator.tsx:5,34` (import + usage)
- Modify: `src/navigation/AuthNavigator.tsx:16,34` (import + usage)

**Interfaces:**
- Produces: `createAppStack<T>()` returning a `{ Navigator, Screen }` pair with
  the same API both navigators already use (`<Stack.Navigator screenOptions>` +
  `<Stack.Screen name component>`).

- [ ] **Step 1: Create `src/navigation/createStack.ts` (native — unchanged behavior)**

```ts
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Native keeps the native-stack. The generic is passed through so route params
// stay type-checked at the call site.
export function createAppStack<T extends object>() {
  return createNativeStackNavigator<T>();
}
```

- [ ] **Step 2: Create `src/navigation/createStack.web.ts` (web — JS stack)**

```ts
import { createStackNavigator } from '@react-navigation/stack';

// Web uses the JS stack (@react-navigation/native-stack has no web support).
// Same { Navigator, Screen } shape; `headerShown:false` is honored by both.
export function createAppStack<T extends object>() {
  return createStackNavigator<T>();
}
```

- [ ] **Step 3: Swap the import in `AppNavigator.tsx`**

Replace line 5:
```ts
import { createNativeStackNavigator } from '@react-navigation/native-stack';
```
with:
```ts
import { createAppStack } from './createStack';
```
Replace line 34:
```ts
const Stack = createNativeStackNavigator<AppStackParamList>();
```
with:
```ts
const Stack = createAppStack<AppStackParamList>();
```

- [ ] **Step 4: Swap the import in `AuthNavigator.tsx`**

Replace line 16 (`createNativeStackNavigator` import) with
`import { createAppStack } from './createStack';` and line 34 with
`const Stack = createAppStack<AuthStackParamList>();`.

- [ ] **Step 5: Verify mobile stays green**

Run: `npx tsc --noEmit`
Expected: no NEW errors (legacy `_HomeScreen.tsx` errors only).

- [ ] **Step 6: Commit**

```bash
git add src/navigation/createStack.ts src/navigation/createStack.web.ts src/navigation/AppNavigator.tsx src/navigation/AuthNavigator.tsx
git commit -m "feat(web): platform navigation factory (native-stack / js-stack)"
```

---

### Task 3: SVG import works on web

**Files:**
- Create: `web/svg-smoke.tsx` (throwaway; deleted in Task 4)

**Interfaces:**
- Consumes: the `vite-plugin-react-native-svg-transformer` added in Task 1.
- Produces: confirmation that `import Icon from '../src/assets/.../*.svg'` renders.

- [ ] **Step 1: Pick a real existing icon and render it**

Find one with: `ls src/assets/icons | head`. Then create `web/svg-smoke.tsx`
importing it (replace `icon_foo` with a real filename):

```tsx
import React from 'react';
import { View } from 'react-native';
import IconFoo from '../src/assets/icons/icon_foo.svg';

export const SvgSmoke = () => (
  <View testID="svg-smoke">
    <IconFoo width={48} height={48} />
  </View>
);
```

- [ ] **Step 2: Temporarily render it and verify**

Point `index.web.tsx` at `SvgSmoke`, run `yarn web:dev`, confirm the icon
renders (a visible SVG, no console error). Revert `index.web.tsx` after.

Expected: SVG draws. **If it fails**, fall back to a custom Vite plugin using
`@svgr/core` with `{ native: true }` (outputs `react-native-svg` components) and
re-test. Record which path worked in this file.

- [ ] **Step 3: Commit (only if a config change was needed)**

```bash
git add vite.config.ts
git commit -m "chore(web): confirm svg import path"
```

---

### Task 4: Device frame + render a real screen primitive

**Files:**
- Create: `web/device-frame/DeviceFrame.tsx`
- Modify: `index.web.tsx` (wrap content in the frame)
- Delete: `web/HelloWeb.tsx`, `web/svg-smoke.tsx`

**Interfaces:**
- Produces: `<DeviceFrame>{children}</DeviceFrame>` — a 390×844 centered phone
  frame with a full-bleed toggle, used by `index.web.tsx` in every later phase.

- [ ] **Step 1: Create `web/device-frame/DeviceFrame.tsx`**

```tsx
import React, { useState } from 'react';

const FRAME = { width: 390, height: 844 };

export const DeviceFrame: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [bleed, setBleed] = useState(false);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', background: '#1c1c1e', padding: 16, gap: 12 }}>
      <button data-testid="frame-bleed-toggle" onClick={() => setBleed(b => !b)}
        style={{ alignSelf: 'flex-end' }}>
        {bleed ? 'Phone frame' : 'Full bleed'}
      </button>
      <div style={{
        width: bleed ? '100%' : FRAME.width,
        height: bleed ? '100%' : FRAME.height,
        overflow: 'hidden', background: '#fff',
        borderRadius: bleed ? 0 : 44,
        boxShadow: bleed ? 'none' : '0 8px 40px rgba(0,0,0,0.5)',
        display: 'flex' }}>
        {children}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Update `index.web.tsx` to use the frame around HelloWeb one last time**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { View, Text } from 'react-native';
import { DeviceFrame } from './web/device-frame/DeviceFrame';

const root = createRoot(document.getElementById('root')!);
root.render(
  <DeviceFrame>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text testID="frame-smoke">framed</Text>
    </View>
  </DeviceFrame>,
);
```

- [ ] **Step 3: Verify, then delete throwaways**

Run `yarn web:dev`; confirm "framed" appears inside a phone-shaped frame and the
toggle switches to full-bleed. Then:

```bash
rm web/HelloWeb.tsx web/svg-smoke.tsx
```

- [ ] **Step 4: Commit**

```bash
git add index.web.tsx web/device-frame/DeviceFrame.tsx
git rm web/HelloWeb.tsx web/svg-smoke.tsx
git commit -m "feat(web): device frame wrapper"
```

---

**Phase 1 done when:** `yarn web:dev` renders a framed RN component in the
browser, SVG imports work, the nav factory is in place, and `npx tsc --noEmit`
shows no new mobile errors.
