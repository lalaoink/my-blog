import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// ============================================================
//  Astro 的配置文件。
//
//  site 是「本站的正式网址」，RSS 和 sitemap 需要它来生成绝对链接。
//  部署到 Netlify 后，如果拿到的域名不是下面这个，有两种改法：
//    1) 直接改这里的默认值
//    2) 在 Netlify 的环境变量里加 SITE_URL=https://你的域名
// ============================================================
const SITE = process.env.SITE_URL ?? "https://lalaoink-blog.netlify.app";

export default defineConfig({
  site: SITE,

  // sitemap 会自动生成 /sitemap-index.xml，方便搜索引擎收录
  integrations: [sitemap()],

  // 构建产物：纯静态 HTML，不需要服务器
  output: "static",

  markdown: {
    shikiConfig: {
      // Astro 默认用 github-dark（深色代码块），
      // 和本站的浅色极简风不搭，换成浅色主题。
      theme: "github-light",
      // 代码块超出宽度时允许横向滚动，而不是撑破版面
      wrap: false,
    },
  },
});
