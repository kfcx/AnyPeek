# 维护手册

这页只记录维护仓库时会反复用到的事情。

如果你只是想提一个改动，看 [贡献说明](./CONTRIBUTING.md)。
如果你只是想把项目跑起来或上线，看 [部署指南](./DEPLOYMENT.md)。
如果你想先摸清实现，再决定怎么改，看 [技术细节](./TECHNICAL_DETAILS.md)。

## 这页管什么

- 仓库发布和基础设置
- 自动部署和平台凭证
- README 与各份文档的边界
- 合并、发版前的检查

## 仓库基础设置

AnyPeek 的 README 带了一键部署按钮，所以仓库层面有几件事要一直保持正确：

1. GitHub 仓库地址没有变
2. README 里的按钮和链接还能点
3. 如果希望别人一键复制仓库，`Template repository` 还是开启状态
4. 如果希望别人直接点部署按钮，仓库保持公开

这几项比“文档写得多不多”更重要。按钮失效，README 再漂亮也没用。

## 自动部署

自动发布工作流在 `.github/workflows/deploy.yml`。

### Cloudflare Workers

需要这些 secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Deno

需要这些 secrets：

- `DENO_DEPLOY_TOKEN`
- `DENO_DEPLOY_ORG`
- `DENO_DEPLOY_APP`

### Vercel

如果走 README 的一键部署按钮，通常不需要额外维护仓库 secrets。

如果后面改了仓库导入方式、项目设置或构建产物目录，记得一起检查 `vercel.json`。

如果部署方式、项目名或平台参数变了，优先更新工作流、README 按钮和 [部署指南](./DEPLOYMENT.md)，不要只改其中一处。

## 文档边界

这几份文档各管一件事，尽量不要混写：

- `README.md`：第一次打开仓库的人先看到什么
- `docs/DEPLOYMENT.md`：本地、Vercel、Deno、Cloudflare Workers 怎么部署
- `docs/TECHNICAL_DETAILS.md`：为什么这样设计，主链路怎么走
- `docs/CONTRIBUTING.md`：外部贡献者怎么提一个有效改动
- `docs/MAINTAINERS.md`：仓库维护、发布和长期整理

最容易写乱的是这两件事：

- 把技术细节塞回 README
- 把部署步骤和维护流程写成一份文档

前者会让首页失焦，后者会让维护者和贡献者都找不到重点。

## 平时主要看什么

- README 里的按钮、链接、文案还对不对
- `pnpm run deploy:cf` 和 `pnpm run deploy:deno` 相关脚本有没有被改坏
- 运行时或代理行为变了，部署文档和技术文档有没有一起更新
- 新来的 PR 和 issue 有没有长期没人回应

维护不只是合并代码。让入口清楚、按钮可用、文档不打架，也是维护本身。

## 合并前顺手过一遍

- 这次改动有没有影响 README、部署方式或技术说明
- 改动范围是不是还聚焦，没有顺手塞进无关重构
- 如果动了预览逻辑、代理逻辑或运行时入口，至少本地跑过相关检查

推荐命令：

```bash
pnpm test
pnpm run check:cf
pnpm run check:deno
pnpm run build
```

## 发版前再看一眼

- README 的部署按钮还能走通
- Deno、Vercel 和 Cloudflare Workers 的配置名称没有过期
- 文档里的平台名称、入口地址、脚本名和仓库现状一致
