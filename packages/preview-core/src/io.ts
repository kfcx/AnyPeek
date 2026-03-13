import { concatChunks, formatBytes } from './bytes';

export async function readResponseSample(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    return new Uint8Array();
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }

    const next = value.subarray(0, Math.max(0, maxBytes - total));
    if (next.byteLength > 0) {
      chunks.push(next);
      total += next.byteLength;
    }
  }

  await reader.cancel();
  return concatChunks(chunks, total);
}

export async function readResponseBytes(response: Response, maxBytes = Number.POSITIVE_INFINITY): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    return new Uint8Array();
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }

    total += value.byteLength;
    if (Number.isFinite(maxBytes) && total > maxBytes) {
      await reader.cancel();
      throw new Error(`文件过大，当前预览上限为 ${formatBytes(maxBytes)}。`);
    }

    chunks.push(value);
  }

  return concatChunks(chunks, total);
}

export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    return text || '预览失败。';
  } catch {
    return '预览失败。';
  }
}
