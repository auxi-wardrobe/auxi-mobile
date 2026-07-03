import {
  classifyEnhanceError,
  isEnhanceAvailable,
  ENHANCE_POLL_MS,
  ENHANCE_TIMEOUT_MS,
} from '../enhance-session';

describe('enhance-session helpers', () => {
  describe('isEnhanceAvailable', () => {
    it('offers enhancement on fresh / discarded / failed / abandoned-ready items', () => {
      expect(isEnhanceAvailable({})).toBe(true);
      expect(isEnhanceAvailable({ beautify_status: 'none' })).toBe(true);
      expect(isEnhanceAvailable({ beautify_status: 'discarded' })).toBe(true);
      expect(isEnhanceAvailable({ beautify_status: 'failed' })).toBe(true);
      // uncommitted candidate from an abandoned session — regenerate over it
      expect(isEnhanceAvailable({ beautify_status: 'ready' })).toBe(true);
    });

    it('hides enhancement once a studio shot is accepted (one per image version)', () => {
      expect(isEnhanceAvailable({ beautify_status: 'accepted' })).toBe(false);
      expect(
        isEnhanceAvailable({ image_studio: 'https://cdn/studio.png' }),
      ).toBe(false);
    });

    it('hides enhancement while a beautify job is already pending', () => {
      expect(isEnhanceAvailable({ beautify_status: 'pending' })).toBe(false);
    });
  });

  describe('classifyEnhanceError', () => {
    it('maps a dispatched-but-unanswered axios error to network', () => {
      expect(classifyEnhanceError({ request: {}, response: undefined })).toBe(
        'network',
      );
    });

    it('maps answered errors (4xx/5xx incl. the 409 regenerate cap) to server_error', () => {
      expect(
        classifyEnhanceError({ request: {}, response: { status: 409 } }),
      ).toBe('server_error');
      expect(
        classifyEnhanceError({ request: {}, response: { status: 500 } }),
      ).toBe('server_error');
    });

    it('defaults non-axios errors to server_error', () => {
      expect(classifyEnhanceError(new Error('boom'))).toBe('server_error');
      expect(classifyEnhanceError(null)).toBe('server_error');
      expect(classifyEnhanceError(undefined)).toBe('server_error');
    });
  });

  it('polls fast and times out just past the promised 10s window', () => {
    expect(ENHANCE_POLL_MS).toBe(2000);
    expect(ENHANCE_TIMEOUT_MS).toBe(15000);
  });
});
