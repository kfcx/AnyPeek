import { describe, expect, it, vi } from 'vitest';

import { createUuid, type CryptoUuidSource } from './id';

describe('createUuid', () => {
  it('prefers crypto.randomUUID when available', () => {
    expect(
      createUuid({
        randomUUID: () => '123e4567-e89b-12d3-a456-426614174000'
      })
    ).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('builds an RFC4122-like uuid from getRandomValues when randomUUID is unavailable', () => {
    const getRandomValuesSpy = vi.fn((array: ArrayBufferView) => {
      const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      bytes.set(Uint8Array.from({ length: bytes.length }, (_, index) => index));
      return array;
    });
    const getRandomValues = getRandomValuesSpy as unknown as NonNullable<CryptoUuidSource['getRandomValues']>;

    expect(createUuid({ getRandomValues })).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(getRandomValuesSpy).toHaveBeenCalledOnce();
  });

  it('still returns a uuid when crypto APIs are unavailable', () => {
    expect(createUuid(undefined)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
