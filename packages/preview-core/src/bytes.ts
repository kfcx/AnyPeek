export function concatChunks(chunks: Uint8Array[], total: number): Uint8Array {
  const merged = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged;
}

export function extractExtension(fileName: string): string {
  const match = String(fileName).toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? '';
}

export function normalizeContentType(contentType: string | null | undefined): string {
  return String(contentType ?? '').split(';')[0].trim().toLowerCase() || 'application/octet-stream';
}

export function parseContentLength(value: string | null | undefined): number | null {
  const size = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(size) ? size : null;
}

export function countChar(source: string, targetChar: string): number {
  let count = 0;
  for (const char of source) {
    if (char === targetChar) {
      count += 1;
    }
  }
  return count;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) {
    return '未知大小';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? (bytes.buffer as ArrayBuffer)
    : bytes.slice().buffer;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
