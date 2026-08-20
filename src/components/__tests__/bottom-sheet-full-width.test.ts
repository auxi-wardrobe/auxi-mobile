/* eslint-env jest, node */
/// <reference types="node" />
/**
 * Bottom-sheet width contract — the repo-wide guard behind docs/bottom-sheets.md.
 *
 * A bottom sheet in this app is ALWAYS edge-to-edge: the panel spans the full
 * screen width, docked to the bottom edge, top corners rounded only. A sheet
 * inset from the screen edges (the old `MBottomSheet` floating card, 8px per
 * side) is off-Figma and reads as a different component next to every other
 * sheet in the app.
 *
 * That rule can't be enforced by types — it lives in a StyleSheet — so this
 * test enforces it statically: every bottom-sheet PANEL style declared under
 * `src/` is scanned for declarations that would make it narrower than the
 * screen (`width` other than `'100%'`, `maxWidth`, horizontal margins, or
 * `alignSelf: 'center'`).
 *
 * If this test fails on a sheet you just wrote: don't narrow the panel — build
 * the sheet on `ContextualBottomSheet` (the shared shell) and put your padding
 * on the CONTENT inside it.
 *
 * If it fires on a style that isn't a bottom-sheet panel, the heuristic below
 * (sheet-ish style name, or a bottom-docked top-rounded surface) picked up a
 * false positive — rename the style rather than loosening the check.
 */
import fs, { Dirent } from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..', '..');

const tsxFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry: Dirent) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : tsxFiles(full);
    }
    return entry.name.endsWith('.tsx') ? [full] : [];
  });

/** Inner content of a `key: { ... }` chunk — the style's own declarations plus
 * any nested objects, without the wrapping braces. */
const innerBody = (chunk: string): string => {
  const open = chunk.indexOf('{');
  let depth = 0;
  for (let i = open; i < chunk.length; i++) {
    if (chunk[i] === '{') depth++;
    else if (chunk[i] === '}' && --depth === 0) return chunk.slice(open + 1, i);
  }
  return chunk.slice(open + 1);
};

/** Top-level `key: { ... }` entries of every `StyleSheet.create({...})` in a file. */
const styleEntries = (src: string): { key: string; body: string }[] => {
  const out: { key: string; body: string }[] = [];
  const MARKER = 'StyleSheet.create(';
  let at = src.indexOf(MARKER);
  while (at !== -1) {
    const open = src.indexOf('{', at);
    let depth = 0;
    let end = open;
    for (; end < src.length; end++) {
      if (src[end] === '{') depth++;
      else if (src[end] === '}' && --depth === 0) break;
    }
    const sheet = src.slice(open + 1, end);
    // Split on commas at nesting depth 0 — one chunk per style entry.
    let nested = 0;
    let start = 0;
    const chunks: string[] = [];
    for (let i = 0; i < sheet.length; i++) {
      const c = sheet[i];
      if (c === '{' || c === '(' || c === '[') nested++;
      else if (c === '}' || c === ')' || c === ']') nested--;
      else if (c === ',' && nested === 0) {
        chunks.push(sheet.slice(start, i));
        start = i + 1;
      }
    }
    chunks.push(sheet.slice(start));
    for (const chunk of chunks) {
      const named = chunk.match(/(\w+)\s*:\s*\{/);
      if (named) {
        out.push({ key: named[1], body: innerBody(chunk) });
      }
    }
    at = src.indexOf(MARKER, end);
  }
  return out;
};

const SHEET_NAME = /(^|[a-z])(sheet|panel|modalContent|card|surface|overlay)/i;

/** Is this style the PANEL of a bottom sheet (vs. a row/handle/label inside one)? */
const isSheetPanel = (key: string, body: string): boolean => {
  if (!/backgroundColor/.test(body)) return false;
  const namedLikeASheet = /sheet/i.test(key);
  // A surface docked to the bottom edge: top corners rounded, bottom square.
  const bottomDockedPanel =
    /borderTopLeftRadius/.test(body) &&
    /borderTopRightRadius/.test(body) &&
    !/borderBottomLeftRadius/.test(body) &&
    SHEET_NAME.test(key);
  return namedLikeASheet || bottomDockedPanel;
};

/** Strip nested objects (`shadowOffset: { width: 0 }`) — own declarations only. */
const ownDeclarations = (body: string): string => {
  let flat = body;
  let prev = '';
  while (flat !== prev) {
    prev = flat;
    flat = flat.replace(/\{[^{}]*\}/g, '');
  }
  return flat;
};

/** Declarations that would render the panel narrower than the screen. */
export const narrowingDeclarations = (body: string): string[] => {
  const flat = ownDeclarations(body);
  const found: string[] = [];
  const width = flat.match(/\bwidth\s*:\s*([^,\n]+)/);
  // Only a literal `'100%'` is edge-to-edge; anything else (a number, a
  // percentage, a computed value) narrows the panel.
  if (width && width[1].trim().replace(/,$/, '') !== "'100%'") found.push('width');
  if (/\bmaxWidth\s*:/.test(flat)) found.push('maxWidth');
  if (/\bmargin(Horizontal|Left|Right)\s*:/.test(flat)) {
    found.push('horizontal margin');
  }
  if (/\bmargin\s*:/.test(flat)) found.push('margin');
  if (/\balignSelf\s*:\s*'center'/.test(flat)) found.push("alignSelf: 'center'");
  return found;
};

describe('bottom-sheet width contract', () => {
  const panels = tsxFiles(SRC).flatMap(file =>
    styleEntries(fs.readFileSync(file, 'utf8'))
      .filter(({ key, body }) => isSheetPanel(key, body))
      .map(({ key, body }) => ({
        label: `${path.relative(SRC, file)} :: ${key}`,
        body,
      })),
  );

  it('finds the known bottom-sheet panels (the scan itself still works)', () => {
    const labels = panels.map(p => p.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        'components/design-system/lib/MBottomSheet.tsx :: sheet',
        'components/features/ContextualBottomSheet.tsx :: sheet',
        'components/features/OutfitLimitSheet.tsx :: sheet',
      ]),
    );
  });

  it('declares no bottom-sheet panel narrower than the screen', () => {
    const offenders = panels
      .map(p => ({ ...p, bad: narrowingDeclarations(p.body) }))
      .filter(p => p.bad.length > 0)
      .map(p => `${p.label} → ${p.bad.join(', ')}`);
    expect(offenders).toEqual([]);
  });

  it('catches a narrowed panel (the guard is not vacuous)', () => {
    // The floating card this codebase used to render: all-corner radius and
    // an 8px gutter per side.
    const inset = `
      backgroundColor: '#fff',
      borderRadius: 16,
      marginHorizontal: 8,
      shadowOffset: { width: 0, height: 19 },
    `;
    expect(narrowingDeclarations(inset)).toContain('horizontal margin');
    // `width` inside a nested object (shadowOffset) is not the panel's width.
    expect(narrowingDeclarations(inset)).not.toContain('width');
    expect(narrowingDeclarations("width: '92%'")).toContain('width');
    expect(narrowingDeclarations("width: '100%'")).toEqual([]);
    // ...and it recognises the real panels as panels.
    expect(isSheetPanel('sheet', inset)).toBe(true);
  });
});
