# 技术细节

这页不打算把每一行代码都解释一遍，而是先帮你抓住 AnyPeek 的主线：

> **把一个 URL 或本地文件，尽快整理成“可以读”的内容。**

如果你先抓住这条主线，再回头看代码，整个仓库会顺很多。

## 先看懂主链路

AnyPeek 的核心流程可以压缩成这一条：

```text
URL / 本地文件
  -> 统一抽象成 Preview Resource
  -> 读取一小段样本
  -> 结合响应头、扩展名、文件头判断类型
  -> 选中对应渲染器
  -> 按合适的方式显示内容
```

真正重要的，不是“支持了多少格式”，而是这条路径尽量统一。

## 为什么它不是“按后缀硬猜格式”

只看文件后缀的问题很明显：

- 很多链接根本没有像样的文件名
- 远端可能给出不可靠或过于笼统的 `Content-Type`
- 有些文本、播放列表、日志、配置文件甚至根本没有扩展名

所以 AnyPeek 会同时参考几种线索：

- `Content-Type`
- 文件名和扩展名
- 文件头魔数
- 样本内容看起来更像文本还是二进制

这个逻辑主要在：

- `packages/preview-core/src/detect.ts`
- `packages/preview-core/src/collections.ts`

## 两类输入，最后为什么能走成同一套体验

从用户视角看，AnyPeek 有两种入口：

- 输入远程 URL
- 打开本地文件

但往后走，它们都会被整理成 `ResolvedPreviewResource`。这一步的意义很大：

- 渲染器不用关心内容来自本地还是远程
- 后续统一只需要关心“这是什么类型”以及“怎么读”
- 下载、元信息展示、预览器选择都能复用

相关代码主要在：

- `packages/preview-core/src/resource.ts`
- `packages/preview-core/src/types.ts`
- `src/hooks/usePreviewWorkbench.ts`

## 远程预览为什么要走代理层

如果只是本地文件，浏览器自己就能读；远程 URL 就没这么简单了。

AnyPeek 的 Web 版会把远程预览统一转成：

```text
/api/file?url=...
```

这样做主要是为了解决四件事：

1. **把远程资源整理成浏览器可稳定消费的读取接口**
2. **允许前端按需发 `Range` 请求**
3. **把“预览”和“下载原文件”这两个动作分开**
4. **在服务端做安全校验，避免把公共部署变成 SSRF 工具**

这层逻辑主要在：

- `server/app.ts`
- `server/remote-proxy.ts`
- `packages/preview-core/src/transport.ts`

## 代理层具体做了什么

`/api/file` 不只是“帮前端代请求”，它还顺手承担了这些事情：

- 只允许 `http` 和 `https`
- 拦截 URL 中携带账号密码的情况
- 拦截 `localhost`、`.local` 和内网 IP
- 重定向时继续重复校验目标地址
- 透传 `Range`、缓存校验头等真正和读取有关的请求头
- 去掉不适合继续透给前端的响应头，例如 `set-cookie`
- 暴露 `Content-Range`、`Content-Length`、`Accept-Ranges` 等前端读取大文件要用的信息

你可以把它理解成：**把一个不确定、可能危险的远程资源，整理成前端可控的只读入口。**

## 内容识别大致怎么判

格式识别不是一步到位“拍脑袋猜”，而是分层决策：

### 第一步：先读样本

默认先读取 `64 KB` 样本，而不是整包加载。

这样格式识别不需要提前付出整份文件的成本。

### 第二步：先看有没有明显特征

如果样本里能认出这些标志，就直接用：

- PDF 文件头
- 图片常见魔数
- 音视频的明显特征
- ZIP 容器
- CFB（旧版 Office 二进制容器）

### 第三步：再结合扩展名和内容类型

例如：

- `docx` / `pptx` / `xlsx` 这类实际上都是 ZIP 容器
- `doc` / `ppt` 这类旧格式更像 CFB 容器
- `csv` / `tsv` 即便不是漂亮的“文档格式”，仍然应该按文本处理

### 第四步：还分不清，就判断更像文本还是二进制

如果既没有可靠魔数，也没有靠谱扩展名，就看样本本身更像哪一类：

- 像文本：进文本视图
- 像二进制：进 Hex 视图

这也是为什么没有扩展名的日志、配置文件、播放列表，经常也能被直接读出来。

## 渲染器怎么选

AnyPeek 的渲染器注册表在：

```text
packages/preview-renderers/src/registry.tsx
```

大致分成这几条路径：

### 浏览器原生更合适的内容

- 图片
- 音频
- 视频
- PDF

这几类内容直接交给浏览器或浏览器友好的组件处理，路径最短，也最符合“先看一眼”的目标。

### 浏览器侧专用预览库

- DOCX：`@js-preview/docx`
- 表格：`@js-preview/excel`
- 演示文稿：`pptx-preview`

这几类内容的重点是“网页里能直接看”，不一定和文本/Hex 共用同一套大文件策略。

### 文本类内容

文本、JSON、CSV、代码片段等，走 `TextRenderer`：

- 增量读取
- 分块解码
- 逐步追加
- 虚拟滚动显示

### 未知二进制

进 `HexRenderer`。

这相当于最后一道兜底：即便没有漂亮预览，至少还能先看原始字节和结构。

### 旧版 Office

像 `doc`、`ppt` 这类旧版二进制 Office 格式，当前 Web 侧不继续硬解析。

现在的策略是：

- 保留下载能力
- 在桌面侧为 native fallback 预留位置

## 大文件为什么不会一上来把页面拖死

AnyPeek 对“大文件”的优化，主要集中在文本和 Hex 这两条路径。

### 1. 先样本读取，不整包探测

格式识别默认只读 `64 KB` 样本。

### 2. 文本和 Hex 按块继续读

默认块大小是：

- 文本：`256 KB`
- Hex：`256 KB`

远程资源优先尝试 `Range` 请求；如果远端不支持分段，再回退到整包读取。

### 3. 列表使用虚拟滚动

文本行和 Hex 行很多时，页面并不会把所有行都塞进 DOM，而是只保留视口附近的内容。

这就是为什么它在这些场景里会明显轻很多：

- 大日志
- 大文本
- JSON 导出文件
- CSV / TSV
- 想先扫一眼未知二进制内容

## Web 版和桌面版分别怎么分工

### Web 版

- 前端在浏览器里跑
- 远程 URL 通过 `/api/file` 代理读取
- 可部署到本地开发、Vercel、Deno、Cloudflare Workers

### 桌面版（Tauri）

- 前端还是同一套 React UI
- 远程读取改走 Tauri 命令
- 安全校验和重定向校验在 Rust 侧再做一遍

所以桌面版不是另起炉灶，而是把“远程资源怎么读”这一层换到了本地桌面运行时。

## 改代码时，通常先看这些文件最省时间

### 想看整体交互和入口

- `src/App.tsx`
- `src/hooks/usePreviewWorkbench.ts`

### 想看资源抽象和预览判定

- `packages/preview-core/src/resource.ts`
- `packages/preview-core/src/detect.ts`
- `packages/preview-core/src/types.ts`

### 想看远程代理和安全边界

- `server/app.ts`
- `server/remote-proxy.ts`
- `server/remote-proxy.test.ts`

### 想看具体渲染器

- `packages/preview-renderers/src/registry.tsx`
- `packages/preview-renderers/src/renderers/text.tsx`
- `packages/preview-renderers/src/renderers/hex.tsx`
- `packages/preview-renderers/src/renderers/docx.tsx`
- `packages/preview-renderers/src/renderers/spreadsheet.tsx`
- `packages/preview-renderers/src/renderers/presentation.tsx`

### 想看桌面侧远程读取

- `src/platform/tauri.ts`
- `src-tauri/src/commands.rs`

## 改完以后，最少跑一轮这些检查

```bash
pnpm test
pnpm run check:cf
pnpm run check:deno
pnpm run build
```

如果你动了桌面侧，再补一轮 Tauri 相关验证会更稳。

## 相关文档

- [文档导航](./README.md)
- [部署指南](./DEPLOYMENT.md)
- [贡献说明](./CONTRIBUTING.md)
- [维护手册](./MAINTAINERS.md)
