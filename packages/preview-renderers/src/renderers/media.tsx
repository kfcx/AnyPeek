import { ErrorCard, LoadingCard } from '../common';
import type { RendererProps } from '../types';
import { usePreviewObjectUrl } from '../use-preview-object-url';

export function AudioRenderer({ resource }: RendererProps) {
  const { previewUrl, loading, error } = usePreviewObjectUrl(resource);

  if (loading) {
    return <LoadingCard>音频加载中</LoadingCard>;
  }

  if (error || !previewUrl) {
    return <ErrorCard message={error || '音频加载失败。'} />;
  }

  return (
    <div className="media-shell audio">
      <audio className="media-player" controls preload="metadata" src={previewUrl} />
    </div>
  );
}

export function VideoRenderer({ resource }: RendererProps) {
  const { previewUrl, loading, error } = usePreviewObjectUrl(resource);

  if (loading) {
    return <LoadingCard>视频加载中</LoadingCard>;
  }

  if (error || !previewUrl) {
    return <ErrorCard message={error || '视频加载失败。'} />;
  }

  return (
    <div className="media-shell video">
      <video className="media-player" controls preload="metadata" src={previewUrl} />
    </div>
  );
}
