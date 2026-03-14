import { describe, expect, it } from 'vitest';

import { assertSafeTargetUrl, isPrivateIp, sanitizeProxyResponseHeaders } from './remote-proxy';

describe('remote proxy security', () => {
  it('detects private IPs', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('192.168.0.10')).toBe(true);
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('100.64.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
  });

  it('blocks localhost and private addresses', async () => {
    await expect(assertSafeTargetUrl('http://localhost:3000/demo.txt')).rejects.toThrow();
    await expect(assertSafeTargetUrl('http://192.168.10.10/demo.txt')).rejects.toThrow();
  });

  it('blocks localhost with a trailing dot and private mapped IPv6 literals', async () => {
    await expect(assertSafeTargetUrl('http://localhost./demo.txt')).rejects.toThrow();
    await expect(assertSafeTargetUrl('http://[::ffff:127.0.0.1]/demo.txt')).rejects.toThrow();
  });

  it('blocks hostnames that resolve to private addresses when a resolver is provided', async () => {
    await expect(
      assertSafeTargetUrl('https://example.com/demo.txt', {
        resolveHostname: async () => ['127.0.0.1']
      })
    ).rejects.toThrow();
  });

  it('strips unsafe upstream response headers', () => {
    const input = new Headers({
      'content-security-policy': "default-src 'none'",
      'content-type': 'text/html; charset=utf-8',
      'set-cookie': 'session=abc',
      etag: '"demo"',
      'accept-ranges': 'bytes'
    });

    const output = sanitizeProxyResponseHeaders(input);

    expect(output.get('content-security-policy')).toBeNull();
    expect(output.get('set-cookie')).toBeNull();
    expect(output.get('content-type')).toBe('text/html; charset=utf-8');
    expect(output.get('etag')).toBe('"demo"');
    expect(output.get('accept-ranges')).toBe('bytes');
  });

  it('drops content-encoding and stale content-length for inflated responses', () => {
    const input = new Headers({
      'content-encoding': 'gzip',
      'content-length': '1234',
      'content-type': 'text/html; charset=utf-8'
    });

    const output = sanitizeProxyResponseHeaders(input);

    expect(output.get('content-encoding')).toBeNull();
    expect(output.get('content-length')).toBeNull();
    expect(output.get('content-type')).toBe('text/html; charset=utf-8');
  });
});
