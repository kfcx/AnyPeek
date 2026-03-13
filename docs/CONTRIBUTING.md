# 贡献说明

想修个小问题、润色文档、补一类预览、或者把某段交互做顺一点，都欢迎。

这页只讲一件事：怎么提一个容易被看懂、也容易被合进去的改动。

## 从哪里开始

- 先看 [README](../README.md)，确认项目在解决什么问题
- 需要本地跑起来时，看 [部署指南](./DEPLOYMENT.md)
- 涉及预览链路、代理逻辑或大文件处理时，看 [技术细节](./TECHNICAL_DETAILS.md)

## 什么时候可以直接提 PR

这些改动通常可以直接开工：

- 文档润色
- 小的样式或交互修正
- 明确的 bug fix
- 不改变方向的小优化

如果你准备改的是下面这些，最好先开个 issue 或讨论一下：

- 新增一整类预览能力
- 改代理、安全限制或远程读取行为
- 改部署方式、运行时入口或平台支持范围
- 会影响 README 主叙事或产品定位的改动

这样不是为了设门槛，而是为了避免你花了很多时间，最后改动方向根本对不上。

## 提交时尽量做到

- 把改动讲清楚：改了什么，为什么改
- 改动尽量聚焦，不把无关重构一起塞进来
- 如果行为变了，把对应文档一起补上

如果是界面改动，带一张截图通常会省很多来回沟通。

## 本地自查不用太重

不是每次都要把整套流程跑满，按改动类型来就行：

- 只改文档：自己通读一遍，确认链接和表述没问题
- 改前端交互或预览逻辑：至少跑 `pnpm test` 和 `pnpm run build`
- 改 Cloudflare / Deno / Vercel / 代理相关逻辑：再补上 `pnpm run check:cf` 和 `pnpm run check:deno`

常用命令放这里：

```bash
pnpm test
pnpm run check:cf
pnpm run check:deno
pnpm run build
```

## 文档怎么跟着更新

如果改动影响到文档，按这个边界更新就够了：

- `README.md`：项目介绍、场景、部署入口
- `docs/DEPLOYMENT.md`：本地、Vercel、Deno、Cloudflare Workers 的部署方式
- `docs/TECHNICAL_DETAILS.md`：实现思路、主链路、大文件策略
- `docs/MAINTAINERS.md`：仓库维护、工作流、发版相关内容

README 留给第一次打开仓库的人。
更细的步骤和解释，继续放在 `docs/` 会更清楚。
