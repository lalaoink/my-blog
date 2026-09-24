// ============================================================
//  Bangumi 追番列表抓取脚本（CLI）
//
//  用法（本地，走 Clash Verge 代理）：
//    $env:HTTPS_PROXY="http://127.0.0.1:7897"
//    $env:NODE_USE_ENV_PROXY="1"
//    node scripts/fetch-bangumi.mjs
//
//  用法（GitHub Actions，境外直连，无需代理）：
//    node scripts/fetch-bangumi.mjs
//
//  产出：src/data/bangumi.json —— 静态数据，构建时被 bangumi.astro 读取。
//        （线上点「更新列表」走的是 netlify/functions/bangumi.mjs，不经过这里）
//
//  ⭐ 为什么不在浏览器里直接调 API：
//     1) 本机网络访问不了 bgm.tv，浏览器也一样
//     2) 客户端调用会把请求分散到每个访客，还可能被限流
//     3) 静态 JSON 零延迟、零依赖、离线可构建
//
//  实际的抓取逻辑在 scripts/bangumi-core.mjs，和 Netlify 函数共用同一份。
// ============================================================

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fetchAll } from "./bangumi-core.mjs";

// ---------- 配置 ----------
const USERNAME = process.env.BANGUMI_USERNAME ?? "765864";
const OUT_FILE = "src/data/bangumi.json";

// 可选：访问令牌。收藏设为「私密」时，未认证请求会返回 0 条，
// 必须带上 token 才能读到。token 从环境变量读，绝不写进代码或仓库。
//   PowerShell: $env:BANGUMI_TOKEN="..."
//   GitHub Actions: 存在仓库 Secrets 里的 BANGUMI_TOKEN
const TOKEN = (process.env.BANGUMI_TOKEN ?? "").trim();

// ---------- 主流程 ----------
async function main() {
  console.log(
    `→ 抓取 Bangumi 用户 ${USERNAME} 的动画收藏…` +
      (TOKEN ? "（已带访问令牌）" : "（⚠️ 无令牌，只能读公开收藏）")
  );

  const payload = await fetchAll({
    username: USERNAME,
    token: TOKEN,
    log: (m) => console.log(m),
  });

  if (payload.total === 0) {
    console.log("  （一个条目都没取到）");
  }

  // ★ 防覆盖保护。
  //   私密收藏在缺少/失效令牌时会被 API 返回 0 条 —— 如果直接写盘，
  //   就会把上一次的好数据抹成空。GitHub Actions 上已经真实发生过一次。
  let previousCount = 0;
  try {
    const prev = JSON.parse(await readFile(OUT_FILE, "utf8"));
    previousCount = prev.total ?? 0;
  } catch {
    // 文件不存在或损坏，当作 0
  }

  if (
    payload.total === 0 &&
    previousCount > 0 &&
    process.env.BANGUMI_ALLOW_EMPTY !== "1"
  ) {
    console.error(
      `\n✗ 本次抓到 0 条，但现有数据有 ${previousCount} 条 —— 拒绝覆盖。\n` +
        "  最可能的原因：缺少或失效的 BANGUMI_TOKEN。\n" +
        "  收藏设为私密时，未认证请求会返回 0 条（而不是报错），所以必须带令牌。\n" +
        "  确认确实要清空时，设置 BANGUMI_ALLOW_EMPTY=1 再运行。"
    );
    process.exit(1);
  }

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`\n✓ 写入 ${OUT_FILE}`);
  console.log(`  共 ${payload.total} 条（在看 ${payload.counts["在看"]}）`);

  if (payload.total === 0) {
    console.log(
      "\n提示：该账号目前没有公开的动画收藏。\n" +
        "      去 https://bgm.tv 把几部动画标记为「在看」，再重跑本脚本即可。\n" +
        "      若收藏是私密的，需要设置公开或改用 access token。"
    );
  }
}

main().catch((err) => {
  console.error("\n✗ 抓取失败：", err.message);
  console.error(
    "\n排查建议：\n" +
      "  1) 本地运行需先设置代理：\n" +
      '     $env:HTTPS_PROXY="http://127.0.0.1:7897"; $env:NODE_USE_ENV_PROXY="1"\n' +
      "  2) 确认 Clash Verge 正在运行且已开启系统代理"
  );
  process.exit(1);
});
