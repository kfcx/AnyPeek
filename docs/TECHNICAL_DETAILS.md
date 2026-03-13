# 技术细节

## 它真正要解决的问题

AnyPeek 想解决的，不是某一个格式的预览，而是“先看一眼内容”这件事。

常见场景基本都是这些：

- 手里有个文档，但本机没有对应软件
- 收到一个陌生链接，想先确认里面到底是什么
- 点开就会下载的地址，只想看内容，不想先落盘
- 面对大日志、大文本、大导出文件，不想因为一次性加载把页面拖慢

所以 AnyPeek 的核心不是做一个“文档播放器”，而是把 `URL / 本地文件 -> 可读内容` 这条路径统一起来。

## 设计原则

### 一个入口，两个来源

无论输入的是 URL 还是本地文件，最后都会被整理成同一种 `ResolvedPreviewResource`。

这意味着后面的渲染器不需要关心内容来自哪里，只需要关心两件事：

- 这个资源现在被识别成什么类型
- 应该按什么方式去读取和显示

### 先识别内容，再决定怎么显示

AnyPeek 不只看文件后缀。

它会先拿到一小段样本字节，再结合这些信息一起判断：

- `Content-Type`
- 文件名和扩展名
- 常见二进制格式的魔数
- 样本内容本身更像文本还是二进制

判断出来之后，再从渲染器注册表里选择真正要用的预览器。

### 能切片就不整包

如果目标只是“先看内容”，没必要一上来就把整份大文件完整读进浏览器。

文本和 Hex 视图会优先走切片读取，页面滚动到哪里，再继续往后读哪里。这样处理大文件时，压力不会随着文件体积直接线性放大。

### 同一套行为，跑在不同运行时

本地开发、Cloudflare Workers 和 Deno 复用的是同一套代理路由和远程读取逻辑。

## 一次远程预览是怎么走的

远程 URL 预览的主链路大致如下：

1. 前端在 `src/hooks/usePreviewWorkbench.ts` 接收 URL 输入
2. `createProxyRemoteTransport()` 把远程请求统一转成 `/api/file?url=...`
3. `server/app.ts` 注册 `/api/file` 路由，并把请求交给代理层
4. `server/remote-proxy.ts` 校验目标地址、处理重定向、转发必要请求头
5. 客户端先读取一段样本字节，用来判断内容类型
6. `packages/preview-renderers/src/registry.tsx` 挑选对应渲染器
7. 渲染器再决定自己该走整包读取、浏览器原生预览，还是分块加载

这条链路也顺手解决了“只想看，不想先下载”的场景：

- 预览走 `/api/file?url=...`
- 真要保存原文件时，再走带 `download=1` 的下载地址

## 代理层除了转发，还做了什么

`/api/file` 不是一个单纯的“代请求”接口，它还承担了几件关键的事情：

- 只允许 `http` 和 `https`
- 禁止 URL 里携带账号密码
- 拦截 `localhost`、`.local` 和内网 IP
- 遇到重定向时，继续重新校验目标地址
- 透传 `Range`、缓存校验头等和读取相关的请求头
- 清理不适合继续向前端透出的响应头
- 通过 CORS 暴露 `Content-Range`、`Content-Length`、`Accept-Ranges` 这些读取大文件时真正有用的信息

对 AnyPeek 来说，这一层的意义不是“把远程文件搬回来”，而是把远程资源整理成前端能稳定消费的读取接口。

## 内容识别是怎么做的

内容识别的入口在 `packages/preview-core/src/detect.ts`。

它的思路不是押宝某一个信号，而是多条线索一起看：

- 如果样本里能识别出 PDF、PNG、JPEG、ZIP、CFB 这类固定特征，就优先用魔数判断
- 如果响应头和扩展名已经足够明确，就直接走对应类型
- 如果既不明确，也没有可用魔数，就进一步判断内容整体更像文本还是二进制

这也是为什么像 `.m3u8`、日志、配置文件、无扩展名文本这类内容，经常也能直接落进文本视图，而不需要提前把规则写死。

## 大文件为什么能先看，再决定下一步

大文件能力主要靠三件事叠在一起：

### 样本读取

- 先只读取 `64 KB` 样本做类型判断
- 不为“识别格式”付出整包加载的代价

### 分块读取

- 文本视图按 `256 KB` 一块往后读
- Hex 视图按 `256 KB` 一块往后读
- 远程资源优先通过 `Range` 请求读取切片
- 如果远端不支持 `206 Partial Content`，再回退到整包读取

### 虚拟滚动

- 文本和 Hex 视图都使用虚拟列表
- DOM 里只保留当前视口附近的行
- 文件很长时，滚动成本不会和总行数一起爆掉

这套策略最受益的内容类型是：

- 日志
- 纯文本
- JSON
- CSV / TSV
- 播放列表
- 未知二进制内容的 Hex 检查

换句话说，AnyPeek 对“大文件”的优势，并不是所有格式都做到了同一种程度的流式预览，而是把最容易拖垮页面的文本和二进制检查路径先优化到位。

## 各类内容现在分别走哪条预览路径

### 图片、音频、视频、PDF

这几类内容优先交给浏览器本身去处理：

- 图片走图片组件和交互式查看器
- 音视频走原生媒体元素
- PDF 走 iframe 预览

这条路径简单、直接，也最符合“先打开看看”的目标。

### 文本、JSON、代码片段

这类内容走 `TextRenderer`：

- 自动推断编码
- 分块解码
- 增量追加
- 虚拟列表显示

### 未知二进制内容

如果无法识别成更具体的格式，就回退到 `HexRenderer`。

这是 AnyPeek 的最后一层兜底：哪怕打不开成“漂亮的预览”，至少还能先看结构和原始字节。

### DOCX、XLSX、PPTX

这几类内容走浏览器侧专用预览库：

- DOCX：`@js-preview/docx`
- XLSX / ODS：`@js-preview/excel`
- PPTX：`pptx-preview`

它们解决的是“网页里直接看 Office 内容”这件事，但和文本 / Hex 不完全是同一种大文件策略。

当前的大文件优化重点，主要还是文本和 Hex 这两条链路。

### 旧版 Office 二进制格式

像 `doc`、`ppt` 这类旧格式，当前 Web 侧不继续硬解析。

现在的处理方式是保留下载能力，并为后续桌面侧 native fallback 预留位置。

## 运行时怎么分工

### `src/`

页面壳层、工具栏、元信息展示和交互状态都在这里。

### `packages/preview-core`

这里放“预览无关 UI、但和预览机制强相关”的基础能力：

- 内容识别
- 字节读取
- 资源抽象
- 远程传输封装

### `packages/preview-renderers`

这里放真正负责显示内容的渲染器，以及渲染器注册表。

### `server/`

共享代理逻辑放在这里，本地 Node、Cloudflare Workers、Deno 都围着这层复用。

### `worker/index.ts`

Cloudflare Workers 入口，直接复用 `createProxyApp()`。

### `deno.server.ts`

Deno 入口，静态资源和 API 路由一起对外提供。

## 改代码时，建议先看这些文件

- `src/hooks/usePreviewWorkbench.ts`：输入、状态切换、远程 / 本地资源创建
- `packages/preview-core/src/resource.ts`：本地和远程资源的统一抽象
- `packages/preview-core/src/detect.ts`：格式判断和文本 / 二进制兜底逻辑
- `server/remote-proxy.ts`：远程请求校验、重定向校验、响应头清理
- `packages/preview-renderers/src/registry.tsx`：渲染器选择入口
- `packages/preview-renderers/src/renderers/text.tsx`：大文本预览路径
- `packages/preview-renderers/src/renderers/hex.tsx`：未知二进制和大文件兜底路径

## 改完代码后

```bash
pnpm test
pnpm run check:cf
pnpm run check:deno
pnpm run build
```
