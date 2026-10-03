// Metro resolves `require('./art.png')` to an asset the RN <Image> can load.
// Vite bundles the same call as an ESM namespace (`{ default: '/assets/…' }`),
// which react-native-web's <Image> can't read — so every `require`d bitmap
// (onboarding art, skin-tone portraits…) rendered blank on the web preview.
// Rewrite each such require into a default URL import, which RNW takes as a
// plain string source.
const IMAGE_REQUIRE =
  /require\(\s*(['"])([^'"\n]+\.(?:png|jpe?g|gif|webp))\1\s*\)/g;

export function reactNativeImageRequire() {
  return {
    name: 'rn-image-require',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      const file = id.split('?')[0];
      if (!/\.[jt]sx?$/.test(file) || file.includes('/node_modules/')) {
        return null;
      }
      if (!IMAGE_REQUIRE.test(code)) return null;
      IMAGE_REQUIRE.lastIndex = 0;

      const imports: string[] = [];
      const byPath = new Map<string, string>();
      const out = code.replace(
        IMAGE_REQUIRE,
        (_match, _quote, path: string) => {
          let name = byPath.get(path);
          if (!name) {
            name = `__rnImage${byPath.size}`;
            byPath.set(path, name);
            imports.push(`import ${name} from ${JSON.stringify(path)};`);
          }
          return name;
        },
      );
      return { code: `${imports.join('\n')}\n${out}`, map: null };
    },
  };
}
