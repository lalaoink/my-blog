// ============================================================
//  Bangumi 追番列表抓取脚本
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
//  ⭐ 为什么不在浏览器里直接调 API：
//     1) 本机网络访问不了 bgm.tv，浏览器也一样
//     2) 客户端调用会把请求分散到每个访客，还可能被限流
//     3) 静态 JSON 零延迟、零依赖、离线可构建
// ============================================================

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// ---------- 配置 ----------
const USERNAME = process.env.BANGUMI_USERNAME ?? "765864";
const OUT_FILE = "src/data/bangumi.json";

// 可选：访问令牌。收藏设为「私密」时，未认证请求会返回 0 条，
// 必须带上 token 才能读到。token 从环境变量读，绝不写进代码或仓库。
//   PowerShell: $env:BANGUMI_TOKEN="..."
//   GitHub Actions: 存在仓库 Secrets 里的 BANGUMI_TOKEN
const TOKEN = (process.env.BANGUMI_TOKEN ?? "").trim();

// Bangumi 要求带一个能识别来源的 User-Agent，否则可能被拒
const UA = "lalaoink-blog/0.1 (https://github.com/lalaoink)";

const API = "https://api.bgm.tv/v0";

// ⚠️ API 硬性限制：limit 最大 50，超过会被拒。所以必须翻页。
const PAGE_SIZE = 50;

// 条目类型：2 = 动画
const SUBJECT_ANIME = 2;

// 收藏类型
const COLLECTION_TYPES = {
  1: "想看",
  2: "看过",
  3: "在看",
  4: "搁置",
  5: "抛弃",
};

// ---------- 工具 ----------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, { retries = 3 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const headers = { "User-Agent": UA, Accept: "application/json" };
      // 有 token 就带上 —— 否则私密收藏会返回 0 条
      if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

      const res = await fetch(url, { headers });
      if (res.status === 404) {
        throw new Error(`用户不存在或接口 404：${url}`);
      }
      if (res.status === 429) {
        // 被限流了，退避重试
        const wait = 2000 * attempt;
        console.warn(`  ⚠ 429 限流，等待 ${wait}ms 后重试…`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        console.warn(`  ⚠ 第 ${attempt} 次失败（${err.message}），重试…`);
        await sleep(1000 * attempt);
      }
    }
  }
  throw lastErr;
}

/** 拉取某个收藏类型的全部条目（自动翻页） */
async function fetchCollection(subjectType, collectionType) {
  const items = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const url =
      `${API}/users/${encodeURIComponent(USERNAME)}/collections` +
      `?subject_type=${subjectType}&type=${collectionType}` +
      `&limit=${PAGE_SIZE}&offset=${offset}`;

    const page = await fetchJson(url);
    total = page.total ?? 0;

    if (!Array.isArray(page.data) || page.data.length === 0) break;

    items.push(...page.data);
    offset += PAGE_SIZE;

    // 别打太快，对免费 API 客气一点
    if (offset < total) await sleep(350);
  }

  return { total, items };
}

/** 把 API 的原始条目裁剪成前端真正要用的字段 */
function normalize(raw) {
  const s = raw.subject ?? {};
  return {
    id: raw.subject_id,
    name: s.name ?? "",
    nameCn: s.name_cn ?? "",
    // 取 common（400px 宽）做卡片封面，够清晰又不至于太大
    cover: s.images?.common ?? s.images?.medium ?? s.images?.large ?? null,
    eps: s.eps ?? 0,
    score: s.score ?? 0,
    rank: s.rank ?? 0,
    date: s.date ?? "",
    summary: (s.short_summary ?? "").trim(),
    // 我的进度
    epStatus: raw.ep_status ?? 0,
    myRate: raw.rate ?? 0,
    comment: raw.comment ?? "",
    tags: (raw.tags ?? []).slice(0, 6),
    collectionType: raw.type,
    collectionLabel: COLLECTION_TYPES[raw.type] ?? "未知",
    updatedAt: raw.updated_at,
    private: raw.private ?? false,
  };
}

// ---------- 主流程 ----------
async function main() {
  console.log(
    `→ 抓取 Bangumi 用户 ${USERNAME} 的动画收藏…` +
      (TOKEN ? "（已带访问令牌）" : "（⚠️ 无令牌，只能读公开收藏）")
  );

  const byType = {};
  const all = [];

  for (const [typeStr, label] of Object.entries(COLLECTION_TYPES)) {
    const type = Number(typeStr);
    const { total, items } = await fetchCollection(SUBJECT_ANIME, type);
    console.log(`  ${label.padEnd(4)} total=${total}  取到 ${items.length} 条`);
    if (items.length > 0) {
      const norm = items.map(normalize);
      byType[type] = norm;
      all.push(...norm);
    }
  }

  // 排序：在看 → 想看 → 看过 → 搁置 → 抛弃；同组内按更新时间倒序
  const order = [3, 1, 2, 4, 5];
  all.sort((a, b) => {
    const d = order.indexOf(a.collectionType) - order.indexOf(b.collectionType);
    if (d !== 0) return d;
    return String(b.updatedAt).localeCompare(String(a.updatedAt));
  });

  const payload = {
    fetchedAt: new Date().toISOString(),
    username: USERNAME,
    total: all.length,
    counts: Object.fromEntries(
      Object.entries(COLLECTION_TYPES).map(([t, label]) => [
        label,
        (byType[t] ?? []).length,
      ])
    ),
    items: all,
  };

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
    all.length === 0 &&
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
  console.log(`  共 ${all.length} 条（在看 ${payload.counts["在看"]}）`);

  if (all.length === 0) {
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
