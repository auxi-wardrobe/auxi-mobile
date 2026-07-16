import {
  canEnhanceItem,
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

  describe('canEnhanceItem (full FAB predicate)', () => {
    // A user upload whose processing succeeded: no catalog id, pipeline done,
    // rembg cutout present.
    const UPLOADED = {
      is_preparing: false,
      image_png: 'https://cdn/cutout.png',
    };

    it('offers the FAB on a successfully processed upload', () => {
      expect(canEnhanceItem(UPLOADED)).toBe(true);
    });

    it('rejects catalog inventory: common, USR_ clones, and any other hrid-seeded item', () => {
      expect(canEnhanceItem({ ...UPLOADED, is_common_item: true })).toBe(false);
      expect(
        canEnhanceItem({
          ...UPLOADED,
          human_readable_id: 'USR_SH_SNK_BLK_HIG_01',
        }),
      ).toBe(false);
      // seeded items carry non-USR hrids too — still not uploads
      expect(
        canEnhanceItem({ ...UPLOADED, human_readable_id: 'TOP_L1_001_WHT_REG_01' }),
      ).toBe(false);
      expect(
        canEnhanceItem({
          ...UPLOADED,
          human_readable_id: 'TRADITIONAL_L1_ROBE_YELLOW_REG_001',
        }),
      ).toBe(false);
    });

    it('rejects uploads that are not successfully processed yet', () => {
      // still in the create pipeline
      expect(canEnhanceItem({ ...UPLOADED, is_preparing: true })).toBe(false);
      // pipeline done but no cutout produced (processing failed)
      expect(canEnhanceItem({ is_preparing: false })).toBe(false);
      expect(canEnhanceItem({ is_preparing: false, image_png: '  ' })).toBe(
        false,
      );
    });

    it('applies the one-shot availability rules on top', () => {
      expect(
        canEnhanceItem({ ...UPLOADED, beautify_status: 'accepted' }),
      ).toBe(false);
      expect(
        canEnhanceItem({ ...UPLOADED, image_studio: 'https://cdn/studio.png' }),
      ).toBe(false);
      expect(canEnhanceItem({ ...UPLOADED, beautify_status: 'pending' })).toBe(
        false,
      );
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

  it('polls fast, with a wait budget matching the upload-time beautify flow', () => {
    expect(ENHANCE_POLL_MS).toBe(2000);
    expect(ENHANCE_TIMEOUT_MS).toBe(3 * 60 * 1000);
  });
});
