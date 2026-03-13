export function buildFrameDocument(html: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 24px;
        font: 16px/1.7 Inter, "IBM Plex Sans", system-ui, sans-serif;
        color: #20262f;
        background: #fffdf8;
      }
      img, table { max-width: 100%; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid rgba(32, 38, 47, 0.16); padding: 8px 10px; }
      pre {
        white-space: pre-wrap;
        background: #f5efe5;
        padding: 16px;
        border-radius: 16px;
      }
      a { color: #bc5f3a; }
    </style>
  </head>
  <body>${html}</body>
</html>`;
}
