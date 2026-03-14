# 维护者部署初始化

这页适合这样的人看：**你刚接手 AnyPeek 仓库，准备把自动部署和平台配置重新接起来。**

如果你已经是长期维护者，平时主要看 [维护手册](./MAINTAINERS.md) 就够了。

## 先明确：你到底要补哪些东西

AnyPeek 现在的发布方式分成两类：

- **GitHub Actions 自动部署**：Cloudflare Workers、Deno Deploy
- **平台侧一键导入 / 独立管理**：Vercel

所以“接手部署”并不是把所有平台都塞进 GitHub Actions，而是分别确认：

- GitHub Actions 的 secrets 是否完整
- 仓库里的平台配置文件是否还正确
- README 和部署文档里的入口是否还对

## 第一次接手时，推荐按这个顺序做

### 1. 先确认仓库设置没问题

- 仓库地址是你预期中的那个
- 默认分支是 `main`
- 如果要保留 `Use this template`，`Template repository` 仍然开启
- 如果要继续使用 README 上的一键部署按钮，仓库保持公开

### 2. 先跑一次本地基础检查

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run check:cf
pnpm run check:deno
pnpm run build
```

先确认仓库本身是健康的，再去补平台配置，会少很多误判。

### 3. 配 GitHub Actions secrets

#### Cloudflare Workers

需要在 GitHub 仓库 secrets 里提供：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

#### Deno Deploy

需要提供：

- `DENO_DEPLOY_TOKEN`
- `DENO_DEPLOY_ORG`
- `DENO_DEPLOY_APP`

如果这些没配齐，对应的部署 job 会直接跳过，不会自动发。

### 4. 核对平台配置文件

#### Cloudflare

重点看：

- `wrangler.jsonc` 里的 `name`
- Worker 入口 `main`
- 静态资源目录 `assets.directory`
- SPA 路由与 `/api/*` 的处理是否还是项目预期

#### Deno Deploy

重点看：

- `deno.json` 里的 `deploy.install`
- `deploy.build`
- `deploy.runtime.entrypoint`

这几项决定了平台会不会按仓库预期去安装依赖、构建和启动。

#### Vercel

重点看：

- `vercel.json` 里的 `installCommand`
- `buildCommand`
- `outputDirectory`
- 健康检查路径重写是否还对

Vercel 通常不依赖 GitHub 仓库 secrets，但它的项目配置还是要和仓库文件保持一致。

### 5. 手动触发一次部署验证

GitHub Actions 工作流支持手动触发，可以按目标分别验证：

- `cloudflare`
- `deno`
- `all`

第一次接手时，最好别只看“绿色通过”，还要真的打开部署结果验证一遍。

## 验证通过，不只看 Actions 绿不绿

部署成功以后，建议至少手动检查：

- `/healthz` 返回是否正常
- 远程 URL 预览是否正常
- 下载原文件是否正常
- 至少试一个文本文件和一个 Office 文件
- README 上的部署按钮和文档链接有没有失效

## 出问题时，先看哪里最有效

### Actions 里校验阶段就挂了

优先看：

- `pnpm install --frozen-lockfile`
- `pnpm test`
- `pnpm run check:deno`
- `pnpm run build`

这类问题通常是依赖、类型检查或构建本身坏了，还没到平台层。

### Cloudflare / Deno 的 deploy job 没跑

先看 secrets 有没有配齐。工作流里对这些 secrets 做了条件判断，缺任何一个，对应 job 都会跳过。

### 部署成功了，但远程预览不工作

优先排查：

- `/api/file` 是否可访问
- 平台日志里是否有请求失败信息
- 文档里提到的安全限制是不是拦住了目标地址（例如 `localhost`、内网 IP、带账号密码的 URL）

### Vercel 页面能打开，但接口行为不对

优先检查：

- `api/file.ts`
- `api/healthz.ts`
- `vercel.json`

Vercel 的前端和 API 路由是分开处理的，别只盯前端构建结果。

## 接手后最好立刻同步更新的文档

只要你改了平台名、部署入口、项目名或发布方式，优先一起更新：

- `README.md`
- `docs/DEPLOYMENT.md`
- `docs/MAINTAINERS.md`

这样下一位 maintainer 才不会拿着过期说明继续踩坑。
