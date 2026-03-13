import type { RendererProps } from '../types';

export function AudioRenderer({ resource }: RendererProps) {
  return (
    <div className="media-shell audio">
      <audio className="media-player" controls preload="metadata" src={resource.previewUrl} />
    </div>
  );
}

export function VideoRenderer({ resource }: RendererProps) {
  return (
    <div className="media-shell video">
      <video className="media-player" controls preload="metadata" src={resource.previewUrl} />
    </div>
  );
}
