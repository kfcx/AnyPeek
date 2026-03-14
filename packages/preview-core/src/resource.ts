import { concatChunks, extractExtension, parseContentLength } from './bytes';
import { PROXY_RESOLVED_FILENAME_HEADER, SAMPLE_BYTES } from './constants';
import { determinePreviewKind, sniffFileType } from './detect';
import {
  parseContentDispositionFilename,
  resolveFileNameFromHeaders,
  sanitizeFileName
} from './file-name';
import { createUuid } from './id';
import { readErrorMessage, readResponseBytes, readResponseSample } from './io';
import type { ResolvedPreviewResource } from './types';
import type { RemoteTransport } from './transport';

function createResourceId(prefix: string): string {
  return `${prefix}:${createUuid()}`;
}

function assertMaxBytes(bytes: Uint8Array, maxBytes?: number): Uint8Array {
  if (maxBytes != null && Number.isFinite(maxBytes) && bytes.byteLength > maxBytes) {
    throw new Error(`文件过大，当前预览上限为 ${maxBytes} 字节。`);
  }

  return bytes;
}

export async function createLocalPreviewResource(file: File): Promise<ResolvedPreviewResource> {
  const fileName = file.name || 'local-file';
  const contentType = file.type || 'application/octet-stream';
  const sampleBytes = new Uint8Array(await file.slice(0, SAMPLE_BYTES).arrayBuffer());
  const sniffed = await sniffFileType(sampleBytes);
  const previewUrl = URL.createObjectURL(file);

  return {
    id: createResourceId('local'),
    source: 'local',
    inputValue: fileName,
    kind: determinePreviewKind({
      fileName,
      fileExtension: extractExtension(fileName),
      contentType,
      sniffedMime: sniffed?.mime,
      sniffedExt: sniffed?.ext,
      sampleBytes
    }),
    fileName,
    extension: extractExtension(fileName),
    contentType,
    size: file.size,
    previewUrl,
    downloadUrl: previewUrl,
    sampleBytes,
    handle: {
      async readAll(maxBytes) {
        return assertMaxBytes(new Uint8Array(await file.arrayBuffer()), maxBytes);
      },
      async readSlice(start, endExclusive) {
        return new Uint8Array(await file.slice(start, endExclusive).arrayBuffer());
      },
      dispose() {
        URL.revokeObjectURL(previewUrl);
      }
    },
    diagnostics: {
      sniffedMime: sniffed?.mime ?? '',
      sniffedExt: sniffed?.ext ?? ''
    }
  };
}

export async function createRemotePreviewResource(
  rawUrl: string,
  transport: RemoteTransport
): Promise<ResolvedPreviewResource> {
  const response = await transport.fetch(rawUrl);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const sampleBytes = await readResponseSample(response, SAMPLE_BYTES);
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const headerFileName = parseContentDispositionFilename(response.headers.get('content-disposition'));
  const proxyResolvedFileName = response.headers.get(PROXY_RESOLVED_FILENAME_HEADER);
  const fileName = proxyResolvedFileName
    ? sanitizeFileName(proxyResolvedFileName)
    : headerFileName ?? resolveFileNameFromHeaders(response.headers, rawUrl);
  const size = parseContentLength(response.headers.get('content-length'));
  const sniffed = await sniffFileType(sampleBytes);
  const prefixBytes = size != null ? sampleBytes.subarray(0, Math.min(size, sampleBytes.byteLength)) : sampleBytes;
  const extension = extractExtension(fileName);

  let wholeFilePromise: Promise<Uint8Array> | null =
    size != null && size <= prefixBytes.byteLength ? Promise.resolve(prefixBytes.subarray(0, size)) : null;

  const readRange = async (start: number, endExclusive: number): Promise<Uint8Array> => {
    if (endExclusive <= start) {
      return new Uint8Array();
    }

    if (wholeFilePromise) {
      const wholeFile = await wholeFilePromise;
      return wholeFile.subarray(start, endExclusive);
    }

    const rangeEnd = Math.max(start, endExclusive - 1);
    const nextResponse = await transport.fetch(rawUrl, {
      headers: {
        Range: `bytes=${start}-${rangeEnd}`
      }
    });

    if (nextResponse.status === 206) {
      return await readResponseSample(nextResponse, endExclusive - start);
    }

    if (!nextResponse.ok) {
      throw new Error(await readErrorMessage(nextResponse));
    }

    const wholeFile = await readResponseBytes(nextResponse);
    wholeFilePromise ??= Promise.resolve(wholeFile);
    return wholeFile.subarray(start, endExclusive);
  };

  const readWholeFile = async (maxBytes?: number): Promise<Uint8Array> => {
    if (!wholeFilePromise) {
      wholeFilePromise = (async () => {
        const nextResponse = await transport.fetch(rawUrl);
        if (!nextResponse.ok) {
          throw new Error(await readErrorMessage(nextResponse));
        }
        return await readResponseBytes(nextResponse);
      })();
    }

    const bytes = await wholeFilePromise;
    return assertMaxBytes(bytes, maxBytes);
  };

  return {
    id: createResourceId('remote'),
    source: 'remote',
    inputValue: rawUrl,
    kind: determinePreviewKind({
      fileName,
      fileExtension: extension,
      contentType,
      sniffedMime: sniffed?.mime,
      sniffedExt: sniffed?.ext,
      sampleBytes
    }),
    fileName,
    extension,
    contentType,
    size,
    previewUrl: transport.buildPreviewUrl(rawUrl),
    downloadUrl: transport.buildDownloadUrl(rawUrl),
    sampleBytes,
    handle: {
      async readAll(maxBytes) {
        return await readWholeFile(maxBytes);
      },
      async readSlice(start, endExclusive) {
        if (endExclusive <= start) {
          return new Uint8Array();
        }

        if (start < prefixBytes.byteLength) {
          const prefixEnd = Math.min(endExclusive, prefixBytes.byteLength);
          if (endExclusive <= prefixBytes.byteLength) {
            return prefixBytes.subarray(start, prefixEnd);
          }

          const prefix = prefixBytes.subarray(start, prefixEnd);
          const suffix = await readRange(prefixBytes.byteLength, endExclusive);
          if (!suffix.byteLength) {
            return prefix;
          }

          return concatChunks([prefix, suffix], prefix.byteLength + suffix.byteLength);
        }

        return await readRange(start, endExclusive);
      }
    },
    diagnostics: {
      sniffedMime: sniffed?.mime ?? '',
      sniffedExt: sniffed?.ext ?? ''
    }
  };
}
