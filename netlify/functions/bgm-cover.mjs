// ============================================================
//  Netlify 函数：Bangumi 封面图代理
//
//  为什么需要它？
//    Bangumi 的封面放在 lain.bgm.tv，这个域名在国内直连不通。
//    你的博客是公开的，访客大概率不会为了看几张封面去挂梯子 ——
//    不代理的话他们看到的是一片破图（alt 文字 + 裂图图标）。
//
//    Netlify 的服务器在境外，由它去取图再回传，全球访客都能看到。
//
//  用法：
//    GET /api/bgm-cover?p=/r/400/pic/cover/l/59/8d/90880_NYUDd.jpg
//
//  ⚠️ 只允许 lain.bgm.tv 这一个来源。
//     如果直接接受完整 URL，这个函数就变成了「任意 URL 转发器」
//     （安全上叫 open proxy / SSRF），会被拿去刷别人的站。
// ============================================================

const ALLOWED_HOST = "lain.bgm.tv";

// Bangumi 要求带一个能识别来源的 User-Agent
const UA = "lalaoink-blog/0.1 (https://github.com/lalaoink)";

export default async (req) => {
  const url = new URL(req.url);
  const path = url.searchParams.get("p") ?? "";

  // 参数校验：必须是本站能拼出的路径
  const ok =
    path.startsWith("/") &&
    !path.includes("..") &&
    !path.includes("//") &&
    path.length <= 300;

  if (!ok) {
    return new Response("bad request", { status: 400 });
  }

  const target = `https://${ALLOWED_HOST}${path}`;

  try {
    const res = await fetch(target, {
      headers: {
        "User-Agent": UA,
        // 有些图床会检查来源页，带上更保险
        Referer: "https://bgm.tv/",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      return new Response(`upstream ${res.status}`, { status: 502 });
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        "content-type": res.headers.get("content-type") ?? "image/jpeg",
        // 封面基本不会变，可以让浏览器和 Netlify 的 CDN 长期缓存。
        // 这样每张图全世界只需要回源取一次。
        "cache-control": "public, max-age=31536000, immutable",
        "netlify-cdn-cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return new Response(
      `fetch failed: ${err && err.message ? err.message : String(err)}`,
      { status: 502 }
    );
  }
};

export const config = {
  path: "/api/bgm-cover",
};
