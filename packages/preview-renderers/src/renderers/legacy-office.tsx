import type { RendererProps } from '../types';

export function LegacyOfficeRenderer({ resource }: RendererProps) {
  const ext = resource.extension.toUpperCase() || resource.fileName.split('.').at(-1)?.toUpperCase() || 'DOC/PPT';

  return (
    <div className="native-fallback-card">
      <strong>{ext} 建议走桌面侧 native fallback</strong>
      <p>
        旧版 Office 二进制格式不再继续在浏览器里硬解析。当前架构已经把前端 renderer registry 和桌面壳层拆开，后续直接在 Tauri sidecar 中挂接
        LibreOffice / soffice / 自研转换器，把结果统一转成 PDF、HTML 或图片序列即可。
      </p>
      <p>在 native converter 接好之前，工具栏里的下载按钮仍然可以直接保存原文件。</p>
    </div>
  );
}
