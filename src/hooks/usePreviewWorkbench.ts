import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_PROXY_BASE,
  createLocalPreviewResource,
  createProxyRemoteTransport,
  createRemotePreviewResource,
  isHttpUrl,
  type DownloadTarget,
  type ResolvedPreviewResource,
  type RemoteTransport
} from '@preview/core';

function buildRemoteDownloadTarget(rawUrl: string, transport: RemoteTransport, fileName?: string): DownloadTarget | null {
  if (!isHttpUrl(rawUrl)) {
    return null;
  }

  return {
    href: transport.buildDownloadUrl(rawUrl.trim()),
    fileName,
    label: '下载当前 URL 的原文件'
  };
}

export interface PreviewWorkbenchState {
  inputValue: string;
  setInputValue(value: string): void;
  busy: boolean;
  error: string | null;
  resource: ResolvedPreviewResource | null;
  downloadTarget: DownloadTarget | null;
  previewRemote(rawUrl?: string): Promise<void>;
  previewLocal(file: File): Promise<void>;
  clearError(): void;
}

export function usePreviewWorkbench(): PreviewWorkbenchState {
  const transport = useMemo(
    () => createProxyRemoteTransport(import.meta.env.VITE_REMOTE_PROXY_BASE || DEFAULT_PROXY_BASE),
    []
  );

  const [inputValueState, setInputValueState] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resource, setResource] = useState<ResolvedPreviewResource | null>(null);

  const inputValueRef = useRef('');
  const requestIdRef = useRef(0);
  const resourceRef = useRef<ResolvedPreviewResource | null>(null);
  const hydratedFromQueryRef = useRef(false);

  const setInputValue = useCallback((value: string) => {
    inputValueRef.current = value;
    setInputValueState(value);
  }, []);

  const replaceResource = useCallback((next: ResolvedPreviewResource | null) => {
    resourceRef.current?.handle.dispose?.();
    resourceRef.current = next;
    setResource(next);
  }, []);

  const updateUrlQuery = useCallback((rawUrl: string | null) => {
    const current = new URL(window.location.href);
    if (rawUrl) {
      current.searchParams.set('url', rawUrl);
    } else {
      current.searchParams.delete('url');
    }
    window.history.replaceState({}, '', current);
  }, []);

  const previewRemote = useCallback(
    async (rawUrl?: string) => {
      const nextUrl = String(rawUrl ?? inputValueRef.current).trim();
      if (!isHttpUrl(nextUrl)) {
        setError('请输入完整的 http 或 https 地址。');
        return;
      }

      const requestId = ++requestIdRef.current;
      setBusy(true);
      setError(null);
      replaceResource(null);

      try {
        const nextResource = await createRemotePreviewResource(nextUrl, transport);
        if (requestId !== requestIdRef.current) {
          nextResource.handle.dispose?.();
          return;
        }

        setInputValue(nextUrl);
        updateUrlQuery(nextUrl);
        replaceResource(nextResource);
      } catch (previewError) {
        if (requestId === requestIdRef.current) {
          setError(previewError instanceof Error ? previewError.message : '远程预览失败。');
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setBusy(false);
        }
      }
    },
    [replaceResource, setInputValue, transport, updateUrlQuery]
  );

  const previewLocal = useCallback(
    async (file: File) => {
      const requestId = ++requestIdRef.current;
      setBusy(true);
      setError(null);
      replaceResource(null);

      try {
        const nextResource = await createLocalPreviewResource(file);
        if (requestId !== requestIdRef.current) {
          nextResource.handle.dispose?.();
          return;
        }

        setInputValue(file.name || 'local-file');
        updateUrlQuery(null);
        replaceResource(nextResource);
      } catch (previewError) {
        if (requestId === requestIdRef.current) {
          setError(previewError instanceof Error ? previewError.message : '本地文件预览失败。');
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setBusy(false);
        }
      }
    },
    [replaceResource, setInputValue, updateUrlQuery]
  );

  useEffect(() => {
    if (hydratedFromQueryRef.current) {
      return;
    }

    hydratedFromQueryRef.current = true;
    const initialUrl = new URLSearchParams(window.location.search).get('url');
    if (initialUrl && isHttpUrl(initialUrl)) {
      setInputValue(initialUrl);
      void previewRemote(initialUrl);
    }
  }, [previewRemote, setInputValue]);

  useEffect(() => {
    return () => {
      resourceRef.current?.handle.dispose?.();
    };
  }, []);

  const downloadTarget = useMemo(() => {
    if (resource && inputValueState.trim() === resource.inputValue.trim()) {
      return {
        href: resource.downloadUrl,
        fileName: resource.fileName,
        label: resource.source === 'remote' ? '下载当前 URL 的原文件' : '下载当前本地原文件'
      } satisfies DownloadTarget;
    }

    return buildRemoteDownloadTarget(inputValueState, transport);
  }, [inputValueState, resource, transport]);

  return {
    inputValue: inputValueState,
    setInputValue,
    busy,
    error,
    resource,
    downloadTarget,
    previewRemote,
    previewLocal,
    clearError() {
      setError(null);
    }
  };
}
