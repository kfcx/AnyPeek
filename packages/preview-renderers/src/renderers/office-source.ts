import { toArrayBuffer, type ResolvedPreviewResource } from '@preview/core';

export async function resolveOfficePreviewSource(resource: ResolvedPreviewResource): Promise<string | ArrayBuffer> {
  if (resource.source !== 'local') {
    return resource.previewUrl;
  }

  return toArrayBuffer(await resource.handle.readAll());
}
