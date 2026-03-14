# 文档导航

如果你是第一次打开这个仓库，不需要把 `docs/` 里的每一页都读完。

按你的角色挑着看，效率会高很多。

## 先看哪几页

### 我只是想用一下这个项目

1. 先看根目录的 [README](../README.md)
2. 再看 [部署指南](./DEPLOYMENT.md)

读到这里，基本就够你把项目跑起来或部署出去。

### 我想理解它是怎么工作的

1. 先看 [README](../README.md)
2. 再看 [技术细节](./TECHNICAL_DETAILS.md)

这样能先知道项目在解决什么问题，再看实现不会太跳。

### 我想提 PR

1. [贡献说明](./CONTRIBUTING.md)
2. 需要时补 [技术细节](./TECHNICAL_DETAILS.md)
3. 如果改动会影响部署，再看 [部署指南](./DEPLOYMENT.md)

### 我是仓库维护者，准备接手部署和发布

1. [维护手册](./MAINTAINERS.md)
2. [维护者部署初始化](./MAINTAINER_DEPLOY_SETUP.md)
3. 需要时再查 [部署指南](./DEPLOYMENT.md)

## 每份文档各讲什么

- [DEPLOYMENT.md](./DEPLOYMENT.md)：本地运行、Vercel、Deno、Cloudflare Workers、Tauri 的部署方式
- [TECHNICAL_DETAILS.md](./TECHNICAL_DETAILS.md)：架构主线、代理层、安全边界、内容识别和大文件策略
- [CONTRIBUTING.md](./CONTRIBUTING.md)：外部贡献者怎么准备改动、怎么自查、PR 怎么写更容易 review
- [MAINTAINERS.md](./MAINTAINERS.md)：有合并权限、发布权限的人平时要盯哪些事
- [MAINTAINER_DEPLOY_SETUP.md](./MAINTAINER_DEPLOY_SETUP.md)：新 maintainer 第一次把自动部署接起来时要补哪些配置

## 这套文档的分工约定

为了避免信息重复，仓库里默认按这个边界写：

- `README.md` 只解决“这是什么、适合谁、从哪里开始”
- `docs/` 只放更细的步骤、实现和维护说明
- 部署、贡献、维护分开写，不混成一篇大杂烩

如果你准备补文档，优先沿着这个边界继续写，后面的人会更容易接手。
