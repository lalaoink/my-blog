// ============================================================
//  内容集合（Content Collections）的配置
//
//  作用：告诉 Astro「src/content/blog/ 里的 Markdown 文件长什么样」。
//  写错 frontmatter（比如漏了 title）时，构建会直接报错并指出是哪个文件，
//  而不是等页面渲染出来才发现字段是空的。
//
//  ⭐ 这个文件在【构建时】由 Node 执行，不会发给浏览器。
// ============================================================

import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  // loader：从哪里读文章。
  // base 相对于项目根目录，pattern 是 glob 匹配规则。
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),

  // schema：每篇文章的 frontmatter 必须满足的格式。
  // 类似 C++ 里给一个结构体定义字段和类型，只不过这是运行前就校验的。
  schema: z.object({
    title: z.string(), // 必填
    date: z.coerce.date(), // 必填，且会被转成 Date 对象
    description: z.string().optional(), // 可选
    tags: z.array(z.string()).default([]), // 不写就是空数组
    draft: z.boolean().default(false), // 草稿标记，默认 false
  }),
});

// 可以有多个集合，比如以后加一个 tutorials
export const collections = { blog };
