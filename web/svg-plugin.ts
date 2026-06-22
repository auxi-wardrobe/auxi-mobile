import { promises as fs } from 'node:fs';
import { transform } from '@svgr/core';
import { transformWithEsbuild } from 'vite';

// Turn `import Icon from './x.svg'` into a react-native-svg component (native
// output), matching the Metro react-native-svg-transformer convention.
export function reactNativeSvg() {
  return {
    name: 'rn-svg-transform',
    enforce: 'pre' as const,
    async load(id: string) {
      const file = id.split('?')[0];
      if (!file.endsWith('.svg')) return null;
      const svg = await fs.readFile(file, 'utf-8');
      const jsx = await transform(
        svg,
        { native: true, plugins: ['@svgr/plugin-jsx'], typescript: true },
        { componentName: 'SvgComponent' },
      );
      const out = await transformWithEsbuild(jsx, file + '.tsx', {
        loader: 'tsx',
        jsx: 'automatic',
      });
      return out.code;
    },
  };
}
