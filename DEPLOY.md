# 上线部署指南

> 这份文档假设你**没有 AI 帮忙**，一个人也能把站推上 GitHub 并部署到 Netlify。
> 全程只需要点几下鼠标 + 复制粘贴几条命令。

---

## 0. 前置检查

在项目目录（`C:\Users\Lain\Documents\DSH Exp\my-blog`）打开终端，确认三件事：

```powershell
git --version                 # 应有版本号
node -v                       # 应有 v22 或更高
npm run build                 # 应输出 "Complete!" 且不报错
```

如果 `git` 提示找不到命令，**新开一个终端**再试（PATH 需要重载）。

---

## 1. 把 SSH 公钥加到 GitHub

**为什么必须走 SSH**：本机对 `github.com` 的 HTTPS 是间歇性阻断的，而 SSH 通道实测始终稳定。

### 1.1 你的公钥

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGES5g/lzxH3J7M99VjpHp8/Q4y6t9chwh5jNEwBsW6A 68316974+lalaoink@users.noreply.github.com
```

（随时可以用 `Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"` 重新打印出来）

### 1.2 粘贴到 GitHub

1. 打开 https://github.com/settings/ssh/new
2. **Title**：随便填，例如 `我的电脑`
3. **Key type**：保持 `Authentication Key`
4. **Key**：把上面那一整行原样粘进去（从 `ssh-ed25519` 到行尾，一个字符都不能少）
5. 点击 **Add SSH key**

### 1.3 验证

```powershell
ssh -T git@github.com
```

看到 `Hi lalaoink! You've successfully authenticated...` 就成功了。

| 如果看到 | 说明 | 怎么办 |
| --- | --- | --- |
| `Hi lalaoink!` | ✅ 成功 | 继续下一步 |
| `Permission denied (publickey)` | 公钥没贴上，或贴错了 | 回 1.2 重贴，注意整行完整 |
| `Host key verification failed` | SSH 还不认识 github.com | 先跑一次 `ssh -T git@github.com`，问 `yes/no` 时输 `yes` |

---

## 2. 在 GitHub 上建一个空仓库

1. 打开 https://github.com/new
2. **Repository name**：填 `my-blog`（或任何你喜欢的名字）
3. **Description**：可填「言与叶之庭 —— 个人博客」
4. **Public / Private**：随意。想让人看到就选 Public
5. ⚠️ **不要**勾选 `Add a README file`、`.gitignore`、`license` —— 保持**完全空仓库**
   （勾了会导致推送时冲突，得多一步合并操作）
6. 点击 **Create repository**

创建后会看到一个空仓库页面，先把页面留着，下一步要用到里面的地址。

---

## 3. 推送代码

在项目目录执行（把 `my-blog` 换成你刚才起的仓库名）：

```powershell
git remote add origin git@github.com:lalaoink/my-blog.git
git branch -M main
git push -u origin main
```

**逐条解释：**

| 命令 | 作用 |
| --- | --- |
| `git remote add origin ...` | 告诉本地仓库「远端在哪」。`origin` 只是这个地址的别名 |
| `git branch -M main` | 把当前分支强制命名为 `main`（和 GitHub 默认一致） |
| `git push -u origin main` | 推送，`-u` 记住这个对应关系，以后直接 `git push` 即可 |

推送成功后会显示 `branch 'main' set up to track 'origin/main'` 之类的信息。

### 以后日常怎么用

```powershell
git add -A                              # 把改动加入暂存区
git commit -m "写一句这次改了什么"        # 存一个档
git push                                # 推到 GitHub
```

> 想撤回某次改动：`git checkout -- 文件名`
> 想看自己改了什么：`git diff`

---

## 4. 部署到 Netlify

仓库里已经有 `netlify.toml`，Netlify 会自动读取它，**不需要你配置任何构建参数**。

1. 打开 https://app.netlify.com/ 并登录（可以用 GitHub 账号直接登录）
2. 点击 **Add new site** → **Import an existing project**
3. 选择 **GitHub**，授权后选中刚才建的 `my-blog` 仓库
4. 构建设置**保持默认**即可（`netlify.toml` 里已经写好了 `npm run build` 和 `dist`）
5. 点击 **Deploy**

等一两分钟，你会拿到一个形如 `https://xxxx-yyyy-1234.netlify.app` 的网址。

### 4.1 拿到域名后要做一件事

`astro.config.mjs` 里的 `site` 目前是占位值，它决定 RSS 和 sitemap 里的绝对链接。改成你的真实域名：

```js
const SITE = process.env.SITE_URL ?? "https://你拿到的域名.netlify.app";
```

改完 `git add -A && git commit -m "配置正式域名" && git push`，Netlify 会自动重新部署。

> 或者更省事：在 Netlify 的 **Site configuration → Environment variables** 里加一个
> `SITE_URL = https://你的域名`，不用改代码。

### 4.2 以后怎么更新

**推送到 GitHub 就会自动重新部署**，不需要再进 Netlify 点任何东西。

写一篇新文章 → `git add -A && git commit -m "新文章" && git push` → 等一分钟 → 上线。

### 4.3 追番页的「更新列表」按钮（要配一个环境变量）

追番页上那个按钮背后是一个 Netlify 函数（`netlify/functions/bangumi.mjs`）。

**为什么不能直接在浏览器里拉 Bangumi：**
你的 Bangumi 收藏是**私密**的，不带令牌去请求，API 会返回 0 条（而不是报错）；
而且国内网络本身也访问不到 `api.bgm.tv`。所以必须让 Netlify 的服务器
带着令牌去拉 —— 它在境外，直连 Bangumi，也不用挂代理。

**配置步骤（只做一次）：**

1. Netlify 后台 → **Site configuration → Environment variables**
2. 添加变量：
   - Key：`BANGUMI_TOKEN`
   - Value：你的 Bangumi 访问令牌（就是给 GitHub Actions 用的那串）
3. 可选：`BANGUMI_USERNAME`，默认 `765864`，一般不用加
4. **Deploys → Trigger deploy → Deploy site** 重新部署一次
   （环境变量对已经在跑的部署不生效，必须重新部署）

配好后打开 `/bangumi`，点「更新列表」，状态栏会显示「✓ 已同步，共 N 条」。

**如果状态栏报「服务器没有配置 BANGUMI_TOKEN」** → 第 2 步没做，或没重新部署。
**如果报「拉到了 0 条」** → 令牌失效了，去 Bangumi 设置里重新生成。

> 静态首屏用的仍是构建时的 `src/data/bangumi.json`（由 `scripts/fetch-bangumi.mjs`
> 生成，GitHub Actions 每天跑一次）。函数只在点按钮时才被调用，不写盘、不提交 git。

---

## 5. 部署后自查清单

打开你的网址，逐项确认：

- [ ] 首页显示站名、简介、最近文章列表
- [ ] 导航条的 5 个入口都能点通
- [ ] 点进一篇文章，目录、代码高亮正常
- [ ] 右下角艾雅法拉在动；点她会说话；按住能拖；放着不管会坐下、睡觉
- [ ] 访问一个不存在的地址（如 `/asdfgh`），看到 404 页面
- [ ] `/rss.xml` 能打开，里面是 XML
- [ ] `/sitemap-index.xml` 能打开
- [ ] 手机上打开，布局不乱、桌宠缩小且不挡正文

---

## 6. 常见问题

**推不上去，提示 `Permission denied (publickey)`**
→ 公钥没生效。回第 1 步。

**推不上去，卡很久然后超时**
→ SSH 通道也被干扰了。试试改用 443 端口，在 `C:\Users\Lain\.ssh\config` 里写：

```
Host github.com
  Hostname ssh.github.com
  Port 443
  User git
```

**Netlify 构建失败**
→ 看构建日志。最常见是 `npm run build` 在你本地就失败（先在本地跑一遍）。

**追番页是空的**
→ 那是正常的，你的 Bangumi 账号目前没有公开收藏。去 bgm.tv 标几部，然后：

```powershell
$env:HTTPS_PROXY="http://127.0.0.1:7897"
$env:NODE_USE_ENV_PROXY="1"
npm run bangumi
git add -A; git commit -m "更新追番"; git push
```

（配好 GitHub Actions 后，这件事会每天自动做一次，见 `.github/workflows/bangumi.yml`）

---

## 7. 这个站的技术要点（备忘）

| | |
| --- | --- |
| 框架 | Astro v7，纯静态输出 |
| 文章 | `src/content/blog/*.md`，frontmatter 由 `src/content.config.ts` 校验 |
| 样式 | `src/styles/global.css`，设计令牌照搬参考站 |
| 桌宠 | `src/components/DesktopPet.astro`，Spine 模型在 `public/pet-eyja/` |
| 一言 | `src/components/Hitokoto.astro`，客户端调 `v1.hitokoto.cn` |
| 追番 | `scripts/fetch-bangumi.mjs` → `src/data/bangumi.json` |
| 构建 | `npm run build` → `dist/` |
| 自检 | `npm run check`（构建后跑，检查站内死链） |
