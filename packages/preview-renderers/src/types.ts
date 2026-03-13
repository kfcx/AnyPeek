import type { ComponentType, LazyExoticComponent } from 'react';

import type { ResolvedPreviewResource } from '@preview/core';

export interface RendererProps {
  resource: ResolvedPreviewResource;
}

export interface PreviewRendererDescriptor {
  id: string;
  label: string;
  priority?: number;
  supports(resource: ResolvedPreviewResource): boolean;
  Component: ComponentType<RendererProps> | LazyExoticComponent<ComponentType<RendererProps>>;
}
