import { useCallback, useEffect, useRef, useState } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';

import {
  HEX_CHUNK_BYTES,
  INCREMENTAL_LOAD_THRESHOLD_PX,
  TEXT_ROW_HEIGHT
} from '@preview/core';

import { ErrorCard, LoadingCard } from '../common';
import type { RendererProps } from '../types';

interface HexLine {
  offset: string;
  hex: string;
  ascii: string;
}

interface HexPreviewState {
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string | null;
  lines: HexLine[];
  loadedBytes: number;
  done: boolean;
}

function formatHexOffset(offset: number): string {
  return offset.toString(16).toUpperCase().padStart(8, '0');
}

function formatHexLines(bytes: Uint8Array, startOffset: number, bytesPerRow = 16): HexLine[] {
  const lines: HexLine[] = [];

  for (let offset = 0; offset < bytes.length; offset += bytesPerRow) {
    const absoluteOffset = startOffset + offset;
    const slice = bytes.subarray(offset, offset + bytesPerRow);
    const hex = Array.from(slice)
      .map((value) => value.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ')
      .padEnd(bytesPerRow * 3 - 1, ' ');

    const ascii = Array.from(slice)
      .map((value) => (value >= 32 && value <= 126 ? String.fromCharCode(value) : '.'))
      .join('');

    lines.push({
      offset: formatHexOffset(absoluteOffset),
      hex,
      ascii
    });
  }

  return lines;
}

export function HexRenderer({ resource }: RendererProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<HexPreviewState>({
    loadingInitial: true,
    loadingMore: false,
    error: null,
    lines: [],
    loadedBytes: 0,
    done: false
  });

  const sessionRef = useRef(0);
  const loadingRef = useRef(false);
  const doneRef = useRef(false);
  const linesRef = useRef<HexLine[]>([]);
  const offsetRef = useRef(0);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || doneRef.current) {
      return;
    }

    loadingRef.current = true;
    setState((current) => ({ ...current, loadingMore: true }));
    const sessionId = sessionRef.current;

    try {
      const nextEnd = resource.size != null ? Math.min(offsetRef.current + HEX_CHUNK_BYTES, resource.size) : offsetRef.current + HEX_CHUNK_BYTES;
      const bytes = await resource.handle.readSlice(offsetRef.current, nextEnd);

      if (sessionId !== sessionRef.current) {
        return;
      }

      if (!bytes.byteLength) {
        doneRef.current = true;
      } else {
        const startOffset = offsetRef.current;
        offsetRef.current += bytes.byteLength;
        linesRef.current = linesRef.current.concat(formatHexLines(bytes, startOffset));

        const reachedEnd = resource.size != null ? offsetRef.current >= resource.size : bytes.byteLength < HEX_CHUNK_BYTES;
        if (reachedEnd) {
          doneRef.current = true;
        }
      }

      setState({
        loadingInitial: false,
        loadingMore: false,
        error: null,
        lines: [...linesRef.current],
        loadedBytes: offsetRef.current,
        done: doneRef.current
      });
    } catch (previewError) {
      if (sessionId === sessionRef.current) {
        setState((current) => ({
          ...current,
          loadingInitial: false,
          loadingMore: false,
          error: previewError instanceof Error ? previewError.message : 'Hex 视图构建失败。'
        }));
      }
    } finally {
      loadingRef.current = false;
    }
  }, [resource]);

  useEffect(() => {
    sessionRef.current += 1;
    loadingRef.current = false;
    doneRef.current = false;
    linesRef.current = [];
    offsetRef.current = 0;

    setState({
      loadingInitial: true,
      loadingMore: false,
      error: null,
      lines: [],
      loadedBytes: 0,
      done: false
    });

    void loadMore();

    return () => {
      sessionRef.current += 1;
    };
  }, [loadMore, resource.id]);

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

  const virtualizer = useVirtualizer({
    count: state.lines.length + (state.done ? 0 : 1),
    estimateSize: () => TEXT_ROW_HEIGHT,
    getScrollElement: () => viewportRef.current,
    overscan: 20
  });

  if (state.loadingInitial && state.lines.length === 0) {
    return <LoadingCard>Hex 视图加载中</LoadingCard>;
  }

  if (state.error && state.lines.length === 0) {
    return <ErrorCard message={state.error} />;
  }

  return (
    <section className="virtual-section">
      {state.error ? <div className="inline-error">{state.error}</div> : null}
      <div className="virtual-viewport" ref={viewportRef}>
        <div className="virtual-stage" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const isLoaderRow = item.index >= state.lines.length;
            if (isLoaderRow) {
              return (
                <div
                  key={item.key}
                  className="virtual-loader-row"
                  style={{ transform: `translateY(${item.start}px)`, height: item.size }}
                >
                  {state.done ? '读取完成' : '继续读取…'}
                </div>
              );
            }

            const line = state.lines[item.index];
            if (!line) {
              return null;
            }
            return (
              <div
                key={item.key}
                className="hex-row"
                style={{ transform: `translateY(${item.start}px)`, height: item.size }}
              >
                <span className="hex-offset">{line.offset}</span>
                <code className="hex-bytes">{line.hex}</code>
                <span className="hex-ascii">{line.ascii}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
