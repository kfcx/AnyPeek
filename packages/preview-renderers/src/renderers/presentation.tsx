import { useEffect, useRef, useState } from 'react';

import { PRESENTATION_HEIGHT, PRESENTATION_WIDTH, toArrayBuffer } from '@preview/core';
import { init } from 'pptx-preview';

import { CanvasLoadingIndicator, ErrorCard } from '../common';
import type { RendererProps } from '../types';

export function PresentationRenderer({ resource }: RendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let active = true;
    let previewer: ReturnType<typeof init> | null = null;
    container.innerHTML = '';
    setLoading(true);
    setError(null);

    const frameId = requestAnimationFrame(() => {
      if (!active) {
        return;
      }

      previewer = init(container, {
        width: PRESENTATION_WIDTH,
        height: PRESENTATION_HEIGHT
      });

      void resource.handle
        .readAll()
        .then((bytes) => Promise.resolve(previewer?.preview(toArrayBuffer(bytes))))
        .then(() => {
          if (active) {
            setLoading(false);
          }
        })
        .catch((previewError: unknown) => {
          if (active) {
            setLoading(false);
            setError(previewError instanceof Error ? previewError.message : 'PPTX 渲染失败。');
          }
        });
    });

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
      try {
        previewer?.destroy?.();
      } catch {
        // noop
      }
      container.innerHTML = '';
    };
  }, [resource]);

  if (error) {
    return <ErrorCard message={error} />;
  }

  return (
    <section className="office-stage presentation-stage">
      {loading ? <CanvasLoadingIndicator /> : null}
      <div ref={containerRef} className="office-mount presentation-mount" />
    </section>
  );
}
