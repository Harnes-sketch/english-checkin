# 英语打卡

一个用于练习英语业务表达的打卡网站。可以查看每天的任务，记录练习时长和收获，并通过月历、每周进度和月度记录回顾完成情况。

在线地址：[英语打卡网站](https://yingzi-english-checkin-2026.harnesphilosophy.chatgpt.site/)

## 项目说明

- 计划从 2026 年 9 月 28 日开始，日期和任务内容在 `app/plan.json` 中，可按需要修改。
- 打卡记录保存在 Cloudflare D1，按登录的 ChatGPT 账号隔离。
- 网站链接可公开访问；查看和保存个人打卡记录需要登录。

## 本地运行

需要 Node.js 22.13.0 或更新版本。

```bash
npm ci
npm run dev
```

本地预览默认在 `http://127.0.0.1:5173/`。首次打开时按页面提示完成本地模拟登录。

## 技术栈

Vinext、React、Tailwind CSS、Cloudflare D1。网站通过 Sites 托管，部署配置位于 `.openai/hosting.json`。
