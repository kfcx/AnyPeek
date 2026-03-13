import { lazy } from 'react';
import type { ResolvedPreviewResource } from '@preview/core';

import { AudioRenderer, VideoRenderer } from './renderers/media';
import { HexRenderer } from './renderers/hex';
import { ImageRenderer } from './renderers/image';
import { LegacyOfficeRenderer } from './renderers/legacy-office';
import { PdfRenderer } from './renderers/pdf';
import { TextRenderer } from './renderers/text';
import type { PreviewRendererDescriptor } from './types';

const DocxRenderer = lazy(async () => ({ default: (await import('./renderers/docx')).DocxRenderer }));
const PresentationRenderer = lazy(async () => ({ default: (await import('./renderers/presentation')).PresentationRenderer }));
const SpreadsheetRenderer = lazy(async () => ({ default: (await import('./renderers/spreadsheet')).SpreadsheetRenderer }));

const registry: PreviewRendererDescriptor[] = [
  {
    id: 'image',
    label: '图片预览',
    supports: (resource) => resource.kind === 'image',
    Component: ImageRenderer
  },
  {
    id: 'audio',
    label: '音频预览',
    supports: (resource) => resource.kind === 'audio',
    Component: AudioRenderer
  },
  {
    id: 'video',
    label: '视频预览',
    supports: (resource) => resource.kind === 'video',
    Component: VideoRenderer
  },
  {
    id: 'pdf',
    label: 'PDF 预览',
    supports: (resource) => resource.kind === 'pdf',
    Component: PdfRenderer
  },
  {
    id: 'docx',
    label: 'DOCX 预览',
    supports: (resource) => resource.kind === 'docx',
    Component: DocxRenderer
  },
  {
    id: 'presentation',
    label: 'PPTX 预览',
    supports: (resource) => resource.kind === 'presentation',
    Component: PresentationRenderer
  },
  {
    id: 'spreadsheet',
    label: '表格预览',
    supports: (resource) => resource.kind === 'spreadsheet',
    Component: SpreadsheetRenderer
  },
  {
    id: 'text',
    label: '文本预览',
    supports: (resource) => resource.kind === 'text' || resource.kind === 'json',
    Component: TextRenderer
  },
  {
    id: 'legacy-office',
    label: 'Native Fallback',
    supports: (resource) => resource.kind === 'legacy-office',
    Component: LegacyOfficeRenderer
  },
  {
    id: 'hex',
    label: 'Hex 视图',
    supports: () => true,
    Component: HexRenderer
  }
];

export function resolveRenderer(resource: ResolvedPreviewResource): PreviewRendererDescriptor {
  return registry.find((item) => item.supports(resource)) ?? registry[registry.length - 1];
}

export function listRegisteredRenderers(): PreviewRendererDescriptor[] {
  return [...registry];
}
