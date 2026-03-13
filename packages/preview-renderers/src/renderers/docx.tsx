import { useEffect, useRef, useState } from 'react';

import jsPreviewDocx from '@js-preview/docx';
import '@js-preview/docx/lib/index.css';

import { CanvasLoadingIndicator, ErrorCard } from '../common';
import type { RendererProps } from '../types';
import { resolveOfficePreviewSource } from './office-source';

export function DocxRenderer({ resource }: RendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let active = true;
    let previewer: ReturnType<typeof jsPreviewDocx.init> | null = null;
    container.innerHTML = '';
    setLoading(true);
    setError(null);

    const frameId = requestAnimationFrame(() => {
      if (!active) {
        return;
      }

      previewer = jsPreviewDocx.init(container);

      Promise.resolve(resolveOfficePreviewSource(resource))
        .then((source) => previewer?.preview(source))
        .then(() => {
          if (active) {
            setLoading(false);
          }
        })
        .catch((previewError: unknown) => {
          if (active) {
            setLoading(false);
            setError(previewError instanceof Error ? previewError.message : 'DOCX 渲染失败。');
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
    <section className="office-stage docx-stage">
      {loading ? <CanvasLoadingIndicator /> : null}
      <div ref={containerRef} className="office-mount docx-mount" />
    </section>
  );
}
