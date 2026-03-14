import { invoke, isTauri } from '@tauri-apps/api/core';

import {
  SAMPLE_BYTES,
  determinePreviewKind,
  extractExtension,
  sniffFileType,
  type ResolvedPreviewResource
} from '@preview/core';
import { createUuid } from '@preview/core/id';

interface TauriProbeResult {
  fileName: string;
  contentType: string;
  size: number | null;
  sampleBytes: number[];
}

interface TauriReadResult {
  bytes: number[];
  complete: boolean;
}

function createResourceId(prefix: string): string {
  return `${prefix}:${createUuid()}`;
}

function assertMaxBytes(bytes: Uint8Array, maxBytes?: number): Uint8Array {
  if (maxBytes != null && Number.isFinite(maxBytes) && bytes.byteLength > maxBytes) {
    throw new Error(`文件过大，当前预览上限为 ${maxBytes} 字节。`);
  }

  return bytes;
}

function toUint8Array(bytes: number[]): Uint8Array {
  return Uint8Array.from(bytes);
}

function readTauriErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object') {
    const message = Reflect.get(error, 'message');
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error('桌面运行时未就绪。');
  }

  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new Error(readTauriErrorMessage(error, `${command} 调用失败。`));
  }
}

export function isTauriRuntime(): boolean {
  return isTauri();
}

async function readRemote(rawUrl: string, start?: number, endExclusive?: number): Promise<TauriReadResult> {
  return await invokeTauri<TauriReadResult>('read_remote_resource', {
    payload: {
      rawUrl,
      start,
      endExclusive
    }
  });
}

export async function downloadTauriRemoteUrl(rawUrl: string): Promise<{ bytes: Uint8Array; contentType: string; fileName: string }> {
  const probe = await invokeTauri<TauriProbeResult>('probe_remote_resource', {
    payload: {
      rawUrl,
      sampleBytes: SAMPLE_BYTES
    }
  });
  const result = await readRemote(rawUrl);

  return {
    bytes: toUint8Array(result.bytes),
    contentType: probe.contentType || 'application/octet-stream',
    fileName: probe.fileName || 'remote-file'
  };
}

export async function createTauriRemotePreviewResource(rawUrl: string): Promise<ResolvedPreviewResource> {
  const probe = await invokeTauri<TauriProbeResult>('probe_remote_resource', {
    payload: {
      rawUrl,
      sampleBytes: SAMPLE_BYTES
    }
  });

  const sampleBytes = toUint8Array(probe.sampleBytes);
  const sniffed = await sniffFileType(sampleBytes);
  let wholeFilePromise: Promise<Uint8Array> | null = null;

  const readWholeFile = async (maxBytes?: number): Promise<Uint8Array> => {
    if (!wholeFilePromise) {
      wholeFilePromise = readRemote(rawUrl).then((result) => toUint8Array(result.bytes));
    }

    const bytes = await wholeFilePromise;
    return assertMaxBytes(bytes, maxBytes);
  };

  return {
    id: createResourceId('remote'),
    source: 'remote',
    inputValue: rawUrl,
    kind: determinePreviewKind({
      fileName: probe.fileName,
      fileExtension: extractExtension(probe.fileName),
      contentType: probe.contentType,
      sniffedMime: sniffed?.mime,
      sniffedExt: sniffed?.ext,
      sampleBytes
    }),
    fileName: probe.fileName,
    extension: extractExtension(probe.fileName),
    contentType: probe.contentType || 'application/octet-stream',
    size: probe.size,
    previewUrl: '',
    downloadUrl: '',
    sampleBytes,
    handle: {
      async readAll(maxBytes) {
        return await readWholeFile(maxBytes);
      },
      async readSlice(start, endExclusive) {
        const result = await readRemote(rawUrl, start, endExclusive);
        const bytes = toUint8Array(result.bytes);
        if (result.complete) {
          wholeFilePromise ??= Promise.resolve(bytes);
          return bytes.subarray(start, endExclusive);
        }

        return bytes;
      }
    },
    diagnostics: {
      sniffedMime: sniffed?.mime ?? '',
      sniffedExt: sniffed?.ext ?? ''
    }
  };
}
