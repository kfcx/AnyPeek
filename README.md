<div align="center">

<h1>AnyPeek</h1>
<img src="./src-tauri/icons/icon.png" alt="AnyPeek icon" width="128" />

<p><strong>快速查看任意网络与本地资源。</strong></p>
<p>AnyPeek 是一个轻量预览工具：输入 URL，或者拖放本地文件进来，快速查看里面到底是什么内容。</p>

</div>

[Use this template](https://github.com/kfcx/AnyPeek/generate)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kfcx/AnyPeek)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kfcx/AnyPeek)
[![Deploy on Deno](https://deno.com/button)](https://console.deno.com/new?clone=https://github.com/kfcx/AnyPeek&install=npx%20pnpm%4010.32.1%20install%20--frozen-lockfile&build=npx%20pnpm%4010.32.1%20run%20build)

## 它是拿来干什么的

很多时候，我们不是要“正式处理一个文件”，只是想先确认它到底是什么。

比如这些场景：

- 收到一个陌生链接，不确定里面是图片、文档、视频，还是纯文本
- 有个会直接触发下载的地址，但你现在只想先看一眼内容
- 手里有份本地文件，电脑上却没装对应软件
- 面对一大份日志、导出文件或播放列表，不想先下载再找工具打开

AnyPeek 做的事情很简单：把 `URL / 本地文件 -> 可读内容` 这条路尽量便捷。

## 它现在能预览什么

### 输入来源

- 任意 `http` / `https` 链接
- 本地拖放文件
- 本地文件选择器打开的文件

### 支持的内容类型

| 类型 | 常见格式 | 现在的表现 |
| --- | --- | --- |
| PDF | `pdf` | 直接在页面里预览 |
| 图片 | `png` `jpg` `jpeg` `gif` `webp` `svg` `bmp` `ico` `avif` | 图片查看器打开，可缩放查看 |
| 音频 | `mp3` `wav` `ogg` `aac` `m4a` `flac` `opus` | 原生音频播放器 |
| 视频 | `mp4` `webm` `mov` `m4v` `ogv` | 原生视频播放器 |
| Word | `docx` | 浏览器侧 DOCX 预览 |
| 表格 | `xlsx` `xls` `xlsm` `xlsb` `ods` | 浏览器侧表格预览 |
| 演示文稿 | `pptx` `pptm` `ppsx` `potx` | 浏览器侧 PPT 预览 |
| 文本类内容 | `txt` `log` `md` `json` `csv` `tsv` `xml` `yaml` `js` `ts` `py` `sql` 等 | 按文本方式分块读取和显示 |
| 未知二进制 | 任意未识别格式 | 自动回退到 Hex 视图 |
| 旧版 Office | `doc` `ppt` `pps` `pot` | 当前 Web 端不硬解析，保留下载，桌面侧 native fallback 已预留位置 |


## 它和“先下载再打开”有什么区别

AnyPeek 的重点不是做一个重量级文档平台，而是把“先看一眼”这件事做顺。

它的做法大概是：

- 先读一小段样本，再判断该用哪种预览方式
- 远程资源优先通过代理和 `Range` 分段读取
- 文本和 Hex 视图按块继续读，不是一上来整包加载
- 长文本和长二进制列表用虚拟滚动，页面里只保留可见部分

所以它对这些场景会特别顺手：

- 大日志、大文本、大导出文件
- 想先看 `.m3u8`、配置文件、脚本、JSON
- 想快速确认一个下载链接到底指向什么内容
- 想先预览，再决定要不要把原文件保存下来

## 运行形态

AnyPeek 现在有两种主要用法：

- **Web 版**：本地开发、Vercel、Deno、Cloudflare Workers
- **桌面版**：基于 `Tauri 2`，当前主要面向 Windows 打包和使用

Web 版和桌面版共用同一套前端预览体验；差别主要在远程资源读取路径上。Web 版通过 `/api/file` 代理读取远程内容，桌面版则直接走 Tauri 侧命令。

## 快速开始

### 本地运行

先准备好：

- Node.js 20+
- pnpm 10

然后在项目目录里执行：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

跑起来以后，打开 `http://localhost:5173`。

### 看一下生产构建结果

```bash
pnpm run build
pnpm preview
```

### Windows 桌面版

如果你想把它打成 Windows 可执行文件，直接看 [部署指南](./docs/DEPLOYMENT.md) 里的 Tauri 部分。那里把 Rust、Build Tools、WebView2 这些前置条件都写全了。

## 怎么选部署方式

- **只想自己试试，或者准备改代码**：本地运行
- **想最快上线一个可访问的 Web 版本**：Vercel 或 Deno
- **本来就在用 Cloudflare**：Cloudflare Workers
- **只想在自己电脑上用，不想走公网**：Tauri 桌面版

具体步骤放在 [部署指南](./docs/DEPLOYMENT.md)。

## 使用时要知道的边界

这几个点写在 README 里，是因为第一次用的时候最容易踩到：

- 远程预览只支持 `http` 和 `https`
- URL 里不允许带账号密码
- 为了避免把服务变成内网探测器，默认会拦截 `localhost`、`.local` 和内网 IP；遇到重定向时也会继续校验
- 文本和 Hex 的大文件体验最好；Office 预览依然取决于对应浏览器侧预览库
- 旧版 Office 二进制格式当前不在 Web 端硬解析，只保留下载功能

## 文档从哪里继续看

- [文档导航](./docs/README.md)：先看哪一页最省时间
- [部署指南](./docs/DEPLOYMENT.md)：本地、Vercel、Deno、Cloudflare Workers、Tauri
- [技术细节](./docs/TECHNICAL_DETAILS.md)：架构、识别逻辑、代理和大文件策略
- [贡献说明](./docs/CONTRIBUTING.md)：怎么提一个容易 review 的改动
- [维护手册](./docs/MAINTAINERS.md)：适合有仓库维护权限的人看
- [维护者部署初始化](./docs/MAINTAINER_DEPLOY_SETUP.md)：新 maintainer 第一次接手时要补哪些配置
