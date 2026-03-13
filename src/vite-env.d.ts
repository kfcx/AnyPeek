/// <reference types="vite/client" />

declare module '@js-preview/docx' {
  export interface JsPreviewDocxInstance {
    preview(source: string | Blob | ArrayBuffer | Uint8Array): Promise<unknown> | unknown;
    destroy?(): void;
  }

  const jsPreviewDocx: {
    init(container: HTMLElement, options?: Record<string, unknown>, requestOptions?: Record<string, unknown>): JsPreviewDocxInstance;
  };

  export default jsPreviewDocx;
}

declare module '@js-preview/excel' {
  export interface JsPreviewExcelInstance {
    preview(source: string | Blob | ArrayBuffer | Uint8Array): Promise<unknown> | unknown;
    destroy?(): void;
  }

  const jsPreviewExcel: {
    init(
      container: HTMLElement,
      options?: {
        minColLength?: number;
        showContextmenu?: boolean;
        [key: string]: unknown;
      },
      requestOptions?: Record<string, unknown>
    ): JsPreviewExcelInstance;
  };

  export default jsPreviewExcel;
}

declare module 'pptx-preview' {
  export interface PptxPreviewInstance {
    preview(source: ArrayBuffer | Uint8Array): Promise<unknown> | unknown;
    destroy?(): void;
  }

  export function init(
    container: HTMLElement,
    options?: {
      width?: number;
      height?: number;
      [key: string]: unknown;
    }
  ): PptxPreviewInstance;
}
