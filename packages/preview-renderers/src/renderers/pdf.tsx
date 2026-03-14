import { ErrorCard, LoadingCard } from '../common';
import type { RendererProps } from '../types';
import { usePreviewObjectUrl } from '../use-preview-object-url';

export function PdfRenderer({ resource }: RendererProps) {
  const { previewUrl, loading, error } = usePreviewObjectUrl(resource);

  if (loading) {
    return <LoadingCard>PDF 加载中</LoadingCard>;
  }

  if (error || !previewUrl) {
    return <ErrorCard message={error || 'PDF 加载失败。'} />;
  }

  return <iframe className="browser-frame" loading="lazy" referrerPolicy="no-referrer" src={previewUrl} title={resource.fileName} />;
}
