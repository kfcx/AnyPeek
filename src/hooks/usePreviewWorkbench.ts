import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

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

import { downloadBytes } from '../platform/download';
import { createTauriRemotePreviewResource, downloadTauriRemoteUrl, isTauriRuntime } from '../platform/tauri';
import { type PreviewHistoryEntry, usePreviewHistory } from './usePreviewHistory';

function readPreviewErrorMessage(error: unknown, fallback: string): string {
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

function buildRemoteDownloadTarget(
  rawUrl: string,
  transport: RemoteTransport,
  tauriRuntime: boolean,
  fileName?: string
): DownloadTarget | null {
  if (!isHttpUrl(rawUrl)) {
    return null;
  }

  if (tauriRuntime) {
    return {
      fileName,
      label: '下载当前 URL 的原文件',
      async action() {
        const remoteFile = await downloadTauriRemoteUrl(rawUrl.trim());
        downloadBytes(remoteFile.bytes, remoteFile.fileName, remoteFile.contentType);
      }
    };
  }

  return {
    href: transport.buildDownloadUrl(rawUrl.trim()),
    fileName,
    label: '下载当前 URL 的原文件'
  };
}

function buildResourceDownloadTarget(resource: ResolvedPreviewResource): DownloadTarget {
  const label = resource.source === 'remote' ? '下载当前 URL 的原文件' : '下载当前本地原文件';

  if (resource.downloadUrl) {
    return {
      href: resource.downloadUrl,
      fileName: resource.fileName,
      label
    };
  }

  return {
    fileName: resource.fileName,
    label,
    async action() {
      const bytes = await resource.handle.readAll();
      downloadBytes(bytes, resource.fileName, resource.contentType);
    }
  };
}

export interface PreviewWindowState {
  id: string;
  inputValue: string;
  busy: boolean;
  error: string | null;
  resource: ResolvedPreviewResource | null;
  createdAt: number;
  updatedAt: number;
}

export interface PreviewWorkbenchState {
  windows: PreviewWindowState[];
  activeWindowId: string;
  activeWindow: PreviewWindowState;
  history: PreviewHistoryEntry[];
  inputValue: string;
  setInputValue(value: string): void;
  busy: boolean;
  error: string | null;
  resource: ResolvedPreviewResource | null;
  downloadTarget: DownloadTarget | null;
  createWindow(): string;
  closeWindow(windowId: string): void;
  selectWindow(windowId: string): void;
  removeHistoryEntry(id: string): void;
  clearHistory(): void;
  openHistoryEntry(entry: PreviewHistoryEntry): Promise<void>;
  previewRemote(rawUrl?: string): Promise<void>;
  previewLocal(file: File): Promise<void>;
}

const PREVIEW_ERROR_TOAST_ID = 'preview-error';

let windowIdSeed = 0;

function createWindowId(): string {
  windowIdSeed += 1;
  return `preview-window:${Date.now().toString(36)}:${windowIdSeed.toString(36)}`;
}

function createPreviewWindowState(id = createWindowId()): PreviewWindowState {
  const now = Date.now();
  return {
    id,
    inputValue: '',
    busy: false,
    error: null,
    resource: null,
    createdAt: now,
    updatedAt: now
  };
}

function getWindowQueryUrl(windowState: PreviewWindowState): string | null {
  return windowState.resource?.source === 'remote' ? windowState.resource.inputValue : null;
}

export function usePreviewWorkbench(): PreviewWorkbenchState {
  const tauriRuntime = useMemo(() => isTauriRuntime(), []);
  const transport = useMemo(
    () => createProxyRemoteTransport(import.meta.env.VITE_REMOTE_PROXY_BASE || DEFAULT_PROXY_BASE),
    []
  );
  const {
    entries: history,
    pushResource: pushHistoryResource,
    removeEntry: removeHistoryEntry,
    clearEntries: clearHistory
  } = usePreviewHistory();

  const initialWindowIdRef = useRef<string | null>(null);
  if (initialWindowIdRef.current == null) {
    initialWindowIdRef.current = createWindowId();
  }

  const [windows, setWindowsState] = useState<PreviewWindowState[]>(() => [
    createPreviewWindowState(initialWindowIdRef.current!)
  ]);
  const windowsRef = useRef(windows);
  const [activeWindowId, setActiveWindowIdState] = useState(() => initialWindowIdRef.current!);
  const activeWindowIdRef = useRef(activeWindowId);
  const requestIdsRef = useRef(new Map<string, number>());
  const hydratedFromQueryRef = useRef(false);
  const disposedRef = useRef(false);

  const commitWindows = useCallback((nextWindows: PreviewWindowState[]) => {
    windowsRef.current = nextWindows;
    setWindowsState(nextWindows);
  }, []);

  const updateWindows = useCallback(
    (updater: (current: PreviewWindowState[]) => PreviewWindowState[]) => {
      const current = windowsRef.current;
      const next = updater(current);
      if (next === current) {
        return;
      }
      commitWindows(next);
    },
    [commitWindows]
  );

  const commitActiveWindowId = useCallback((nextWindowId: string) => {
    activeWindowIdRef.current = nextWindowId;
    setActiveWindowIdState(nextWindowId);
  }, []);

  const updateWindow = useCallback(
    (windowId: string, updater: (windowState: PreviewWindowState) => PreviewWindowState) => {
      updateWindows((current) => {
        let changed = false;
        const next = current.map((windowState) => {
          if (windowState.id !== windowId) {
            return windowState;
          }

          changed = true;
          return updater(windowState);
        });

        return changed ? next : current;
      });
    },
    [updateWindows]
  );

  const updateUrlQuery = useCallback((rawUrl: string | null) => {
    const current = new URL(window.location.href);
    if (rawUrl) {
      current.searchParams.set('url', rawUrl);
    } else {
      current.searchParams.delete('url');
    }
    window.history.replaceState({}, '', current);
  }, []);

  const syncUrlQueryForWindow = useCallback(
    (windowState: PreviewWindowState) => {
      updateUrlQuery(getWindowQueryUrl(windowState));
    },
    [updateUrlQuery]
  );

  const showErrorToast = useCallback((message: string) => {
    toast.error(message, {
      id: PREVIEW_ERROR_TOAST_ID
    });
  }, []);

  const nextRequestId = useCallback((windowId: string) => {
    const nextId = (requestIdsRef.current.get(windowId) ?? 0) + 1;
    requestIdsRef.current.set(windowId, nextId);
    return nextId;
  }, []);

  const isCurrentRequest = useCallback((windowId: string, requestId: number) => {
    return (
      !disposedRef.current &&
      requestIdsRef.current.get(windowId) === requestId &&
      windowsRef.current.some((item) => item.id === windowId)
    );
  }, []);

  const createWindow = useCallback(() => {
    const nextWindow = createPreviewWindowState();
    commitWindows([...windowsRef.current, nextWindow]);
    commitActiveWindowId(nextWindow.id);
    syncUrlQueryForWindow(nextWindow);
    return nextWindow.id;
  }, [commitActiveWindowId, commitWindows, syncUrlQueryForWindow]);

  const selectWindow = useCallback(
    (windowId: string) => {
      const nextWindow = windowsRef.current.find((item) => item.id === windowId);
      if (!nextWindow) {
        return;
      }

      commitActiveWindowId(windowId);
      syncUrlQueryForWindow(nextWindow);
    },
    [commitActiveWindowId, syncUrlQueryForWindow]
  );

  const closeWindow = useCallback(
    (windowId: string) => {
      const currentWindows = windowsRef.current;
      const closingIndex = currentWindows.findIndex((item) => item.id === windowId);
      if (closingIndex < 0) {
        return;
      }

      const closingWindow = currentWindows[closingIndex];
      closingWindow.resource?.handle.dispose?.();
      requestIdsRef.current.delete(windowId);

      const remainingWindows = currentWindows.filter((item) => item.id !== windowId);
      const nextWindows = remainingWindows.length > 0 ? remainingWindows : [createPreviewWindowState()];
      let nextActiveWindowId = activeWindowIdRef.current;

      if (!nextWindows.some((item) => item.id === nextActiveWindowId)) {
        nextActiveWindowId = nextWindows[Math.min(closingIndex, nextWindows.length - 1)]!.id;
      }

      commitWindows(nextWindows);
      commitActiveWindowId(nextActiveWindowId);
      syncUrlQueryForWindow(nextWindows.find((item) => item.id === nextActiveWindowId) ?? nextWindows[0]!);
    },
    [commitActiveWindowId, commitWindows, syncUrlQueryForWindow]
  );

  const setInputValue = useCallback(
    (value: string) => {
      const windowId = activeWindowIdRef.current;
      updateWindow(windowId, (windowState) => ({
        ...windowState,
        inputValue: value,
        updatedAt: Date.now()
      }));
    },
    [updateWindow]
  );

  const commitResourceToWindow = useCallback(
    (windowId: string, nextResource: ResolvedPreviewResource) => {
      const currentWindow = windowsRef.current.find((item) => item.id === windowId);
      if (!currentWindow) {
        nextResource.handle.dispose?.();
        return;
      }

      currentWindow.resource?.handle.dispose?.();

      const updatedWindow: PreviewWindowState = {
        ...currentWindow,
        inputValue: nextResource.inputValue,
        busy: false,
        error: null,
        resource: nextResource,
        updatedAt: Date.now()
      };

      updateWindow(windowId, () => updatedWindow);
      pushHistoryResource(nextResource);

      if (activeWindowIdRef.current === windowId) {
        syncUrlQueryForWindow(updatedWindow);
      }
    },
    [pushHistoryResource, syncUrlQueryForWindow, updateWindow]
  );

  const previewRemote = useCallback(
    async (rawUrl?: string) => {
      const windowId = activeWindowIdRef.current;
      const targetWindow = windowsRef.current.find((item) => item.id === windowId);
      const nextUrl = String(rawUrl ?? targetWindow?.inputValue ?? '').trim();
      if (!isHttpUrl(nextUrl)) {
        const message = '请输入完整的 http 或 https 地址。';
        updateWindow(windowId, (windowState) => ({
          ...windowState,
          busy: false,
          error: message,
          updatedAt: Date.now()
        }));
        showErrorToast(message);
        return;
      }

      const requestId = nextRequestId(windowId);
      updateWindow(windowId, (windowState) => ({
        ...windowState,
        inputValue: nextUrl,
        busy: true,
        error: null,
        updatedAt: Date.now()
      }));
      toast.dismiss(PREVIEW_ERROR_TOAST_ID);

      try {
        const nextResource = tauriRuntime
          ? await createTauriRemotePreviewResource(nextUrl)
          : await createRemotePreviewResource(nextUrl, transport);
        if (!isCurrentRequest(windowId, requestId)) {
          nextResource.handle.dispose?.();
          return;
        }

        commitResourceToWindow(windowId, nextResource);
      } catch (previewError) {
        if (isCurrentRequest(windowId, requestId)) {
          const message = readPreviewErrorMessage(previewError, '远程预览失败。');
          updateWindow(windowId, (windowState) => ({
            ...windowState,
            busy: false,
            error: message,
            updatedAt: Date.now()
          }));
          showErrorToast(message);
        }
      } finally {
        if (isCurrentRequest(windowId, requestId)) {
          updateWindow(windowId, (windowState) => ({
            ...windowState,
            busy: false,
            updatedAt: Date.now()
          }));
        }
      }
    },
    [
      commitResourceToWindow,
      isCurrentRequest,
      nextRequestId,
      showErrorToast,
      tauriRuntime,
      transport,
      updateWindow
    ]
  );

  const previewLocal = useCallback(
    async (file: File) => {
      const windowId = activeWindowIdRef.current;
      const requestId = nextRequestId(windowId);
      updateWindow(windowId, (windowState) => ({
        ...windowState,
        inputValue: file.name || 'local-file',
        busy: true,
        error: null,
        updatedAt: Date.now()
      }));
      toast.dismiss(PREVIEW_ERROR_TOAST_ID);

      try {
        const nextResource = await createLocalPreviewResource(file);
        if (!isCurrentRequest(windowId, requestId)) {
          nextResource.handle.dispose?.();
          return;
        }

        commitResourceToWindow(windowId, nextResource);
      } catch (previewError) {
        if (isCurrentRequest(windowId, requestId)) {
          const message = readPreviewErrorMessage(previewError, '本地文件预览失败。');
          updateWindow(windowId, (windowState) => ({
            ...windowState,
            busy: false,
            error: message,
            updatedAt: Date.now()
          }));
          showErrorToast(message);
        }
      } finally {
        if (isCurrentRequest(windowId, requestId)) {
          updateWindow(windowId, (windowState) => ({
            ...windowState,
            busy: false,
            updatedAt: Date.now()
          }));
        }
      }
    },
    [commitResourceToWindow, isCurrentRequest, nextRequestId, showErrorToast, updateWindow]
  );

  const openHistoryEntry = useCallback(
    async (entry: PreviewHistoryEntry) => {
      if (entry.source !== 'remote') {
        toast('本地文件历史仅保留记录，请重新选择文件。');
        return;
      }

      await previewRemote(entry.inputValue);
    },
    [previewRemote]
  );

  useEffect(() => {
    if (hydratedFromQueryRef.current) {
      return;
    }

    hydratedFromQueryRef.current = true;
    const initialUrl = new URLSearchParams(window.location.search).get('url');
    if (initialUrl && isHttpUrl(initialUrl)) {
      void previewRemote(initialUrl);
    }
  }, [previewRemote]);

  useEffect(() => {
    disposedRef.current = false;

    return () => {
      disposedRef.current = true;
      for (const windowState of windowsRef.current) {
        windowState.resource?.handle.dispose?.();
      }
    };
  }, []);

  const activeWindow = useMemo<PreviewWindowState>(
    () => windows.find((windowState) => windowState.id === activeWindowId) ?? windows[0]!,
    [activeWindowId, windows]
  );

  const downloadTarget = useMemo(() => {
    if (activeWindow.resource && activeWindow.inputValue.trim() === activeWindow.resource.inputValue.trim()) {
      return buildResourceDownloadTarget(activeWindow.resource);
    }

    return buildRemoteDownloadTarget(activeWindow.inputValue, transport, tauriRuntime);
  }, [activeWindow, tauriRuntime, transport]);

  return {
    windows,
    activeWindowId,
    activeWindow,
    history,
    inputValue: activeWindow.inputValue,
    setInputValue,
    busy: activeWindow.busy,
    error: activeWindow.error,
    resource: activeWindow.resource,
    downloadTarget,
    createWindow,
    closeWindow,
    selectWindow,
    removeHistoryEntry,
    clearHistory,
    openHistoryEntry,
    previewRemote,
    previewLocal
  };
}
