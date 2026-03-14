# 部署指南

AnyPeek 目前有五种运行或部署方式：

- 在本地跑起来，自己直接用
- 部署到 Vercel，直接对外访问
- 部署到 Deno，直接对外访问
- 部署到 Cloudflare Workers，直接对外访问
- 在 Windows 上打包成 Tauri 可执行文件

想先把项目留一份到自己的 GitHub 账号里，再去部署，可以先点 README 里的 `Use this template`。不打算维护自己那份仓库的话，这步可以直接跳过。

## 怎么选

- 本地搭建：适合先试用、改代码，或者只打算自己用
- Vercel：适合想用最常见的 Git 导入式部署，把静态页面和代理接口一起托管
- Deno：适合想尽快上线，少折腾配置
- Cloudflare Workers：适合本来就在用 Cloudflare，或者准备把域名、访问控制和部署都放到 Cloudflare 里
- Tauri：适合只在自己电脑上用，或者想把它做成一个 Windows 桌面工具

## 本地搭建

想先试试看，或者准备改代码，本地搭起来最快。

先装好 Node.js 20+ 和 pnpm 10，然后在项目目录执行：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

跑起来以后，直接打开 `http://localhost:5173`。

如果你想先看生产构建结果，再决定要不要上线：

```bash
pnpm run build
pnpm preview
```

## 构建 Tauri Windows 可执行文件

桌面版沿用同一套 React 前端，但远程资源读取改走 Tauri Rust 命令，不再依赖 `/api/file` 这个 Web 代理入口。

先装好这些依赖：

- Node.js 20+ 和 pnpm 10
- `rustup`、`rustc`、`cargo`
- Microsoft C++ Build Tools，安装时勾上“使用 C++ 的桌面开发”，至少带上 `MSVC x64/x86 build tools` 和 `Windows SDK`
- WebView2 Runtime

在这个仓库里，`pnpm exec tauri info` 会直接检查这些前置项。

如果你刚装完 Rust，但 `tauri build` 还提示找不到 `cargo` 或 `rustc`，通常不是没装，而是当前终端还没拿到新的 PATH。Windows 上默认要能看到：

```text
%USERPROFILE%\.cargo\bin
```

最稳妥的做法是重开一个终端，再执行：

```bash
pnpm exec tauri info
```

### 本地调试桌面版

```bash
pnpm install --frozen-lockfile
pnpm run tauri:dev
```

### 构建 Windows 可执行文件

```bash
pnpm install --frozen-lockfile
pnpm run tauri:build
```

默认会在 `src-tauri/target/release/bundle/` 下生成安装包或可执行产物。

如果你在 Windows 机器上第一次打包失败，优先检查这三项：

- `cargo` / `rustc` 是否已经进 PATH
- Visual Studio Build Tools 是否真的装了 `MSVC x64/x86 build tools` 和 `Windows SDK`
- WebView2 Runtime 是否可用

## 部署到 Deno

### 一键部署

1. 点击 README 里的 `Deploy on Deno`
2. 页面会直接带上仓库地址，以及安装、构建命令
3. 确认应用名称和其他基础配置
4. 点击 `Deploy`

### 手动发布

```bash
pnpm install --frozen-lockfile
pnpm run deploy:deno
```

适合你已经有 Deno Deploy 项目，或者想自己掌控发布过程的时候用。

## 部署到 Vercel

### 一键部署

1. 点击 README 里的 `Deploy with Vercel`
2. 登录并导入仓库
3. 保持仓库里的默认构建配置
4. 完成后直接访问分配到的域名

### 手动发布

```bash
pnpm install --frozen-lockfile
npx vercel --prod
```

适合你已经装好 Vercel CLI，或者想把发布流程接进自己已有账号里的时候用。

## 部署到 Cloudflare Workers

### 一键部署

1. 点击 README 里的 `Deploy to Cloudflare`
2. 登录并授权 Cloudflare
3. 页面会自动带出仓库信息，以及 `package.json` 里的构建、部署命令
4. 完成后在 Cloudflare Workers 里继续绑定域名或调整配置

### 手动发布

```bash
pnpm install --frozen-lockfile
pnpm run deploy:cf
```

如果你本来就在用 Cloudflare，这条路通常最顺手。

如果你想在本地按 Worker 的方式调试，不要直接用系统里的全局 `wrangler`。项目里已经带了对应版本，直接运行：

```bash
pnpm run build
pnpm run dev:cf
```

## 上线前顺手跑一下

不管最后发到哪，正式上线前都建议先过一遍：

```bash
pnpm test
pnpm run check:cf
pnpm run check:deno
pnpm run build
```

如果你准备发桌面版，再补一条：

```bash
pnpm exec tauri info
```

## 还有哪些文档

- [技术细节](./TECHNICAL_DETAILS.md)
- [维护手册](./MAINTAINERS.md)
- [贡献说明](./CONTRIBUTING.md)
