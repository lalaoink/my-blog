---
title: 这个博客是怎么搭起来的
date: 2026-09-22
description: Astro + 静态生成，以及为什么它比想象中简单。
tags: ["前端", "Astro", "教程"]
---

## 一个 Astro 项目的最小构成

只有四样东西：

```
my-blog/
├── package.json        依赖和脚本
├── astro.config.mjs    配置
├── src/pages/          页面（路由即文件）
└── node_modules/       依赖本体
```

其余的都可以不要。

## 「路由即文件」是什么意思

在 C++ 里写 Web 服务，你得注册路由：

```cpp
server.Get("/about", handleAbout);
server.Get("/posts", handlePosts);
```

Astro 里不用。**往 `src/pages/` 丢一个文件，就多一个网址**：

| 文件 | 网址 |
| --- | --- |
| `src/pages/index.astro` | `/` |
| `src/pages/about.astro` | `/about` |
| `src/pages/posts/index.astro` | `/posts` |
| `src/pages/posts/[...id].astro` | `/posts/任意id` |

没有路由表要维护，文件名就是路由。

## 构建时 vs 运行时

这是 Astro 最需要想通的一点。同一份代码，可能跑在两个完全不同的地方：

```astro
---
// 这一段跑在【你的电脑上】（构建时，Node.js 里）
const posts = await getCollection("blog");
const now = new Date().toLocaleString("zh-CN");
---
<html>
  <body>
    <h1>共 {posts.length} 篇文章</h1>

    <!-- 这一段会发到【用户的浏览器】里执行 -->
    <script>
      document.querySelector("h1").addEventListener("click", () => {
        alert("你点了我");
      });
    </script>
  </body>
</html>
```

分界线很清晰：

- `---` 之间 → **构建时**。能读文件、调 API、用密钥，用户永远看不到这些代码。
- `<script>` 里 → **运行时**。会原样发送到浏览器，所有人都能查看。

> 结论：密钥只能放在构建时。放到 `<script>` 里等于公开发布。

## 为什么文章是 Markdown

因为写文章的时候不该操心 HTML 标签。

```
src/content/blog/hello.md   →   /posts/hello
```

丢一个 `.md` 进去，页面自动就有了。**加文章不需要改任何代码。**

## 静态站的好处

整站构建完就是一堆纯 HTML 文件，不需要服务器、不需要数据库。放在 Netlify 这类静态托管上是**免费**的，而且快——因为没有东西需要现算。

代价是：内容更新需要重新构建。对一个博客来说，这不是问题。
