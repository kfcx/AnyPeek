# 部署指南

这页讲的是：**怎么把 AnyPeek 跑起来，以及不同部署方式分别适合谁。**

如果你只是第一次认识这个项目，先看根目录的 [README](../README.md)。
如果你已经准备接手仓库维护，再补看 [维护者部署初始化](./MAINTAINER_DEPLOY_SETUP.md)。

## 先选一条路

| 方式 | 适合谁 | 你会得到什么 |
| --- | --- | --- |
| 本地运行 | 只想试用、改代码、自己用 | 最快看到效果，调试最直接 |
| Vercel | 想用常见的 Git 导入式部署 | 静态页面和 API 一起托管，上手最省心 |
| Deno Deploy | 想快速上线，尽量少配东西 | 配置少，仓库自带构建和发布信息 |
| Cloudflare Workers | 本来就在用 Cloudflare | 域名、访问控制、Workers 能放在一套体系里 |
| Tauri（Windows） | 只想在自己电脑上用，或想打包成桌面工具 | 不依赖公网服务，远程读取走本地桌面壳 |

## 通用前置条件

Web 相关的本地开发和构建，至少需要：

- Node.js 20+
- pnpm 10

第一次在本地拉起仓库，通用命令是：

```bash
pnpm install --frozen-lockfile
```

## 1. 本地运行

适合先试用、改 UI、改预览逻辑，或者你压根就没打算上线。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

默认访问地址：`http://localhost:5173`

如果你想看生产构建后的表现，再跑：

```bash
pnpm run build
pnpm preview
```

## 2. 部署到 Vercel

适合“把仓库导进去，尽快得到一个能访问的 Web 版本”。

### 一键部署

1. 点击 README 里的 `Deploy with Vercel`
2. 登录 Vercel 并导入仓库
3. 保持仓库里现有的默认构建配置
4. 部署完成后直接访问分配到的域名

项目里已经带了 `vercel.json`，默认会把前端构建产物输出到 `dist/client`，并处理健康检查路径。

### 手动发布

```bash
pnpm install --frozen-lockfile
npx vercel --prod
```

适合你已经在本地装好了 Vercel CLI，或者想把部署过程接进自己的发布流程。

## 3. 部署到 Deno Deploy

适合想少折腾配置、尽快上线的人。

仓库里的 `deno.json` 已经写好了安装命令、构建命令和运行入口。

### 一键部署

1. 点击 README 里的 `Deploy on Deno`
2. 页面会自动带上仓库地址、安装命令和构建命令
3. 确认应用名称和其他基础配置
4. 点击 `Deploy`

### 手动发布

```bash
pnpm install --frozen-lockfile
pnpm run deploy:deno
```

如果你已经有现成的 Deno Deploy 项目，或者想自己控制发布过程，这条路更顺手。

## 4. 部署到 Cloudflare Workers

如果你本来就在用 Cloudflare，这通常是最自然的一条路。

仓库里的 `wrangler.jsonc` 已经把 Worker 入口、静态资源目录和 SPA 路由处理配好了。

### 一键部署

1. 点击 README 里的 `Deploy to Cloudflare`
2. 登录并授权 Cloudflare
3. 页面会自动带出仓库和构建信息
4. 部署完成后，再去 Cloudflare 面板里绑定域名或补访问控制

### 手动发布

```bash
pnpm install --frozen-lockfile
pnpm run deploy:cf
```

### 本地按 Worker 方式调试

如果你想尽量模拟 Cloudflare 的运行方式，不要自己找系统里的全局 `wrangler`，直接用仓库里的版本：

```bash
pnpm run build
pnpm run dev:cf
```

## 5. 打包成 Windows 桌面版（Tauri）

适合只在自己电脑上用，或者想把 AnyPeek 做成一个独立桌面工具。

桌面版沿用同一套 React 前端，但远程资源读取不再走 Web 端 `/api/file` 代理，而是走 Tauri 的 Rust 命令。

### 额外前置条件

除了 Node.js 和 pnpm，还需要：

- `rustup`、`rustc`、`cargo`
- Microsoft C++ Build Tools
  - 安装时勾上“使用 C++ 的桌面开发”
  - 至少包含 `MSVC x64/x86 build tools` 和 `Windows SDK`
- WebView2 Runtime

你可以先用这条命令检查环境：

```bash
pnpm exec tauri info
```

### 本地调试桌面版

```bash
pnpm install --frozen-lockfile
pnpm run tauri:dev
```

### 构建 Windows 安装包或可执行文件

```bash
pnpm install --frozen-lockfile
pnpm run tauri:build
```

默认产物会出现在：

```text
src-tauri/target/release/bundle/
```

### Tauri 常见卡点

如果你刚装完 Rust，`tauri build` 还是提示找不到 `cargo` 或 `rustc`，通常不是没装，而是当前终端还没拿到新的 PATH。Windows 上默认要能看到：

```text
%USERPROFILE%\.cargo\bin
```

最稳妥的做法是重开一个终端，再执行一次：

```bash
pnpm exec tauri info
```

## 上线前后，至少做一次这些检查

### 上线前

```bash
pnpm test
pnpm run check:cf
pnpm run check:deno
pnpm run build
```

如果你要发桌面版，再补：

```bash
pnpm exec tauri info
```

### 上线后

建议最少验证这几件事：

- `GET /healthz` 能返回 `{"ok": true}`
- 远程 URL 预览能正常打开
- 本地文件拖放能正常工作
- 下载按钮能拿到原文件
- 至少找一个较大的文本或日志文件，确认滚动和继续读取正常

## 怎么判断你选对了没有

- 你只是想试试看：本地运行
- 你想最快给别人一个可访问地址：Vercel 或 Deno
- 你已经把域名、鉴权、边缘能力都放在 Cloudflare：Cloudflare Workers
- 你压根不想依赖公网服务：Tauri

## 相关文档

- [文档导航](./README.md)
- [技术细节](./TECHNICAL_DETAILS.md)
- [贡献说明](./CONTRIBUTING.md)
- [维护手册](./MAINTAINERS.md)
