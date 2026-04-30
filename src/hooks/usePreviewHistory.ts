import { useCallback, useEffect, useState } from 'react';

import type { PreviewKind, ResolvedPreviewResource, ResourceOrigin } from '@preview/core';

export const PREVIEW_HISTORY_LIMIT = 100;

const PREVIEW_HISTORY_STORAGE_KEY = 'anypeek.preview-history.v1';

export interface PreviewHistoryEntry {
  id: string;
  source: ResourceOrigin;
  inputValue: string;
  title: string;
  fileName: string;
  kind: PreviewKind;
  contentType: string;
  size: number | null;
  openedAt: number;
}

function createHistoryEntryId(source: ResourceOrigin, inputValue: string): string {
  return `${source}:${inputValue}`;
}

function isPreviewHistoryEntry(value: unknown): value is PreviewHistoryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as PreviewHistoryEntry;
  return (
    typeof entry.id === 'string' &&
    (entry.source === 'local' || entry.source === 'remote') &&
    typeof entry.inputValue === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.fileName === 'string' &&
    typeof entry.kind === 'string' &&
    typeof entry.contentType === 'string' &&
    (entry.size == null || typeof entry.size === 'number') &&
    typeof entry.openedAt === 'number'
  );
}

function readStoredHistory(): PreviewHistoryEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(PREVIEW_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isPreviewHistoryEntry).slice(0, PREVIEW_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function persistHistory(entries: PreviewHistoryEntry[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(PREVIEW_HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage may be unavailable in private or embedded contexts.
  }
}

export function createPreviewHistoryEntry(
  resource: ResolvedPreviewResource,
  openedAt = Date.now()
): PreviewHistoryEntry {
  const inputValue = resource.inputValue || resource.fileName;

  return {
    id: createHistoryEntryId(resource.source, inputValue),
    source: resource.source,
    inputValue,
    title: resource.fileName || inputValue,
    fileName: resource.fileName,
    kind: resource.kind,
    contentType: resource.contentType,
    size: resource.size,
    openedAt
  };
}

export function upsertPreviewHistoryEntry(
  entries: PreviewHistoryEntry[],
  nextEntry: PreviewHistoryEntry
): PreviewHistoryEntry[] {
  return [nextEntry, ...entries.filter((entry) => entry.id !== nextEntry.id)].slice(0, PREVIEW_HISTORY_LIMIT);
}

export function usePreviewHistory() {
  const [entries, setEntries] = useState<PreviewHistoryEntry[]>(() => readStoredHistory());

  useEffect(() => {
    persistHistory(entries);
  }, [entries]);

  const pushResource = useCallback((resource: ResolvedPreviewResource) => {
    setEntries((current) => upsertPreviewHistoryEntry(current, createPreviewHistoryEntry(resource)));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const clearEntries = useCallback(() => {
    setEntries([]);
  }, []);

  return {
    entries,
    pushResource,
    removeEntry,
    clearEntries
  };
}
