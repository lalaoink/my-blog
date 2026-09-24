// ============================================================
//  Netlify 函数：实时拉取 Bangumi 收藏
//
//  为什么需要它？
//    你的 Bangumi 收藏是「私密」的 —— 浏览器直接调 api.bgm.tv 拿不到数据，
//    而且国内访问还需要挂 VPN。所以必须由服务器带 token 去拉。
//    Netlify 的服务器在境外，可以直连 Bangumi，也不需要代理。
//
//  访问方式：
//    GET /api/bangumi            正常读取（带 5 分钟浏览器/CDN 缓存）
//    GET /api/bangumi?refresh=1  强制拉最新的（追番页「更新列表」按钮用这个）
//
//  需要的环境变量（Netlify 后台 → Site configuration → Environment variables）：
//    BANGUMI_TOKEN     必填。Bangumi 访问令牌，缺了会返回 0 条。
//    BANGUMI_USERNAME  可选，默认 765864。
//
//  本文件不写盘、不提交 git —— 数据只回给浏览器，静态首屏仍用
//  src/data/bangumi.json（由 scripts/fetch-bangumi.mjs 生成）。
// ============================================================

import { fetchAll } from "../../scripts/bangumi-core.mjs";

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export default async (req) => {
  const url = new URL(req.url);
  const force = url.searchParams.get("refresh") === "1";

  const token = (process.env.BANGUMI_TOKEN ?? "").trim();
  const username = (process.env.BANGUMI_USERNAME ?? "765864").trim();

  if (!token) {
    return json(
      {
        error: "服务器没有配置 BANGUMI_TOKEN",
        hint:
          "去 Netlify 后台 → Site configuration → Environment variables 添加 BANGUMI_TOKEN，" +
          "然后重新部署一次（改环境变量不会自动生效于已在运行的函数）。",
      },
      500
    );
  }

  try {
    const payload = await fetchAll({ username, token });
    // 一个条目都没拉到，基本就是 token 失效或用户名写错了
    if (payload.total === 0) {
      return json(
        {
          ...payload,
          warning:
            "拉到了 0 条。通常是 BANGUMI_TOKEN 失效、或 BANGUMI_USERNAME 写错了。",
        },
        200,
        { "cache-control": "no-store" }
      );
    }
    return json(payload, 200, {
      "cache-control": force ? "no-store" : "public, max-age=300",
    });
  } catch (err) {
    return json(
      {
        error: "拉取 Bangumi 失败",
        detail: err && err.message ? err.message : String(err),
      },
      502,
      { "cache-control": "no-store" }
    );
  }
};

export const config = {
  path: "/api/bangumi",
};
