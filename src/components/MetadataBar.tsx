import { formatBytes, normalizeContentType } from '@preview/core';
import type { ResolvedPreviewResource } from '@preview/core';

interface MetadataBarProps {
  resource: ResolvedPreviewResource;
}

export function MetadataBar({ resource }: MetadataBarProps) {
  const normalizedContentType = normalizeContentType(resource.contentType);
  const showSniffedMime = resource.diagnostics.sniffedMime && resource.diagnostics.sniffedMime !== normalizedContentType;

  return (
    <section className="meta-bar">
      <div className="meta-title-block">
        <strong title={resource.fileName}>{resource.fileName}</strong>
      </div>
      <div className="meta-pills">
        <span className="meta-pill">{resource.source === 'remote' ? '远程资源' : '本地文件'}</span>
        <span className="meta-pill">{resource.kind}</span>
        <span className="meta-pill">{formatBytes(resource.size)}</span>
        {showSniffedMime ? <span className="meta-pill accent">魔数识别：{resource.diagnostics.sniffedMime}</span> : null}
      </div>
    </section>
  );
}
