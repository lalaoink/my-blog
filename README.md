# 言与叶之庭

一个用 **Astro** 搭建的静态博客：文章与教程展示、网页桌宠、Bangumi 追番列表。

版式参考：[wordland.site](https://wordland.site/)（朋友的站，同样是 Astro + Netlify）
**注意：仅参考其版式与设计，未使用其任何文章内容。**

---

## 🚦 当前状态

**整站已可运行，全部页面通过验证。**

| 部分 | 状态 |
| --- | --- |
| 极简文学风版式（设计令牌照搬参考站） | ✅ 完成 |
| 首页 / 文章列表 / 文章详情 / 关于 / 追番 | ✅ 5 类页面全部可用（`astro build` 出 7 个 HTML） |
| 文章系统（Markdown + frontmatter 校验） | ✅ 完成，含 3 篇起始文章 |
| 文章详情页 | ✅ 含目录、上下篇导航、Shiki 代码高亮 |
| 艾雅法拉桌宠（Spine 骨骼动画） | ✅ 6 组动画、点击互动、拖拽、随机散步、挂机会坐下/睡觉 |
| 通栏导航栏 | ✅ 渐变铺满视口宽度，链接与正文对齐 |
| 一言模块 | ✅ 首页标题下方，客户端实时拉取，点击换句 |
| Bangumi 追番 | ✅ 抓取脚本 + Actions 定时更新已验证；⚠️ 你的账号目前收藏为空，页面显示空状态 |
| 部署配置 | ✅ `netlify.toml` 就绪 |
| **GitHub 远端 + 实际上线** | ⏳ **待做**（需要你的 SSH 公钥） |

---

## 🚀 怎么跑起来

```powershell
npm run dev
```

浏览器打开 **http://localhost:4321**

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器（改代码自动刷新） |
| `npm run build` | 生成静态站点到 `dist/` |
| `npm run preview` | 本地预览 `dist/` 成品 |
| `npm run bangumi` | 重新拉取 Bangumi 追番数据 |

---

## 📁 目录说明

```
my-blog/
├── astro.config.mjs           Astro 配置
├── netlify.toml               部署配置
├── docs/                      📘 学习文档（00 是入口）
├── playground/                练习场
│   ├── example.html           逐行注释的 HTML/CSS/JS 参考
│   ├── example.astro          构建时 vs 运行时的参考
│   ├── example-layout.astro   布局组件参考
│   ├── example-post.astro     文章详情页参考
│   └── Another/               ← 你自己写的练习
├── public/
│   ├── favicon.svg
│   └── pet-eyja/              艾雅法拉 Spine 模型 + 运行时（含 NOTICE.txt）
├── scripts/
│   └── fetch-bangumi.mjs      Bangumi 抓取（自动翻页，limit 上限 50）
└── src/
    ├── components/DesktopPet.astro   桌宠（客户端岛屿）
    ├── layouts/BaseLayout.astro      全站外壳
    ├── styles/global.css             设计令牌与版式
    ├── data/bangumi.json             抓取产物（静态数据）
    ├── content/blog/*.md             文章
    ├── content.config.ts             文章 frontmatter 格式定义
    └── pages/                        页面（路由即文件）
```

---

## ✍️ 怎么加一篇文章

在 `src/content/blog/` 里新建一个 `.md` 文件：

```markdown
---
title: 文章标题
date: 2026-09-23
description: 一句话摘要（可选）
tags: ["标签"]
---

正文用 Markdown 写。
```

**不需要改任何代码**，文件丢进去就会出现在列表里。

---

## 🐋 桌宠怎么互动

| 操作 | 反应 |
| --- | --- |
| 什么都不做 | 每几秒随机眨眼；25 秒后犯困睡着 |
| 鼠标移到身上 | 出现高亮阴影 |
| **点一下** | 切换挥手/开心动画，随机说一句话 |
| **按住拖动** | 跟着鼠标走，松手后留在原地 |
| 放着一会儿 | 会自己左右散步 |

模型来自 [isHarryh/Ark-Models](https://github.com/isHarryh/Ark-Models)，
运行时用 [Spine Runtimes](https://github.com/EsotericSoftware/spine-runtimes) 3.8。
**角色版权归鹰角网络所有，这是一份未获官方授权的同人使用，仅供个人学习。**
完整说明见 `public/pet-eyja/NOTICE.txt`。

---

## 📚 学习文档怎么读

| 文档 | 什么时候读 |
| --- | --- |
| [`docs/00-学习路线与进度.md`](docs/00-学习路线与进度.md) | **入口**：路线图 + 进度日志 |
| [`docs/01-C++程序员的思维转换.md`](docs/01-C++程序员的思维转换.md) | 想不通前端概念时 |
| [`docs/02-Bangumi接入预研与风险.md`](docs/02-Bangumi接入预研与风险.md) | 想改追番功能时 |
| [`docs/03-参考站设计令牌与技法拆解.md`](docs/03-参考站设计令牌与技法拆解.md) | 想调样式时 |
| [`docs/04-本机网络环境实测与对策.md`](docs/04-本机网络环境实测与对策.md) | **动工前必读**：解释本机的网络限制 |

---

## ⚠️ 本机环境的三个特殊之处

详见 [`docs/04`](docs/04-本机网络环境实测与对策.md)：

1. **`npm create astro@latest` 用不了** —— 要从 `github.com` 拉模板，而该域名 HTTPS 被阻断。本项目是手动搭的，不需要它。
2. **本机直连访问不了 `bgm.tv` / `github.com`** —— 但你的 **Clash Verge 代理（127.0.0.1:7897）可以打通**。跑 Bangumi 脚本前先设：
   ```powershell
   $env:HTTPS_PROXY="http://127.0.0.1:7897"; $env:NODE_USE_ENV_PROXY="1"
   ```
3. **推代码到 GitHub 用 SSH**（`git@github.com:...`），HTTPS 通道不通。

---

## ✍️ 写作约定

- 代码 2 空格缩进（`.vscode/settings.json` 已配）
- 文件统一 UTF-8 **无 BOM**
- 每次收工前 `git commit` 一次
