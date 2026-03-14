# 维护手册

这页写给有仓库维护权限的人：能合并 PR、能改仓库设置、能处理自动部署和发布的人。

如果你只是准备提一个改动，优先看 [贡献说明](./CONTRIBUTING.md)。
如果你只是想把项目跑起来，优先看 [部署指南](./DEPLOYMENT.md)。

## 维护 AnyPeek，平时主要在维护什么

维护这个项目，不只是“把代码合进去”。

真正要长期保持正确的，通常是下面这些：

- README 入口清楚，第一次进仓库的人能快速看懂
- 一键部署按钮和文档链接都还能用
- 自动部署工作流没有悄悄坏掉
- 部署方式、运行时入口和文档边界保持一致
- 新来的 issue / PR 不会长期没人响应

## 仓库层面必须长期保持正确的东西

AnyPeek 的 README 带有模板和一键部署入口，所以这些设置要经常确认：

1. GitHub 仓库地址没有变
2. README 里的按钮和相对链接还能正常跳转
3. 如果希望别人点击 `Use this template`，`Template repository` 仍然开启
4. 如果希望别人直接使用部署按钮，仓库保持公开

这几项经常比“文档写了多少字”更重要。入口一坏，后面的体验就全断了。

## 自动部署现状

自动发布工作流在：

```text
.github/workflows/deploy.yml
```

它现在主要做三件事：

- 先跑一轮校验：安装依赖、测试、检查 Deno 入口、构建前端
- 条件满足时部署到 Cloudflare Workers
- 条件满足时部署到 Deno Deploy

### Cloudflare Workers 需要的 secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Deno Deploy 需要的 secrets

- `DENO_DEPLOY_TOKEN`
- `DENO_DEPLOY_ORG`
- `DENO_DEPLOY_APP`

### Vercel 现在怎么处理

如果你走的是 README 里的 Vercel 一键部署，通常不需要在 GitHub 仓库里额外放 secrets。

但如果你后面改了 Vercel 的导入方式、构建命令、输出目录或项目结构，记得一起回头检查：

- `vercel.json`
- `README.md`
- `docs/DEPLOYMENT.md`

## 文档边界不要写乱

这几页最好始终保持单一职责：

- `README.md`：第一次打开仓库的人先看到什么
- `docs/DEPLOYMENT.md`：怎么运行、怎么部署
- `docs/TECHNICAL_DETAILS.md`：为什么这样设计，主链路怎么走
- `docs/CONTRIBUTING.md`：外部贡献者怎么提一个有效改动
- `docs/MAINTAINERS.md`：维护者平时要盯哪些事
- `docs/MAINTAINER_DEPLOY_SETUP.md`：新 maintainer 第一次把部署重新接起来时怎么配

最容易失控的两个问题是：

- 把太多技术细节塞回 README，导致首页失焦
- 把部署步骤和维护流程写成一份文档，最后谁都找不到重点

## 只要动到部署相关内容，记得一并看这些文件

- `README.md`
- `docs/DEPLOYMENT.md`
- `docs/MAINTAINER_DEPLOY_SETUP.md`
- `.github/workflows/deploy.yml`
- `vercel.json`
- `wrangler.jsonc`
- `deno.json`

不要只改其中一处。部署这类信息一旦不同步，文档会比不写更容易误导人。

## 合并前，顺手过一遍这些问题

- 这次改动范围是否还聚焦，有没有顺手塞进无关重构
- 行为变了以后，README、部署文档或技术文档有没有一起更新
- 如果动了预览逻辑、代理逻辑或运行时入口，相关检查有没有跑过
- PR 描述里有没有把“为什么改”和“怎么验证”写清楚

推荐命令：

```bash
pnpm test
pnpm run check:cf
pnpm run check:deno
pnpm run build
```

## 发版或正式上线前，再做一轮更贴近使用者的检查

除了跑命令，最好真的手动看一下：

- README 的部署按钮还能不能走通
- `/healthz` 是否正常
- 随便拿一个远程 URL 试一下预览和下载
- 拿一个本地文件试一下拖放
- 文档里的平台名称、脚本名、目录名有没有过期

## 新 maintainer 接手时，最容易漏的事

- 仓库明明接手了，但 `Template repository` 没开
- GitHub Actions secrets 没补齐，结果 Cloudflare / Deno 一直不自动发
- 只改了平台配置，没有把 README 和部署文档一起更新
- 以为 Vercel 也跟 GitHub Actions 绑定，结果实际上是在平台侧独立配置

## 相关文档

- [文档导航](./README.md)
- [维护者部署初始化](./MAINTAINER_DEPLOY_SETUP.md)
- [部署指南](./DEPLOYMENT.md)
- [技术细节](./TECHNICAL_DETAILS.md)
- [贡献说明](./CONTRIBUTING.md)
