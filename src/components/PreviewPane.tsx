import { Suspense } from 'react';

import { LoadingCard, resolveRenderer } from '@preview/renderers';
import type { ResolvedPreviewResource } from '@preview/core';

interface PreviewPaneProps {
  resource: ResolvedPreviewResource;
}

export function PreviewPane({ resource }: PreviewPaneProps) {
  const renderer = resolveRenderer(resource);
  const RendererComponent = renderer.Component;

  return (
    <section className="preview-stack">
      <Suspense
        fallback={
          <LoadingCard>加载预览器</LoadingCard>
        }
      >
        <RendererComponent resource={resource} />
      </Suspense>
    </section>
  );
}
