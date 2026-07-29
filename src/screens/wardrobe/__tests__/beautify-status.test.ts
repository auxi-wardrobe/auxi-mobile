import { QueryClient } from '@tanstack/react-query';
import { wardrobeKeys } from '../../../services/wardrobeService';
import { markItemBeautifying, BEAUTIFY_POLL_MS } from '../beautify-status';

describe('beautify-status helpers', () => {
  it('exposes a 10s poll interval', () => {
    expect(BEAUTIFY_POLL_MS).toBe(10000);
  });

  describe('markItemBeautifying', () => {
    const makeClient = () => new QueryClient();

    it('patches beautify_status: pending onto the matching cached item only', () => {
      const client = makeClient();
      client.setQueryData(wardrobeKeys.list('All'), [
        { id: 'item-1', beautify_status: 'none' },
        { id: 'item-2', beautify_status: 'accepted' },
      ]);

      markItemBeautifying(client, 'item-1');

      expect(client.getQueryData(wardrobeKeys.list('All'))).toEqual([
        { id: 'item-1', beautify_status: 'pending' },
        { id: 'item-2', beautify_status: 'accepted' },
      ]);
    });

    it('is a no-op when the item is not in the cached list yet', () => {
      const client = makeClient();
      client.setQueryData(wardrobeKeys.list('All'), [
        { id: 'item-1', beautify_status: 'none' },
      ]);

      markItemBeautifying(client, 'brand-new-item');

      expect(client.getQueryData(wardrobeKeys.list('All'))).toEqual([
        { id: 'item-1', beautify_status: 'none' },
      ]);
    });

    it('is a no-op when the list is not cached at all', () => {
      const client = makeClient();

      expect(() => markItemBeautifying(client, 'item-1')).not.toThrow();
      expect(client.getQueryData(wardrobeKeys.list('All'))).toBeUndefined();
    });
  });
});
