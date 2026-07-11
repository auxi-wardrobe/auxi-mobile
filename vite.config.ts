import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { reactNativeSvg } from './web/svg-plugin';

const stub = (p: string) => path.resolve(process.cwd(), p);

// React Native resolves `require('x.png')` to a density variant (`x@3x.png`).
// Several assets ship ONLY as `@3x` (e.g. the weather icons), which a plain web
// bundler can't find — the import path has no matching file on disk. Map any
// relative image import whose plain file is missing to its `@Nx` variant so the
// web preview builds the same asset RN/Metro would pick.
const IMG_EXT = /\.(png|jpe?g|gif|webp)$/i;
function reactNativeAssetSuffix() {
  return {
    name: 'rn-asset-density-suffix',
    enforce: 'pre' as const,
    resolveId(source: string, importer?: string) {
      if (!importer || !source.startsWith('.') || !IMG_EXT.test(source)) {
        return null;
      }
      const absPlain = path.resolve(
        path.dirname(importer.split('?')[0]),
        source,
      );
      if (fs.existsSync(absPlain)) {
        return null; // plain file exists — let Vite handle it normally
      }
      for (const suffix of ['@3x', '@2x', '@1x']) {
        const candidate = absPlain.replace(IMG_EXT, m => `${suffix}${m}`);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [reactNativeAssetSuffix(), reactNativeSvg(), react()],
  define: {
    __DEV__: 'false',
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'react-native-keychain': stub('web/stubs/native-noop.ts'),
      'react-native-image-picker': stub('web/stubs/image-picker.ts'),
      '@react-native-community/blur': stub('web/stubs/blur.tsx'),
      'react-native-geolocation-service': stub('web/stubs/geolocation.ts'),
      '@invertase/react-native-apple-authentication': stub('web/stubs/apple-auth.ts'),
      '@react-native-google-signin/google-signin': stub('web/stubs/google-signin.ts'),
      'mixpanel-react-native': stub('web/stubs/mixpanel.ts'),
      '@sentry/react-native': stub('web/stubs/sentry.ts'),
      'react-native-localize': stub('web/stubs/localize.ts'),
      'react-native-toast-message': stub('web/stubs/toast.tsx'),
      'react-native-webview': stub('web/stubs/webview.tsx'),
    },
    extensions: [
      '.web.tsx', '.web.ts', '.web.jsx', '.web.js',
      '.tsx', '.ts', '.jsx', '.js', '.json',
    ],
  },
  optimizeDeps: {
    esbuildOptions: { loader: { '.js': 'jsx' }, define: { global: 'globalThis' } },
  },
  server: { port: 5173 },
  build: { outDir: 'dist-web', chunkSizeWarningLimit: 6000 },
});
