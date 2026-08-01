# 天工开帧 · 教程博客

一个面向本地 AI / 实战教程的轻量博客，基于 **Astro** 构建，部署在 **Vercel**，内容用 Markdown 管理。

## ✨ 特性

- 🚀 Astro 静态站点，零 JS 框架负担，加载快
- 📝 Markdown 教程内容（`src/content/blog/`）
- 🎨 科技感暗色设计 + 字体分解动效
- 🔒 本地 Markdown 管理后台（仅本机可访问，不会部署到公网）

## 🧞 本地开发

```sh
npm install
npm run dev
```

打开 http://localhost:4321 预览。

本地管理后台（编辑 / 上传 Markdown 教程）：

```sh
npm run admin
```

打开 http://localhost:4322/admin（后台只监听 127.0.0.1，公网无法访问）。

## 🗂 内容结构

- `src/content/blog/*.md`：一篇教程 = 一个 Markdown 文件
- `public/images/tutorials/`：教程截图，Markdown 中用 `/images/tutorials/xxx.png` 引用
- `src/content/archive/`：已归档、不发布的旧文章

新增教程：在 `src/content/blog/` 放一个带 frontmatter 的 `.md` 文件即可：

```md
---
title: '教程标题'
description: '一句话描述'
pubDate: '2026-08-01'
updatedDate: '2026-08-01'
heroImage: '../../assets/blog-placeholder-1.jpg'
---

正文内容…
```

## 🚀 部署到 Vercel（GitHub 自动同步）

### 1. 推送到 GitHub

在 GitHub 上新建一个仓库（如 `tutorial-blog`），然后：

```sh
git remote add origin https://github.com/<你的用户名>/tutorial-blog.git
git branch -M main
git push -u origin main
```

### 2. 在 Vercel 导入项目

1. 打开 https://vercel.com 并用 GitHub 登录
2. 点击 **Add New → Project**
3. 选择刚推送的 `tutorial-blog` 仓库
4. Vercel 会自动识别 Astro，无需修改任何配置
   - Framework Preset：`Astro`（自动）
   - Build Command：`npm run build`（自动）
   - Output Directory：`dist`（自动）
5. 点击 **Deploy**，等 1-2 分钟即可获得公开网址 `https://<project>.vercel.app`

### 3. 每次 push 自动更新

Vercel 连接 GitHub 后，之后每次 `git push` 到 `main` 分支都会**自动触发重新部署**：

```sh
git add -A
git commit -m "更新教程"
git push
```

推送后约 1 分钟，公开网址即为最新内容。

### 4. 绑定自定义域名（可选）

在 Vercel 项目 **Settings → Domains** 里添加你的域名，按提示配置 DNS 即可。

## 🔒 安全说明

- 后台（`npm run admin`）是本地 Node 服务，只监听 `127.0.0.1`，**不会**被部署到 Vercel
- 公网站点只有静态页面 + 教程内容，没有任何可写的后台接口
