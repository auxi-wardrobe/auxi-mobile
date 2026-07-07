import { beautifyStep, anyBeautifying, BEAUTIFY_POLL_MS } from '../beautify-status';

describe('beautify-status helpers', () => {
  it('rotates copy over time', () => {
    expect(beautifyStep(0)).toMatch(/background/i);
    expect(beautifyStep(20000)).not.toBe(beautifyStep(0));
  });
  it('detects any beautifying item', () => {
    expect(anyBeautifying([{ beautify_status: 'pending' } as any])).toBe(true);
    expect(anyBeautifying([{ beautify_status: 'accepted' } as any])).toBe(false);
  });
  it('exposes a 4s poll interval', () => {
    expect(BEAUTIFY_POLL_MS).toBe(4000);
  });
});
