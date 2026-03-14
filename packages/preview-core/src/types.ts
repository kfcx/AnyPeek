export type ResourceOrigin = 'local' | 'remote';

export type PreviewKind =
  | 'pdf'
  | 'image'
  | 'audio'
  | 'video'
  | 'docx'
  | 'presentation'
  | 'spreadsheet'
  | 'json'
  | 'text'
  | 'hex'
  | 'legacy-office';

export interface PreviewProbeInput {
  fileName: string;
  fileExtension?: string;
  contentType: string;
  sniffedMime?: string;
  sniffedExt?: string;
  sampleBytes: Uint8Array;
}

export interface PreviewResourceHandle {
  readAll(maxBytes?: number): Promise<Uint8Array>;
  readSlice(start: number, endExclusive: number): Promise<Uint8Array>;
  dispose?(): void;
}

export interface ResolvedPreviewResource {
  id: string;
  source: ResourceOrigin;
  inputValue: string;
  kind: PreviewKind;
  fileName: string;
  extension: string;
  contentType: string;
  size: number | null;
  previewUrl: string;
  downloadUrl: string;
  sampleBytes: Uint8Array;
  handle: PreviewResourceHandle;
  diagnostics: {
    sniffedMime: string;
    sniffedExt: string;
  };
}

export interface DownloadTarget {
  href?: string;
  fileName?: string;
  label: string;
  action?: () => Promise<void> | void;
}
