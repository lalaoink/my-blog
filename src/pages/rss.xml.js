// ============================================================
//  RSS 订阅源
//
//  Astro 会把 src/pages/ 下的 .js 文件当成「端点」来处理：
//  它不是页面，而是一个在构建时执行、直接输出内容的接口。
//  文件名 rss.xml.js → 产物就是 /rss.xml
//
//  ⭐ 这个文件在【构建时】执行，跑在 Node 里，
//     所以可以直接用 getCollection 读 Markdown 文章。
// ============================================================

import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const posts = await getCollection("blog", ({ data }) => !data.draft);

  const sorted = posts.sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: "言与叶之庭",
    description: "在字与叶之间，搭一座庭园。文章与教程。",
    // context.site 来自 astro.config.mjs 里的 site 字段
    site: context.site,
    items: sorted.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description ?? "",
      // 结尾的斜杠和站点实际路由保持一致
      link: `/posts/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: `<language>zh-cn</language>`,
  });
}
