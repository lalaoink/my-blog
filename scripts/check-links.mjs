// ============================================================
//  内部链接检查器
//
//  用法：
//    npm run build
//    node scripts/check-links.mjs
//
//  作用：遍历 dist/ 下所有 HTML，抽出站内链接（href / src），
//        逐个确认对应文件真的存在。能在部署前抓出 404。
//
//  ⭐ 为什么值得写：手写 href 很容易打错，
//     而这种错误在浏览器里要点进去才发现。构建后跑一次就全知道。
// ============================================================

import { readdir, readFile, access } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const DIST = "dist";

/** 递归收集某目录下所有文件 */
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** 把一个站内 URL 映射到磁盘上应该存在的文件 */
async function resolveToFile(url) {
  // 去掉查询串和 hash
  const clean = url.split("#")[0].split("?")[0];
  if (!clean || clean === "/") return exists(join(DIST, "index.html"));

  const rel = clean.replace(/^\//, "");
  const candidates = [
    join(DIST, rel), // 静态资源：/pet/idle.png
    join(DIST, rel, "index.html"), // 目录式路由：/posts → /posts/index.html
    join(DIST, rel + ".html"), // Netlify 的 pretty URL：/admin/word → /admin/word.html
  ];
  for (const c of candidates) {
    if (await exists(c)) return true;
  }
  return false;
}

async function main() {
  const files = await walk(DIST);
  const htmls = files.filter((f) => extname(f) === ".html");

  if (htmls.length === 0) {
    console.error("✗ 没找到 HTML，先跑 npm run build");
    process.exit(1);
  }

  const problems = [];
  let checked = 0;

  for (const file of htmls) {
    const html = await readFile(file, "utf8");
    const page = relative(DIST, file);

    // 抽出所有 href="..." 和 src="..."
    const matches = [
      ...html.matchAll(/(?:href|src)="([^"]+)"/g),
    ].map((m) => m[1]);

    for (const raw of matches) {
      // 只检查站内链接
      if (!raw.startsWith("/") || raw.startsWith("//")) continue;
      // 跳过协议链接和纯锚点
      if (raw.startsWith("/#")) continue;
      // 跳过 JS 里动态拼接出来的伪链接，
      // 例如 pubStatus.innerHTML 里的 "/posts/" + slug + "/"
      if (/['"+\s<>{}$`]/.test(raw)) continue;

      checked++;
      const ok = await resolveToFile(raw);
      if (!ok) problems.push({ page, link: raw });
    }
  }

  // 同一页里重复的坏链接只报一次
  const seen = new Set();
  const unique = problems.filter((p) => {
    const k = `${p.page}|${p.link}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  console.log(`检查了 ${htmls.length} 个页面，${checked} 条站内链接。`);

  if (unique.length === 0) {
    console.log("✓ 没有发现坏链接。");
    return;
  }

  console.error(`\n✗ 发现 ${unique.length} 条坏链接：\n`);
  for (const p of unique) {
    console.error(`  ${p.page}  →  ${p.link}`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("检查失败：", err);
  process.exit(1);
});
