import { describe, expect, it } from 'vitest';

import { PROXY_RESOLVED_FILENAME_HEADER, SAMPLE_BYTES } from './constants';
import { createRemotePreviewResource } from './resource';
import type { RemoteTransport } from './transport';

const ZIP_SAMPLE = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);

function createTransport(fetcher: RemoteTransport['fetch']): RemoteTransport {
  return {
    buildPreviewUrl(rawUrl) {
      return `/api/file?url=${encodeURIComponent(rawUrl)}`;
    },
    buildDownloadUrl(rawUrl) {
      return `/api/file?download=1&url=${encodeURIComponent(rawUrl)}`;
    },
    fetch: fetcher
  };
}

describe('createRemotePreviewResource', () => {
  it('uses the proxy-resolved file name to classify redirected office files', async () => {
    let fetchCount = 0;
    let probeRange = '';
    const transport = createTransport(async (_rawUrl, init) => {
      fetchCount += 1;
      probeRange = new Headers(init?.headers).get('Range') ?? '';
      return new Response(ZIP_SAMPLE, {
        status: 206,
        headers: {
          'content-type': 'application/octet-stream',
          'content-range': `bytes 0-${ZIP_SAMPLE.byteLength - 1}/${ZIP_SAMPLE.byteLength}`,
          [PROXY_RESOLVED_FILENAME_HEADER]: 'report.docx'
        }
      });
    });

    const resource = await createRemotePreviewResource('https://example.com/download?id=1', transport);

    expect(resource.fileName).toBe('report.docx');
    expect(resource.extension).toBe('docx');
    expect(resource.kind).toBe('docx');
    expect(resource.size).toBe(ZIP_SAMPLE.byteLength);
    expect(probeRange).toBe(`bytes=0-${SAMPLE_BYTES - 1}`);
    expect(fetchCount).toBe(1);
  });

  it('reuses the sampled bytes when the whole file already fits inside the probe window', async () => {
    let fetchCount = 0;
    let probeRange = '';
    const body = new TextEncoder().encode('hello world');
    const transport = createTransport(async (_rawUrl, init) => {
      fetchCount += 1;
      probeRange = new Headers(init?.headers).get('Range') ?? '';
      return new Response(body, {
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'content-length': String(body.byteLength)
        }
      });
    });

    const resource = await createRemotePreviewResource('https://example.com/demo.txt', transport);
    const bytes = await resource.handle.readAll();

    expect(new TextDecoder().decode(bytes)).toBe('hello world');
    expect(probeRange).toBe(`bytes=0-${SAMPLE_BYTES - 1}`);
    expect(fetchCount).toBe(1);
  });

  it('falls back to a plain GET when the probe range is not satisfiable', async () => {
    const requestRanges: Array<string | null> = [];
    const transport = createTransport(async (_rawUrl, init) => {
      const range = new Headers(init?.headers).get('Range');
      requestRanges.push(range);

      if (requestRanges.length === 1) {
        return new Response(null, { status: 416 });
      }

      return new Response(new Uint8Array(), {
        headers: {
          'content-type': 'application/octet-stream',
          'content-length': '0'
        }
      });
    });

    const resource = await createRemotePreviewResource('https://example.com/empty.bin', transport);
    const bytes = await resource.handle.readAll();

    expect(requestRanges).toEqual([`bytes=0-${SAMPLE_BYTES - 1}`, null]);
    expect(resource.size).toBe(0);
    expect(bytes).toEqual(new Uint8Array());
  });

  it('starts follow-up range reads after the sampled prefix instead of downloading it twice', async () => {
    const prefix = new Uint8Array(SAMPLE_BYTES).fill(0x41);
    const suffix = new Uint8Array([0x42, 0x43, 0x44, 0x45]);
    let probeRange = '';
    const followUpRangeRequests: string[] = [];

    const transport = createTransport(async (_rawUrl, init) => {
      const range = new Headers(init?.headers).get('Range');
      if (range === `bytes=0-${SAMPLE_BYTES - 1}`) {
        probeRange = range;
        return new Response(prefix, {
          status: 206,
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'content-range': `bytes 0-${prefix.byteLength - 1}/${prefix.byteLength + suffix.byteLength}`
          }
        });
      }

      followUpRangeRequests.push(range ?? '');
      return new Response(suffix, {
        status: 206,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'content-range': `bytes ${SAMPLE_BYTES}-${SAMPLE_BYTES + suffix.byteLength - 1}/${SAMPLE_BYTES + suffix.byteLength}`
        }
      });
    });

    const resource = await createRemotePreviewResource('https://example.com/demo.txt', transport);
    const bytes = await resource.handle.readSlice(0, SAMPLE_BYTES + suffix.byteLength);

    expect(probeRange).toBe(`bytes=0-${SAMPLE_BYTES - 1}`);
    expect(resource.size).toBe(prefix.byteLength + suffix.byteLength);
    expect(followUpRangeRequests).toEqual([`bytes=${SAMPLE_BYTES}-${SAMPLE_BYTES + suffix.byteLength - 1}`]);
    expect(bytes.byteLength).toBe(prefix.byteLength + suffix.byteLength);
    expect(bytes.subarray(0, prefix.byteLength)).toEqual(prefix);
    expect(bytes.subarray(prefix.byteLength)).toEqual(suffix);
  });
});
