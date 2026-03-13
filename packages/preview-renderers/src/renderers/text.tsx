import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';

import {
  INCREMENTAL_LOAD_THRESHOLD_PX,
  TEXT_CHUNK_BYTES,
  TEXT_ROW_HEIGHT,
  extractCharset,
  resolveTextEncoding
} from '@preview/core';

import { ErrorCard, LoadingCard } from '../common';
import type { RendererProps } from '../types';

interface TextPreviewState {
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string | null;
  lines: string[];
  trailingLine: string;
  done: boolean;
}

export function TextRenderer({ resource }: RendererProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const encoding = useMemo(() => {
    const candidate = resolveTextEncoding(resource.sampleBytes, extractCharset(resource.contentType));

    try {
      new TextDecoder(candidate);
      return candidate;
    } catch {
      return 'utf-8';
    }
  }, [resource.contentType, resource.sampleBytes]);

  const [state, setState] = useState<TextPreviewState>({
    loadingInitial: true,
    loadingMore: false,
    error: null,
    lines: [],
    trailingLine: '',
    done: false
  });

  const sessionRef = useRef(0);
  const loadingRef = useRef(false);
  const doneRef = useRef(false);
  const linesRef = useRef<string[]>([]);
  const offsetRef = useRef(0);
  const carryRef = useRef('');
  const decoderRef = useRef<TextDecoder | null>(null);

  const syncState = useCallback(
    (next: Pick<TextPreviewState, 'loadingInitial' | 'loadingMore' | 'error'>) => {
      setState({
        ...next,
        lines: [...linesRef.current],
        trailingLine: carryRef.current,
        done: doneRef.current
      });
    },
    []
  );

  const loadMore = useCallback(async () => {
    if (loadingRef.current || doneRef.current) {
      return;
    }

    loadingRef.current = true;
    setState((current) => ({ ...current, loadingMore: true }));
    const sessionId = sessionRef.current;

    try {
      const nextEnd = resource.size != null ? Math.min(offsetRef.current + TEXT_CHUNK_BYTES, resource.size) : offsetRef.current + TEXT_CHUNK_BYTES;
      const bytes = await resource.handle.readSlice(offsetRef.current, nextEnd);

      if (sessionId !== sessionRef.current) {
        return;
      }

      if (!bytes.byteLength) {
        const tail = `${carryRef.current}${decoderRef.current?.decode() ?? ''}`;
        if (tail) {
          linesRef.current = linesRef.current.concat(tail.replace(/\r\n?/g, '\n').split('\n'));
        }
        carryRef.current = '';
        doneRef.current = true;
      } else {
        offsetRef.current += bytes.byteLength;
        const decoded = decoderRef.current?.decode(bytes, { stream: true }) ?? '';
        const normalized = `${carryRef.current}${decoded}`.replace(/\r\n?/g, '\n');
        const parts = normalized.split('\n');
        carryRef.current = parts.pop() ?? '';

        if (parts.length) {
          linesRef.current = linesRef.current.concat(parts);
        }

        const reachedEnd = resource.size != null ? offsetRef.current >= resource.size : bytes.byteLength < TEXT_CHUNK_BYTES;
        if (reachedEnd) {
          const tail = `${carryRef.current}${decoderRef.current?.decode() ?? ''}`;
          if (tail) {
            linesRef.current = linesRef.current.concat(tail.replace(/\r\n?/g, '\n').split('\n'));
          }
          carryRef.current = '';
          doneRef.current = true;
        }
      }

      syncState({
        loadingInitial: false,
        loadingMore: false,
        error: null
      });
    } catch (previewError) {
      if (sessionId === sessionRef.current) {
        syncState({
          loadingInitial: false,
          loadingMore: false,
          error: previewError instanceof Error ? previewError.message : '文本预览失败。'
        });
      }
    } finally {
      loadingRef.current = false;
    }
  }, [resource, syncState]);

  useEffect(() => {
    sessionRef.current += 1;
    loadingRef.current = false;
    doneRef.current = false;
    linesRef.current = [];
    offsetRef.current = 0;
    carryRef.current = '';
    decoderRef.current = new TextDecoder(encoding, { fatal: false });

    setState({
      loadingInitial: true,
      loadingMore: false,
      error: null,
      lines: [],
      trailingLine: '',
      done: false
    });

    void loadMore();

    return () => {
      sessionRef.current += 1;
    };
  }, [encoding, loadMore, resource.id]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const handleScroll = () => {
      const remain = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      if (remain <= INCREMENTAL_LOAD_THRESHOLD_PX) {
        void loadMore();
      }
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, [loadMore, state.lines.length]);

  const visibleLineCount = state.lines.length + (state.trailingLine ? 1 : 0);
  const rowCount = visibleLineCount + (state.done ? 0 : 1);
  const virtualizer = useVirtualizer({
    count: rowCount,
    estimateSize: () => TEXT_ROW_HEIGHT,
    getScrollElement: () => viewportRef.current,
    overscan: 30
  });
  const virtualRows = virtualizer.getVirtualItems();
  const paddingTop = virtualRows.length ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length ? Math.max(0, virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end) : 0;

  if (state.loadingInitial && visibleLineCount === 0) {
    return <LoadingCard>文本加载中</LoadingCard>;
  }

  if (state.error && visibleLineCount === 0) {
    return <ErrorCard message={state.error} />;
  }

  return (
    <section className="virtual-section">
      {state.error ? <div className="inline-error">{state.error}</div> : null}
      <div className="virtual-viewport" ref={viewportRef}>
        <div className="text-virtual-list">
          {paddingTop > 0 ? <div style={{ height: paddingTop }} /> : null}
          {virtualRows.map((item) => {
            const isLoaderRow = item.index >= visibleLineCount;
            if (isLoaderRow) {
              return (
                <div key={item.key} className="text-loader-row" style={{ height: item.size }}>
                  {state.done ? '读取完成' : '继续读取…'}
                </div>
              );
            }

            const line = item.index < state.lines.length ? state.lines[item.index] ?? '' : state.trailingLine;
            return (
              <div key={item.key} className="text-row" style={{ minHeight: item.size }}>
                <span className="text-row-number">{item.index + 1}</span>
                <pre className="text-row-content">{line || ' '}</pre>
              </div>
            );
          })}
          {paddingBottom > 0 ? <div style={{ height: paddingBottom }} /> : null}
        </div>
      </div>
    </section>
  );
}
