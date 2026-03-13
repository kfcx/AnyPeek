export function sanitizeFileName(fileName: string): string {
  const cleaned = String(fileName ?? '').replace(/[\\/:*?"<>|]+/g, '_').trim();
  return cleaned || 'remote-file';
}

export function parseContentDispositionFilename(contentDisposition: string | null | undefined): string | null {
  if (!contentDisposition) {
    return null;
  }

  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return sanitizeFileName(decodeURIComponent(encodedMatch[1]));
    } catch {
      return sanitizeFileName(encodedMatch[1]);
    }
  }

  const plainMatch = contentDisposition.match(/filename=(?:"([^"]+)"|([^;]+))/i);
  if (!plainMatch) {
    return null;
  }

  return sanitizeFileName(plainMatch[1] ?? plainMatch[2] ?? '');
}

export function resolveFileNameFromHeaders(headers: Headers, fallbackUrl: string): string {
  const fromHeader = parseContentDispositionFilename(headers.get('content-disposition'));
  if (fromHeader) {
    return fromHeader;
  }

  try {
    const url = new URL(fallbackUrl);
    const lastSegment = url.pathname.split('/').filter(Boolean).at(-1) ?? 'remote-file';
    return sanitizeFileName(decodeURIComponent(lastSegment));
  } catch {
    return 'remote-file';
  }
}
