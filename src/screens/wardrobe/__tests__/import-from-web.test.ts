import {
  MAX_EXTRACTED_IMAGES,
  MIN_IMAGE_DIMENSION,
  buildExtractionScript,
  buildSearchUrl,
  isValidQuery,
  parseExtractionMessage,
} from '../import-from-web';

describe('isValidQuery', () => {
  it('is false for empty / whitespace-only queries', () => {
    expect(isValidQuery('')).toBe(false);
    expect(isValidQuery('   ')).toBe(false);
    expect(isValidQuery('\n\t')).toBe(false);
  });

  it('is true once there is a non-whitespace character', () => {
    expect(isValidQuery('a')).toBe(true);
    expect(isValidQuery('  blue jeans  ')).toBe(true);
  });
});

describe('buildSearchUrl', () => {
  it('trims and URL-encodes the query', () => {
    expect(buildSearchUrl('  blue jeans ')).toBe(
      'https://www.google.com/search?q=blue%20jeans',
    );
  });

  it('encodes special characters', () => {
    expect(buildSearchUrl('t-shirt & shorts')).toBe(
      'https://www.google.com/search?q=t-shirt%20%26%20shorts',
    );
  });
});

describe('buildExtractionScript', () => {
  it('bakes in the size + cap constants and terminates with true;', () => {
    const script = buildExtractionScript();
    expect(script).toContain(`var MIN = ${MIN_IMAGE_DIMENSION};`);
    expect(script).toContain(`var MAX = ${MAX_EXTRACTED_IMAGES};`);
    // injectJavaScript warns on Android when the script doesn't end in a value.
    expect(script.trim().endsWith('true;')).toBe(true);
  });
});

describe('parseExtractionMessage', () => {
  const img = (url: string, width = 400, height = 400) => ({
    url,
    width,
    height,
  });

  it('returns null for malformed JSON', () => {
    expect(parseExtractionMessage('not json')).toBeNull();
  });

  it('returns null for the error message shape', () => {
    expect(
      parseExtractionMessage(JSON.stringify({ type: 'error', message: 'x' })),
    ).toBeNull();
  });

  it('returns null for an unexpected type', () => {
    expect(
      parseExtractionMessage(JSON.stringify({ type: 'something' })),
    ).toBeNull();
  });

  it('passes through valid images with the total', () => {
    const result = parseExtractionMessage(
      JSON.stringify({
        type: 'extract',
        total: 5,
        images: [img('https://a.com/1.jpg'), img('https://a.com/2.jpg')],
      }),
    );
    expect(result).toEqual({
      total: 5,
      images: [img('https://a.com/1.jpg'), img('https://a.com/2.jpg')],
    });
  });

  it('reports an empty list while preserving the raw total (unsupported-only page)', () => {
    const result = parseExtractionMessage(
      JSON.stringify({ type: 'extract', total: 8, images: [] }),
    );
    expect(result).toEqual({ total: 8, images: [] });
  });

  it('drops images below the minimum dimension', () => {
    const result = parseExtractionMessage(
      JSON.stringify({
        type: 'extract',
        total: 2,
        images: [
          img('https://a.com/big.jpg', 400, 400),
          img('https://a.com/tiny.jpg', 100, 400),
        ],
      }),
    );
    expect(result?.images).toEqual([img('https://a.com/big.jpg', 400, 400)]);
  });

  it('de-duplicates repeated URLs', () => {
    const result = parseExtractionMessage(
      JSON.stringify({
        type: 'extract',
        total: 3,
        images: [
          img('https://a.com/dup.jpg'),
          img('https://a.com/dup.jpg'),
          img('https://a.com/other.jpg'),
        ],
      }),
    );
    expect(result?.images).toEqual([
      img('https://a.com/dup.jpg'),
      img('https://a.com/other.jpg'),
    ]);
  });

  it('caps the list at MAX_EXTRACTED_IMAGES', () => {
    const many = Array.from({ length: MAX_EXTRACTED_IMAGES + 10 }, (_, i) =>
      img(`https://a.com/${i}.jpg`),
    );
    const result = parseExtractionMessage(
      JSON.stringify({ type: 'extract', total: many.length, images: many }),
    );
    expect(result?.images).toHaveLength(MAX_EXTRACTED_IMAGES);
  });

  it('ignores structurally invalid entries', () => {
    const result = parseExtractionMessage(
      JSON.stringify({
        type: 'extract',
        total: 3,
        images: [
          img('https://a.com/ok.jpg'),
          { url: 'https://a.com/missing-size.jpg' },
          { width: 400, height: 400 },
        ],
      }),
    );
    expect(result?.images).toEqual([img('https://a.com/ok.jpg')]);
  });
});
