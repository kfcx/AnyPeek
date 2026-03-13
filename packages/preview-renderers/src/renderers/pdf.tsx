import type { RendererProps } from '../types';

export function PdfRenderer({ resource }: RendererProps) {
  return <iframe className="browser-frame" loading="lazy" referrerPolicy="no-referrer" src={resource.previewUrl} title={resource.fileName} />;
}
