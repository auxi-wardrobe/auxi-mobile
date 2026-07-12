import { existsSync } from 'node:fs';
import path from 'node:path';

// Metro resolves a bare `foo.png` require to the best on-disk density variant
// (`foo@3x.png`, `foo@2x.png`, …); Vite/rolldown do not. Some assets in this
// repo ship only as `@3x` (e.g. the weather icons in WeatherIcon.tsx), so the
// web build fails to resolve the bare path. This plugin mirrors Metro's density
// resolution for the web build ONLY — native builds never run the Vite
// pipeline, so their behaviour is unchanged.
const DENSITY_SUFFIXES = ['@3x', '@2x', '@1x'];
const RASTER = /\.(png|jpe?g|gif|webp)$/i;

export function assetDensityFallback() {
  return {
    name: 'rn-asset-density-fallback',
    enforce: 'pre' as const,
    resolveId(source: string, importer: string | undefined) {
      if (!importer || source.startsWith('\0')) return null;
      if (!RASTER.test(source)) return null;
      // Only handle relative/absolute path imports, not bare package ids.
      if (!source.startsWith('.') && !path.isAbsolute(source)) return null;
      const abs = path.resolve(path.dirname(importer.split('?')[0]), source);
      if (existsSync(abs)) return null; // exact file exists — let Vite handle it
      const ext = path.extname(abs);
      const base = abs.slice(0, -ext.length);
      for (const suffix of DENSITY_SUFFIXES) {
        const candidate = `${base}${suffix}${ext}`;
        if (existsSync(candidate)) return candidate;
      }
      return null;
    },
  };
}
