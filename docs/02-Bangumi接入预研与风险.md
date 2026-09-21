# 阶段 5 预研 · Bangumi 追番列表接入与风险

> 提前做这份预研的原因：我在阶段 0 勘察时撞到一个**会决定整体架构**的网络问题。
> 结论写在最前面，省得你到时候白折腾。

---

## 一、关键风险（已实测）

| 测试 | 结果 |
| --- | --- |
| `api.bgm.tv` DNS 解析（本机 DNS `10.10.0.21`） | 返回 `202.160.130.66` ← **污染 IP** |
| `api.bgm.tv` DNS 解析（阿里 DoH，真实值） | `128.242.240.59` |
| `bgm.tv` DNS 解析（本机） | 返回 `108.160.166.253` ← **污染 IP** |
| `bgm.tv` DNS 解析（阿里 DoH，真实值） | `128.242.240.157` |
| TCP 443 连 `api.bgm.tv`（走过本机 DNS） | ❌ 超时 21s |
| TCP 443 连 `api.bgm.tv`（`curl --resolve` 强制用真实 IP） | ❌ 超时 20s |
| TCP 443 连 `github.com` | ✅ 通 |
| TCP 443 连 `wordland.site` | ✅ 通 |

**结论：这台机器在本机网络下完全无法访问 bgm.tv（DNS 被污染 + 真实 IP 也不可达）。**

这不是代码问题，改 `User-Agent`、换 HTTP 库都没用。所以：

> **❌ 不要设计成"本地 `npm run dev` 时实时拉取 Bangumi"。** 会 100% 失败。

---

## 二、推荐架构（这是这份预研的核心结论）

**把拉取动作移到 GitHub Actions，产出 JSON 提交进仓库，Astro 只读本地 JSON。**

```
GitHub Actions（定时，如每天一次）
        │  能访问 api.bgm.tv（境外网络）
        ▼
   拉取 → 清洗 → 写入 src/data/bangumi.json
        │  git commit 回仓库
        ▼
Astro 构建（本地 或 Netlify）只读这个 JSON
        ▼
      静态页面
```

**为什么这样最好：**

1. **本地也能构建** —— 你离线、被墙、在校园网里都能 `npm run dev` 看到完整页面。
2. **不暴露 Token** —— JSON 里只有番剧信息，Token 存在 GitHub Secrets 里。
3. **构建快且稳** —— 不会因为 Bangumi 抽风导致你整个站点构建失败。
4. **顺手学到 CI/CD** —— 这正好是阶段 6 要讲的东西，一举两得。

**唯一代价**：数据有延迟（最多一天）。对追番列表来说完全无所谓。

---

## 三、API 事实（来自官方 OpenAPI 规范，已核对）

**端点**

```
GET https://api.bgm.tv/v0/users/{username}/collections
      ?subject_type=2     # 条目类型
      &type=3             # 收藏类型
      &limit=50           # ⚠️ 最大 50，默认 30
      &offset=0
```

**`subject_type`（条目类型）**

| 值 | 含义 |
| --- | --- |
| 1 | 书籍 |
| 2 | **动画** ← 追番用这个 |
| 3 | 音乐 |
| 4 | 游戏 |
| 6 | 三次元 |

（没有 `5`）

**`type`（收藏类型）**

| 值 | 含义 |
| --- | --- |
| 1 | 想看 |
| 2 | 看过 |
| 3 | **在看** |
| 4 | 搁置 |
| 5 | 抛弃 |

**⚠️ 三个必须记住的坑**

1. **`limit` 上限是 50。** 追番数超过 50 条就必须循环翻页（`offset += 50`），不能一次拉完。
2. **公开收藏不需要 Token。** 官方描述：「查看私有收藏需要 access token」。所以如果你的收藏是公开的，**整个流程可以零密钥**，那是最省事的方案。只在收藏设为私密时才需要申请 Token。
3. **官方 spec 里 `UserSubjectCollection` 这个 schema 是悬空引用**（`$ref` 指向了不存在于 `v0.yaml` 的定义）。所以响应体里 `data[i]` 的**确切字段名要以实际请求结果为准**，别照抄文档猜。
   我预期会用到 `subject_id` / `type` / `rate` / `ep_status` / `updated_at` / `subject`(嵌套的条目信息，含 `name`、`name_cn`、`images`、`eps`)，但**必须在能联网的环境里跑一次确认**。

**响应外形**

```jsonc
{
  "total": 123,      // 总条数
  "limit": 50,
  "offset": 0,
  "data": [ /* UserSubjectCollection[] */ ]
}
```

---

## 四、待办

- [ ] 拿到 Bangumi 用户名 / UID，填进配置
- [ ] 确认收藏是否公开 → 决定要不要申请 Token
- [ ] 在**能联网的环境**里（GitHub Actions 或让朋友帮忙）跑一次真实请求，把响应存下来当样本
- [ ] 根据真实响应确定字段名，写清洗脚本
- [ ] 写 `.github/workflows/bangumi.yml`
- [ ] 前端做卡片墙：封面 / 中文名 / 进度 / 评分 / 我的评分
