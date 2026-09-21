# 我的博客 · My Blog

一个用 **Astro** 搭建的个人博客，展示文章与教程，并带一个网页桌宠和 Bangumi 追番列表。

参考版式：[wordland.site](https://wordland.site/)（朋友的站，同样是 Astro + Netlify）

---

## 🚦 现在是什么状态

**骨架已就绪，等你写第一个页面。**

| 部分 | 状态 |
| --- | --- |
| 工具链（Node / npm / Git / VS Code 扩展） | ✅ 已完成 |
| Astro 项目骨架（`package.json` / `astro.config.mjs`） | ✅ 已完成 |
| 阶段 1 练习：`playground/index.html` | ⏳ **等你做**（复制 `playground/example.html` 改三处文字） |
| 阶段 2：`src/pages/index.astro` | ⏳ 参考示例已备好（`playground/example.astro`） |
| 阶段 3 起（文章系统 / 桌宠 / Bangumi / 部署） | 未开始 |

---

## 🚀 怎么跑起来

```powershell
npm run dev
```

然后浏览器打开 **http://localhost:4321**

> 现在还看不到东西，首页会返回 404 —— 因为 `src/pages/index.astro` 还没写。
> 写完它，`/` 就通了。

其它命令：

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器（改代码自动刷新） |
| `npm run build` | 生成静态站点到 `dist/`（用来部署） |
| `npm run preview` | 本地预览 `dist/` 里的成品 |

---

## 📁 目录说明

```
my-blog/
├── astro.config.mjs      Astro 配置
├── package.json          项目定义（依赖 + 脚本）
├── docs/                 📘 学习文档（**要学的都在这儿**）
├── playground/           练习场：example.html / example.astro 参考示例
├── src/pages/            ⭐ 页面放这里。「路由即文件」：
│                           src/pages/index.astro  →  /
│                           src/pages/about.astro  →  /about
├── .vscode/              编辑器配置（推荐扩展 + 工作区设置）
└── .gitignore            别提交 node_modules / dist / .env
```

**一个 Astro 项目的最小构成**就 4 样：`package.json`、`astro.config.mjs`、`src/pages/`、`node_modules/`。
其余的都可以不要。

---

## 📘 学习文档怎么读

按顺序，或者遇到问题时按需查：

| 文档 | 什么时候读 |
| --- | --- |
| [`docs/00-学习路线与进度.md`](docs/00-学习路线与进度.md) | **入口**。六阶段路线图 + 任务清单 + 进度日志 |
| [`docs/01-C++程序员的思维转换.md`](docs/01-C++程序员的思维转换.md) | 想不通前端概念时。C++ → 前端对照表 |
| [`docs/02-Bangumi接入预研与风险.md`](docs/02-Bangumi接入预研与风险.md) | 做追番列表前 |
| [`docs/03-参考站设计令牌与技法拆解.md`](docs/03-参考站设计令牌与技法拆解.md) | 写 CSS 前。配色、`65ch` 排版法、动画 |
| [`docs/04-本机网络环境实测与对策.md`](docs/04-本机网络环境实测与对策.md) | **动工前必读**。解释了为什么有些命令在你这台机器上不一样 |

---

## ⚠️ 这台机器的三个特殊之处

不了解会白白卡住好几小时，详见 [`docs/04`](docs/04-本机网络环境实测与对策.md)：

1. **`npm create astro@latest` 用不了** —— 它要从 `github.com` 拉模板，而这个域名的 HTTPS 在这里被阻断。
   本项目的骨架是**手动搭建**的，你不需要再跑那条命令。
2. **本机访问不了 `bgm.tv`** —— 所以追番列表将来由 GitHub Actions 在境外拉取，产出 JSON 提交回仓库。
3. **推代码到 GitHub 必须用 SSH**（`git@github.com:...`），HTTPS 通道不通。

---

## ✍️ 写作约定

- 代码用 2 空格缩进（`.vscode/settings.json` 已配好）
- 文件统一 UTF-8 **无 BOM**
- 每次收工前 `git commit` 一次
