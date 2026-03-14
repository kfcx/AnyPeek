import { toArrayBuffer } from '@preview/core';

export function downloadBytes(bytes: Uint8Array, fileName: string, contentType: string): void {
  const blob = new Blob([toArrayBuffer(bytes)], { type: contentType || 'application/octet-stream' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName || 'download';
  anchor.rel = 'noopener';
  anchor.style.display = 'none';

  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}
