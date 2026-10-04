# Andycommander66 个人主页

Vue 3 单页应用 + 零依赖内容后端。全站文案与数据都能在网页后台直接编辑，统计数字自动计算。

**线上地址**：<https://andycommander66.cn>

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Vue 3 · Vue Router（history 模式）· Vite |
| 后端 | Node 内置模块，**零依赖**，单文件 |
| 存储 | 单个 JSON 文件，原子写入 + 自动备份 |
| 全部依赖 | `vue` · `vue-router` · `vite` · `@vitejs/plugin-vue` |

## 快速开始

```bash
npm install

npm run dev         # 前端开发服务（5173）
npm run dev:server  # 内容后端（8788），另开一个终端
npm run deploy      # 构建并启动（生产）
```

## 目录结构

```
├── shared/                   前后端共用
│   ├── content.default.json    内容默认值（含全站文案）
│   └── seo.js                  robots / sitemap 生成逻辑
├── server/index.js           后端：API + 静态托管 + SEO 文件
├── src/
│   ├── views/                首页 / 项目 / 荣誉 / 联系 / 管理 / 404
│   ├── components/           导航、页脚、进度条、数字滚动、预览浮条等
│   ├── stores/content.js     内容仓库（含草稿与预览状态）
│   ├── utils/stats.js        统计口径都在这里
│   ├── admin/schema.js       管理界面字段声明
│   └── styles/               base · motion · responsive（依次生效）
└── public/                   404 兜底页、图标
```

## 内容管理

打开 **`/admin`**，输入管理密码即可编辑全站内容。首次启动后端会在控制台打印初始密码。

- 分组标签 + 区块索引，列表可筛选、区块可折叠
- **改动标记**：标出改了哪几处
- **保存前预览**：带着未保存的改动跳前台实际浏览，确认后再保存
- 每次保存前自动备份到 `server/data/backups/`，保留最近 20 份

也可以直接改文件：`shared/content.default.json` 是默认值，`server/data/content.json` 是线上内容。

## 数据自动统计

页面上的数字全部由条目算出 —— 加一条荣誉，统计与分组说明自动跟随。

| 指标 | 口径 |
|---|---|
| 奖项与荣誉总数 | 重点荣誉 + 青马工程 + 校级称号 + 校级竞赛 |
| 市级及以上 | 等级文字命中 国家级 / 省级 / 跨省 / 区域级 / 市级 |
| 现任职务与身份 | 时间线里含「至今」的条目 |
| 学年进度 | 由入学年份与学制推算，**每年 9 月自动进位** |

用法：数据指标项里选一个「统计指标」即自动计算，留空则手填数值；文案支持 `{school}`、`{highLevel}` 这类占位符。新增指标只需在 `utils/stats.js` 与 `admin/schema.js` 各加一行。

> 排查内容来源：检查元素看 `<html data-content-source="server|default|preview">`。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/content` | 读取内容（公开） |
| PUT | `/api/content` | 保存内容（需令牌） |
| POST | `/api/login` | 登录换取令牌（7 天有效） |
| POST | `/api/content/reset` | 恢复默认内容 |
| GET | `/api/health` | 健康检查 |

`robots.txt` 与 `sitemap.xml` 由后端按当前内容实时生成；未配置站点网址时自动使用请求的 Host。

## 部署

**A. 带后端**（可在网页改内容）

```bash
npm run deploy
```

上传 `dist/` + `server/` + `shared/`，用 `node server/index.js` 常驻，建议 pm2 守护。

**B. 纯静态**

只上传 `dist/`。前端读不到后端时会自动回退到内置默认内容，整站功能与样式正常，只是不能在线编辑。

> history 模式要求服务端把未命中的路径回退到 `index.html`。
> 用 `server/index.js` 已内置；纯静态托管需自行配置，nginx 示例：
> `try_files $uri $uri/ /index.html;`

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | `8788` | 监听端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `SITE_ADMIN_PASSWORD` | 随机生成 | 首次生成 `server/config.json` 时指定管理密码 |

> 管理密码存在 `server/config.json`，内容与备份在 `server/data/` —— 这三处已在 `.gitignore` 中排除。
