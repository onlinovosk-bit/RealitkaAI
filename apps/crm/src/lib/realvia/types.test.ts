import { describe, it, expect } from 'vitest';
import { isAdvertPayload, isDeletePayload } from './types';

describe('Realvia payload type guards', () => {
  describe('isDeletePayload', () => {
    it('accepts Realvia export delete payload', () => {
      expect(
        isDeletePayload({
          source_id: 1123,
          action: 'delete',
          archiveType: 'rent',
        }),
      ).toBe(true);
    });

    it('accepts delete without archiveType', () => {
      expect(
        isDeletePayload({ source_id: 1123, action: 'delete' }),
      ).toBe(true);
    });

    it('rejects legacy deleted:true shape', () => {
      expect(
        isDeletePayload({ source_id: 1123, deleted: true }),
      ).toBe(false);
    });

    it('rejects advert payloads', () => {
      expect(
        isDeletePayload({
          source_id: 1123,
          action: 'create',
          advert: { source_id: 1 },
          broker: { source_id: 2 },
        }),
      ).toBe(false);
    });
  });

  describe('isAdvertPayload', () => {
    it('accepts advert + broker objects', () => {
      expect(
        isAdvertPayload({
          broker: { source_id: 1 },
          advert: { source_id: 1004 },
        }),
      ).toBe(true);
    });

    it('rejects delete payloads', () => {
      expect(
        isAdvertPayload({ source_id: 1123, action: 'delete' }),
      ).toBe(false);
    });
  });
});
