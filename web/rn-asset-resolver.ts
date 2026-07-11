import { existsSync } from 'node:fs';
import path from 'node:path';

// Metro auto-resolves `require('./x.png')` to a density variant on disk
// (`x@3x.png`, `x@2x.png`, ...). Vite/Rolldown does not, so assets that were
// exported ONLY at a density suffix (e.g. the weather icons, `@3x` only) fail to
// resolve in the web build. This plugin reproduces Metro's behaviour: when the
// literal image path is missing, fall back to the highest available density
// variant, then let Vite's normal asset pipeline emit it.
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif)$/i;
const DENSITIES = ['@3x', '@2x', '@1x'];

export function rnAssetResolver() {
  return {
    name: 'rn-asset-density-resolver',
    enforce: 'pre' as const,
    resolveId(source: string, importer: string | undefined) {
      if (!importer || !IMAGE_EXT.test(source) || source.startsWith('\0')) {
        return null;
      }
      const abs = path.resolve(path.dirname(importer), source);
      if (existsSync(abs)) return null; // literal file exists — nothing to do

      const ext = path.extname(abs);
      const base = abs.slice(0, -ext.length);
      for (const density of DENSITIES) {
        const candidate = `${base}${density}${ext}`;
        if (existsSync(candidate)) return candidate;
      }
      return null;
    },
  };
}
