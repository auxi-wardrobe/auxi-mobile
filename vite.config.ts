import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { reactNativeSvg } from './web/svg-plugin';
import { assetDensityFallback } from './web/asset-density-plugin';

const stub = (p: string) => path.resolve(process.cwd(), p);

export default defineConfig({
  plugins: [assetDensityFallback(), reactNativeSvg(), react()],
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
