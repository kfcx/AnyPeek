export interface CryptoUuidSource {
  randomUUID?: () => string;
  getRandomValues?: <T extends ArrayBufferView>(array: T) => T;
}

function formatUuidFromBytes(bytes: Uint8Array): string {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createUuid(source: CryptoUuidSource | undefined = globalThis.crypto): string {
  if (source?.randomUUID) {
    return source.randomUUID();
  }

  if (source?.getRandomValues) {
    return formatUuidFromBytes(source.getRandomValues(new Uint8Array(16)));
  }

  const seed = `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  const bytes = new Uint8Array(16);

  for (let index = 0; index < bytes.length; index += 1) {
    const charCode = seed.charCodeAt(index % seed.length) ?? 0;
    bytes[index] = (charCode + index * 37 + Math.floor(Math.random() * 256)) & 0xff;
  }

  return formatUuidFromBytes(bytes);
}
