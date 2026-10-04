# Andycommander66 个人主页 · Vue 3 单页应用

原静态多页站点（`index.html` / `honors.html` / `contact.html` / `404.html`）重构为 Vue 3 单页应用。
**视觉与文案 100% 保留**，样式由四个页面的内联 `<style>` 自动合并而成，未做任何主观改动。

## 技术栈

| 项 | 版本 |
|---|---|
| Vue | 3.5 |
| Vue Router | 5.3（hash 模式） |
| Vite | 8.3 |
| 图标 / 字体 | 无外部依赖 |

## 目录结构

```
myweb-vue/
├── index.html              单页入口（含开屏判定的前置脚本）
├── vite.config.js
├── public/
│   ├── andy.ico
│   └── 404.html            服务端 404 兜底页（跳回 SPA 的 404 路由）
└── src/
    ├── main.js             应用入口：挂载路由与动效插件
    ├── App.vue             全局骨架：背景层 + 导航 + 带过渡的路由出口
    ├── motion.js           动效插件（v-reveal 指令 / 光斑委托 / 开屏 / 滚动状态）
    ├── router/index.js     路由表、统一标题、滚动行为
    ├── utils/
    │   └── external.js     站外链接参数构造 + 协议白名单校验
    ├── styles/
    │   ├── base.css        四个页面样式的自动合并结果（135 条规则）
    │   ├── motion.css      动效样式（含路由切换过渡）
    │   └── responsive.css  自适应统一层（沿用原文件，仍是最终生效层）
    ├── components/
    │   ├── AppNav.vue      顶部导航（含滚动进度条、404 角标）
    │   ├── AppFooter.vue   页脚（floating / static 两种形态）
    │   ├── BootScreen.vue  开屏动画
    │   ├── LaserCanvas.vue 背景激光线节点网络
    │   ├── StatCounter.vue 数字滚动
    │   └── ToTopButton.vue 回到顶部
    └── views/
        ├── HomeView.vue       首页（Hero）
        ├── ProjectsView.vue   项目（读取 GitHub 公开仓库）
        ├── HonorsView.vue     荣誉经历
        ├── ContactView.vue    联系方式
        ├── LeavingView.vue    站外跳转提示页
        └── NotFoundView.vue   404
```

## 路由与页面标题

| 路由 | 标题 |
|---|---|
| `/` | Andycommander66 · 个人主页 |
| `/projects` | Andycommander66 · 项目 |
| `/honors` | Andycommander66 · 荣誉经历 |
| `/contact` | Andycommander66 · 联系方式 |
| `/leaving?to=…&name=…` | Andycommander66 · 即将离开本站 |
| `/admin` | Andycommander66 · 内容管理 |
| `/404`（及未知路径） | Andycommander66 · 页面未找到 |

标题统一为「`Andycommander66 · 页面名`」——同一个分隔符、同一种顺序，由 `router.afterEach` 自动写入。

### 路由模式

**一个变量同时决定前端路由、robots.txt 与 sitemap.xml**，三处不会各说各话：

| 模式 | 构建命令 | 地址样式 | 收录 |
|---|---|---|---|
| **history（默认）** | `npm run build` | `/honors` | 每页可独立收录，sitemap 逐页列出 |
| hash | `VITE_ROUTER_MODE=hash npm run build` | `/#/honors` | 片段不参与收录，sitemap 只列根地址 |

> history 模式需要服务端把未命中的路径回退到 `index.html`。
> **用 `server/index.js` 时已内置**；纯静态托管需要自己加一条规则（见「部署」）。

## SEO

| 项 | 实现 |
|---|---|
| `robots.txt` | 后端**动态生成**（也能在构建时写入 `dist/`）。允许抓取，屏蔽 `/api/`、`/admin`、`/leaving`，并指向 sitemap |
| `sitemap.xml` | 同上。含 `loc` / `lastmod` / `changefreq` / `priority`，只列可收录的 4 个页面 |
| 站点网址 | 内容里的 `site.origin`（管理后台 → 站点 → 站点网址），当前为 **`https://andycommander66.cn`**。留空时后端会自动使用请求的 Host，所以零配置也能用 |
| `canonical` | 逐页输出，指向 `site.origin + 该页路径`；未配置网址或该页 noindex 时不输出，避免指错域名 |
| `description` | 逐页独立，写在 `router/index.js` 的 `meta.description` |
| `robots` meta | 首页与三个内容页 `index, follow`；`/admin`、`/leaving`、404 为 `noindex, follow` |
| 结构化数据 | 运行时注入 JSON-LD（`Person` + `WebSite`），含姓名、身份、`knowsAbout` 方向与 GitHub 链接 |

> **sitemap 需要真实网址**：后端会从请求 Host 推断，所以线上直接就能用；
> 纯静态部署时请在管理后台填好 `site.origin` 再构建，否则会跳过 sitemap 生成（构建日志会提示）。

## 项目页数据来源

项目页**优先读取 GitHub 公开 API**，所以新建仓库会自动出现，平时不需要维护：

- 接口：`https://api.github.com/users/<用户名>/repos`（无需令牌，允许跨域）
- 请求由**访客浏览器**直接发出，本站服务端不参与、不缓存、不代理
- **只展示自有仓库：fork 与已归档的仓库一律不显示**，列表按最近提交时间排序
- 8 秒超时；读取失败时回退到「置顶项目 + 兜底项目」，页面照常可用

GitHub 用户名、置顶项目与兜底项目都在内容文件里（`/#/admin` → 项目 标签页），
旧版 `src/data/projects.js` 已并入 `shared/content.default.json`。

## 路由切换过渡

`App.vue` 中用 `<Transition name="page" mode="out-in">` 包裹路由出口：旧页向上淡出（0.28s），新页自下淡入（0.46s）。
样式在 `src/styles/motion.css` 第 12 节，`prefers-reduced-motion` 下自动关闭。

> `Transition` 要求组件**单根元素**，所以 `HonorsView` / `ContactView` / `LeavingView` 都用一层 `<div class="view-*">` 包住 `<main>` 与 `<AppFooter>`。

## 滚动揭示（v-reveal）

`v-reveal` 让元素进入视口时淡入上浮。**揭示状态记在 `data-reveal` 属性的值上**（`pending` → `visible`），
而不是 class：

```css
.js [data-reveal="pending"] { opacity: 0; transform: translate3d(0, 18px, 0); }
```

> **为什么不用 class**：指令若用 `classList.add('is-visible')` 标记，一旦该元素同时绑定了 Vue 的动态
> `:class`，Vue 改写 `className` 时会把指令加的 class 一并抹掉，元素会突然变回隐藏
> （曾导致管理页改完一处、整个区块连同输入框一起消失）。`data-*` 属性只要模板里不绑定，Vue 就永远不碰它。

## 站外跳转提示页

所有指向站外的链接都不直接跳转，先进入 `/leaving`：

- 展示目标站点名称、域名与完整地址
- 「继续访问」是真实外链（`target="_blank"` + `rel="noopener noreferrer nofollow"`）
- 「返回上一页」优先 `history.back()`，无历史时回首页
- **协议白名单校验**：仅允许 `http` / `https`；`javascript:` 等伪协议会显示「已阻止跳转」

新增站外链接时用 `externalTo(url, name)` 生成跳转参数：

```js
import { externalTo } from '../utils/external'
const labLink = externalTo('https://example.com/', '示例站点')
// <RouterLink :to="labLink">…</RouterLink>
```

> 已接入：导航「实验室」、首页 CTA「实验室官网」、联系页「实验室官网」。
> **页脚备案号刻意保留直链**——它是工信部的合规查询入口，再加一层中转没有必要。

## 命令

```bash
npm install         # 或 pnpm install

npm run dev         # 只跑前端（Vite，5173）；要改内容请另开终端跑 dev:server
npm run dev:server  # 只跑后端（8788）

npm run build       # 产出 dist/
npm run start       # 跑后端：同时提供 API 与 dist/ 静态资源（8788）
npm run deploy      # build + start 一步到位
```

> 本机 pnpm 路径（如未装 Node）：
> `C:\Users\Andy\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe`
> `C:\Users\Andy\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs`

## 内容后端

**单文件、零依赖**（只用 Node 内置模块），把内容从代码里解放出来 —— 改荣誉 / 经历 / 项目不用碰代码，也不用重新构建。

```
server/
├── index.js          后端全部逻辑（HTTP 服务 + API + 静态托管）
├── config.json       首次启动自动生成（管理密码 + 令牌密钥）
└── data/
    ├── content.json  站点内容（运行时生成；改内容本质就是改这个文件）
    └── backups/      每次保存前的自动备份，保留最近 20 份
shared/
└── content.default.json   默认内容：后端首次启动时用它初始化，前端也用它兜底
```

### 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/content` | 读取站点内容（公开） |
| PUT | `/api/content` | 保存内容（需 `Authorization: Bearer <token>`） |
| POST | `/api/content/reset` | 恢复默认内容（需登录） |
| POST | `/api/login` | 校验密码并签发令牌（有效期 7 天） |
| GET | `/api/health` | 健康检查 |

其余请求交给 `dist/` 静态托管，未命中的路径回退到 `index.html`。

### 管理入口

浏览器打开 **`/admin`**，输入管理密码即可编辑。界面按「先找得到、再改得动」组织：

| 设计 | 解决什么 |
|---|---|
| **常驻操作条**（sticky） | 改到页面底部也能直接保存，不用滚回顶部 |
| **底部保存条**（有改动时出现） | 长列表翻到底立刻就手 |
| **分组标签页带区块数** | 一眼看出每类内容有多少块（站点 1 / 首页 7 / 荣誉经历 12 / 项目 3 / 联系 4） |
| **区块索引** | 当前分组的所有区块可点击跳转，已改动的高亮并带 `•` |
| **「已修改」标记** | 区块标题旁显示徽章、边框高亮，知道改了哪几处 |
| **筛选框** | 列表 ≥ 6 条时出现，在条目里就地搜索 |
| **折叠** | 点击区块标题可收起，长表单不再一股脑铺开 |
| **保存前预览** | 点「预览效果」带着未保存的改动跳到前台实际浏览；顶部常驻预览浮条，可随时保存 / 返回编辑 / 退出 |
| **Ctrl / Cmd + S** | 键盘直接保存 |
| **离开拦截** | 有未保存改动时，切换路由或关闭页面会先确认 |
| **记住分组** | 从预览返回时回到原来的标签页 |

### 预览是怎么做的

草稿（`state.draft`）与改动标记都放在 `src/stores/content.js` 里，**不放在管理页组件内**，
这样点预览跳到前台浏览时草稿不会因为组件卸载而丢失。

「预览效果」做的事只有一步：把草稿临时换到正式内容上（`startPreview()`），**完全不碰后端**。
退出预览或返回编辑时还原（`stopPreview()`），草稿原样保留。

```
编辑 → 预览（草稿上前台，后端不变）→ 前台浏览 → 返回编辑 → 保存（此时才写后端）
```

首次启动时后端会在控制台打印初始密码，并写入 `server/config.json`。
忘记密码就改该文件的 `password` 字段后重启。

### 可选环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | `8788` | 监听端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `SITE_ADMIN_PASSWORD` | 随机生成 | 指定管理密码（仅在首次生成 config.json 时生效） |

### 内容安全兜底

| 风险 | 处理 |
|---|---|
| 写入中断导致文件损坏 | 先写临时文件，再原子重命名 |
| 改错了想回滚 | 每次保存前自动备份，保留最近 20 份 |
| 令牌泄露 | 令牌有效期 7 天；改 `config.json` 的 `secret` 可让全部令牌立即失效 |
| 暴力破解密码 | 密码比对使用恒定时间比较；建议把 `config.json` 设为仅本人可读 |
| 恶意写入超大内容 | 请求体上限 512KB，并校验必需分区 |
| 目录穿越 | 静态资源路径解析后强制校验是否仍在 `dist/` 内 |

## 部署

### A. 带后端（推荐，可在网页上改内容）

```bash
npm run deploy        # 等价于 vite build && node server/index.js
```

上传 **`dist/` + `server/` + `shared/`** 三个目录，用 `node server/index.js` 常驻。
建议用 pm2 守护：`pm2 start server/index.js --name site`。

### B. 纯静态（不要后端）

**只上传 `dist/` 即可，服务端不需要任何额外配置。**

前端读不到 `/api/content` 时会**自动回退到内置默认内容**，整站功能与样式完全正常，
只是没有在线编辑能力。

> 换句话说：**后端挂了或根本没部署，站点照样能访问**，不会白屏。

### 关于路由

路由用的是 **hash 模式**（`https://域名/#/honors`），所有路径都指向同一个 `index.html`，
所以不存在"刷新子页面 404"的问题——这正是很多前端路由站点踩过的坑。

`public/404.html` 是给"路径级 404"兜底的：当访客访问一个不存在的真实路径时，
若服务器配置了自定义 404 页，它会把访客带回 SPA 的 404 路由。

> 带后端部署时，`server/index.js` 自己就会把未命中的路径回退到 `index.html`，
> 不需要再配 nginx 规则。

### 想换成 history 模式（去掉 `#`）

1. 改 `src/router/index.js`：

   ```js
   import { createWebHistory, createRouter } from 'vue-router'
   // createWebHashHistory()  →  createWebHistory()
   ```

2. 若用 nginx 托管静态资源，加一条回退规则：

   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

   **不加这条规则，子页面刷新就会 404。**（用 `server/index.js` 则无需配置）

## 与原静态版的差异

| 项 | 变化 |
|---|---|
| 页面加载 | 由 4 次整页刷新变为 1 次加载 + 前端路由切换，导航栏、背景 Canvas 不再重建 |
| 开屏动画 | 只在打开站点时播放一次；站内切换页面不再重复播放 |
| TailwindCSS CDN | **已移除**。核对过全站未使用任何 Tailwind 工具类，去掉后少一个外部请求与阻塞脚本 |
| 外部请求 | 除点击外链与项目页读取 GitHub 外，站点**不产生任何第三方请求** |
| 样式 | 四页重复的内联样式合并为一份 `base.css`（原 4 份 → 1 份） |
| **内容维护** | 由"改代码 + 重新构建"升级为**网页上在线编辑**，见 `/#/admin` |

## 内容维护位置

**首选方式：打开 `/#/admin` 在线编辑**，内容存在 `server/data/content.json`。
下面的表格是"改代码"时的对照，两者改的是同一份内容模型。

| 想改什么 | 对应内容路径 |
|---|---|
| 站点名 / 备案号 / 版权行 / 实验室链接 | `site` |
| 首页身份标签、数据、进度条、两个按钮 | `home` |
| 荣誉条目、青马工程、校级称号与竞赛 | `honors.features` / `honors.qingma` / `honors.schoolTitles` / `honors.schoolContests` |
| 任职与经历 | `honors.timeline` |
| 方向与能力 | `honors.skills` |
| GitHub 用户名、置顶项目、兜底项目 | `projects` |
| 联系渠道 / 交流方向 / 隐私声明 | `contact` |
| 默认内容（兜底用） | `shared/content.default.json` |
| 管理界面可编辑字段 | `src/admin/schema.js`（加一行就多一个输入框） |
| 导航项 | `src/components/AppNav.vue` |
| 全站配色与设计变量 | `src/styles/base.css` 顶部 `:root` |
| 响应式断点 | `src/styles/responsive.css`（**最终生效层**，改尺寸优先改这里） |
