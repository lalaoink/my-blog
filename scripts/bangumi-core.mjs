// ============================================================
//  Bangumi 抓取核心逻辑（被两个地方共用）
//
//    1. scripts/fetch-bangumi.mjs   —— 本地 / GitHub Actions 跑，写进 src/data/bangumi.json
//    2. netlify/functions/bangumi.mjs —— 线上点「更新列表」时实时拉取
//
//  把逻辑放这里是为了避免两处各写一份、日后改一处忘一处。
// ============================================================

// Bangumi 要求带一个能识别来源的 User-Agent，否则可能被拒
export const UA = "lalaoink-blog/0.1 (https://github.com/lalaoink)";

export const API = "https://api.bgm.tv/v0";

// ⚠️ API 硬性限制：limit 最大 50，超过会被拒。所以必须翻页。
export const PAGE_SIZE = 50;

// 条目类型：2 = 动画
export const SUBJECT_ANIME = 2;

// 收藏类型
export const COLLECTION_TYPES = {
  1: "想看",
  2: "看过",
  3: "在看",
  4: "搁置",
  5: "抛弃",
};

// 排序优先级：在看 → 想看 → 看过 → 搁置 → 抛弃
export const SORT_ORDER = [3, 1, 2, 4, 5];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, { token, retries = 3, log = () => {} } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const headers = { "User-Agent": UA, Accept: "application/json" };
      // 有 token 就带上 —— 否则私密收藏会返回 0 条（而不是报错）
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(url, { headers });
      if (res.status === 404) {
        throw new Error(`用户不存在或接口 404：${url}`);
      }
      if (res.status === 429) {
        // 被限流了，退避重试
        const wait = 2000 * attempt;
        log(`  ⚠ 429 限流，等待 ${wait}ms 后重试…`);
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
        log(`  ⚠ 第 ${attempt} 次失败（${err.message}），重试…`);
        await sleep(1000 * attempt);
      }
    }
  }
  throw lastErr;
}

/** 拉取某个收藏类型的全部条目（自动翻页） */
async function fetchCollection(subjectType, collectionType, { username, token, log }) {
  const items = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const url =
      `${API}/users/${encodeURIComponent(username)}/collections` +
      `?subject_type=${subjectType}&type=${collectionType}` +
      `&limit=${PAGE_SIZE}&offset=${offset}`;

    const page = await fetchJson(url, { token, log });
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
export function normalize(raw) {
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

/**
 * 拉取一个用户的全部动画收藏，返回可直接喂给前端的 payload。
 *
 * @param {object}  opts
 * @param {string}  opts.username  Bangumi 用户名或 UID
 * @param {string}  opts.token     访问令牌；私密收藏必填
 * @param {Function} [opts.log]    日志回调，默认丢弃
 */
export async function fetchAll({ username, token = "", log = () => {} } = {}) {
  if (!username) throw new Error("缺少 BANGUMI_USERNAME");

  const byType = {};
  const all = [];

  for (const [typeStr, label] of Object.entries(COLLECTION_TYPES)) {
    const type = Number(typeStr);
    const { total, items } = await fetchCollection(SUBJECT_ANIME, type, {
      username,
      token,
      log,
    });
    log(`  ${label.padEnd(4)} total=${total}  取到 ${items.length} 条`);
    if (items.length > 0) {
      const norm = items.map(normalize);
      byType[type] = norm;
      all.push(...norm);
    }
  }

  // 排序：在看 → 想看 → 看过 → 搁置 → 抛弃；同组内按更新时间倒序
  all.sort((a, b) => {
    const d = SORT_ORDER.indexOf(a.collectionType) - SORT_ORDER.indexOf(b.collectionType);
    if (d !== 0) return d;
    return String(b.updatedAt).localeCompare(String(a.updatedAt));
  });

  return {
    fetchedAt: new Date().toISOString(),
    username,
    total: all.length,
    counts: Object.fromEntries(
      Object.entries(COLLECTION_TYPES).map(([t, label]) => [label, (byType[t] ?? []).length])
    ),
    items: all,
  };
}
