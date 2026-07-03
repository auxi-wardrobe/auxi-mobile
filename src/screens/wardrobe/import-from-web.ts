/**
 * Import-from-web — pure helpers for the "Search images" add-item flow.
 *
 * The screen embeds a Google search in a WebView, then injects a scraper that
 * collects the page's <img> elements and posts them back. Everything here is
 * side-effect-free (URL building, injected-script source, message parsing,
 * dedup/cap) so it can be unit-tested without a WebView. The product rules
 * (min 300×300, supported raster formats, dedup by URL, cap at 24, largest
 * first) live in ONE place — the injected script filters at the source and
 * `parseExtractionMessage` re-applies the same guards defensively.
 */

/** Minimum width AND height (px) an image must have to be offered for import. */
export const MIN_IMAGE_DIMENSION = 300;

/** Hard cap on how many extracted images are shown (perf + decision fatigue). */
export const MAX_EXTRACTED_IMAGES = 24;

export interface ExtractedImage {
  url: string;
  width: number;
  height: number;
}

/**
 * Result of an extraction round.
 *  - `total`   — raw <img> count on the page (0 ⇒ genuinely nothing to extract).
 *  - `images`  — the filtered/dedup'd/capped candidates (may be empty even when
 *                `total > 0`, i.e. only unsupported/tiny images were present).
 */
export interface ExtractionResult {
  total: number;
  images: ExtractedImage[];
}

/** A single non-whitespace character is enough to enable Search (spec rule). */
export const isValidQuery = (query: string): boolean => query.trim().length > 0;

/** Build the Google results URL for a query (trimmed, URL-encoded). */
export const buildSearchUrl = (query: string): string =>
  `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;

/**
 * Injected into the results page on "Extract images". Collects visible <img>
 * elements, keeping only http(s) raster images ≥ MIN×MIN, de-duplicated by URL
 * and sorted largest-first, capped at MAX. Data-URI/SVG/GIF/ICO and broken or
 * tiny images are skipped. Reports back via `window.ReactNativeWebView`.
 *
 * Must be a self-contained ES5 string (it runs in the page, not in RN) and must
 * end with `true;` so injectJavaScript doesn't warn on Android.
 */
export const buildExtractionScript = (): string => `
(function () {
  try {
    var MIN = ${MIN_IMAGE_DIMENSION};
    var MAX = ${MAX_EXTRACTED_IMAGES};
    var SUPPORTED = /\\.(jpe?g|png|webp|avif)(\\?|#|$)/i;
    // Google serves many result thumbnails from these hosts without a file
    // extension; treat them as supported raster images.
    var IMAGE_HOST = /(googleusercontent|gstatic|ggpht|bing\\.net|fbcdn)/i;
    var nodes = document.querySelectorAll('img');
    var seen = {};
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var img = nodes[i];
      var url = img.currentSrc || img.src || img.getAttribute('data-src') || '';
      if (!url) continue;
      if (url.indexOf('data:') === 0) continue;
      if (!/^https?:\\/\\//i.test(url)) continue;
      if (!(SUPPORTED.test(url) || IMAGE_HOST.test(url))) continue;
      var w = img.naturalWidth || img.width || Math.round(img.getBoundingClientRect().width);
      var h = img.naturalHeight || img.height || Math.round(img.getBoundingClientRect().height);
      if (w < MIN || h < MIN) continue;
      if (seen[url]) continue;
      seen[url] = true;
      out.push({ url: url, width: w, height: h });
    }
    out.sort(function (a, b) { return (b.width * b.height) - (a.width * a.height); });
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'extract',
      total: nodes.length,
      images: out.slice(0, MAX)
    }));
  } catch (e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'error',
      message: String(e && e.message ? e.message : e)
    }));
  }
})();
true;
`;

const isExtractedImage = (value: unknown): value is ExtractedImage => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.url === 'string' &&
    candidate.url.length > 0 &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number'
  );
};

/**
 * Parse a WebView message posted by the injected script. Returns the extraction
 * result on success, or `null` for the error message / any malformed payload.
 * Re-applies the size/dedup/cap guards so a tampered or partial payload can
 * never smuggle undersized or duplicate images into the grid.
 */
export const parseExtractionMessage = (raw: string): ExtractionResult | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const payload = parsed as Record<string, unknown>;
  if (payload.type !== 'extract') {
    return null;
  }

  const total = typeof payload.total === 'number' ? payload.total : 0;
  const rawImages = Array.isArray(payload.images) ? payload.images : [];

  const seen = new Set<string>();
  const images: ExtractedImage[] = [];
  for (const entry of rawImages) {
    if (!isExtractedImage(entry)) {
      continue;
    }
    if (
      entry.width < MIN_IMAGE_DIMENSION ||
      entry.height < MIN_IMAGE_DIMENSION
    ) {
      continue;
    }
    if (seen.has(entry.url)) {
      continue;
    }
    seen.add(entry.url);
    images.push(entry);
    if (images.length >= MAX_EXTRACTED_IMAGES) {
      break;
    }
  }

  return { total, images };
};
