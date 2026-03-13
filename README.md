# AnyPeek

把陌生链接和本地文件，直接变成能看的内容。

不想先下载，不想先装软件，也不想猜这个链接里到底是什么时，AnyPeek 就很顺手。

先看内容，再决定要不要下载、保存，或者继续处理。

[Use this template](https://github.com/kfcx/AnyPeek/generate)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kfcx/AnyPeek)
[![Deploy on Deno](https://deno.com/button)](https://console.deno.com/new?clone=https://github.com/kfcx/AnyPeek&install=npx%20pnpm%4010.32.1%20install%20--frozen-lockfile&build=npx%20pnpm%4010.32.1%20run%20build)

## 为什么会做这个

很多时候，我们只是想先看一眼内容。

- 一份文档，电脑上却没装对应软件
- 一个陌生链接，不确定里面是图片、文档、视频，还是纯文本
- 一个会触发下载的地址，只想看看内容，不想先落盘到本地

AnyPeek 把这件事尽量变简单了：打开网页，贴上 URL，或者直接拖进文件，就能开始看。

## 这些场景会很好用

- 想临时看看一个 DOCX、XLSX、PPTX 或 PDF
- 想确认一个链接到底指向什么内容
- 想直接查看图片、音频、视频、文本、JSON、代码片段
- 想打开像 `.m3u8` 这样的链接，只看里面的文本，不想先下载
- 想把未知格式先用 Hex 视图扫一眼

## 它能做什么

- 直接打开任意 `http` 或 `https` 链接
- 支持拖放本地文件
- 根据响应头、文件后缀和文件头信息一起判断内容类型
- 对识别不了的内容，自动回退到文本或 Hex 视图

## 为什么看大文件也更轻

AnyPeek 不是一上来就把整份大文件塞进浏览器。

- 文本和 Hex 视图按块读取内容，滚动到哪里再继续读哪里
- 远程资源优先走 `Range` 分段请求，能切片就切片
- 列表渲染用了虚拟滚动，页面上只保留当前可见的那部分内容

这让它在查看大日志、大文本、播放列表、导出文件这类内容时，明显比“先下载再找软件打开”更省事。

## 从这里开始

- 想先复制一份仓库，用 `Use this template`
- 想直接上线，用上面的部署按钮
- 想看部署步骤、实现细节和维护方式，从下面这些文档继续

## 文档

- [部署指南](./docs/DEPLOYMENT.md)：本地、Deno、Cloudflare Workers 三种方案
- [技术细节](./docs/TECHNICAL_DETAILS.md)：痛点、主链路、内容识别和大文件处理方式
- [维护手册](./docs/MAINTAINERS.md)：仓库维护、自动部署、发版前检查
- [贡献说明](./docs/CONTRIBUTING.md)：怎么提一个有效改动，改完后看哪些检查
