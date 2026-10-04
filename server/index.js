/**
 * 站点后端 —— 单文件、零依赖，只用 Node 内置模块。
 *
 * 职责：
 *   1. GET  /api/content        读取站点内容（公开）
 *   2. PUT  /api/content        保存站点内容（需登录）
 *   3. POST /api/content/reset  恢复默认内容（需登录）
 *   4. POST /api/login          校验管理密码，签发令牌
 *   5. GET  /api/health         健康检查
 *   6. GET  /robots.txt         SEO：动态生成，随内容里的站点网址变化
 *   7. GET  /sitemap.xml        SEO：动态生成，随内容里的站点网址变化
 *   8. 其余请求 → 托管 dist/ 静态资源（SPA 回退到 index.html）
 *
 * 数据落在 server/data/content.json，写入为「临时文件 + 原子重命名」，
 * 每次保存前自动备份上一版（保留最近 20 份）。
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { buildRobots, buildSitemap, normalizeOrigin, originFromHost } from '../shared/seo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const DIST_DIR = path.join(ROOT, 'dist')
const DATA_DIR = path.join(__dirname, 'data')
const BACKUP_DIR = path.join(DATA_DIR, 'backups')
const CONTENT_FILE = path.join(DATA_DIR, 'content.json')
const CONFIG_FILE = path.join(__dirname, 'config.json')
const DEFAULT_FILE = path.join(ROOT, 'shared', 'content.default.json')

const PORT = Number(process.env.PORT || 8788)
const HOST = process.env.HOST || '0.0.0.0'
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000   // 令牌有效期 7 天
const MAX_BODY = 512 * 1024                     // 请求体上限 512KB
const MAX_BACKUPS = 20
/** history：逐页列出；hash：片段不参与收录，只列根地址 */
const URL_MODE = process.env.SITE_URL_MODE || 'history'

/* ---------- 初始化：配置与内容 ---------- */

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true })
}

function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        return readJson(CONFIG_FILE)
    }
    const config = {
        password: process.env.SITE_ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url'),
        secret: crypto.randomBytes(32).toString('hex'),
        createdAt: new Date().toISOString(),
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8')
    console.log('\n========================================')
    console.log(' 已生成管理密码（保存好，只显示这一次）')
    console.log(' 管理密码: ' + config.password)
    console.log(' 管理入口: http://localhost:' + PORT + '/#/admin')
    console.log(' 想换密码：改 server/config.json 里的 password，或设环境变量 SITE_ADMIN_PASSWORD')
    console.log('========================================\n')
    return config
}

function loadContent() {
    if (!fs.existsSync(CONTENT_FILE)) {
        ensureDir(DATA_DIR)
        fs.copyFileSync(DEFAULT_FILE, CONTENT_FILE)
        console.log('已从 shared/content.default.json 初始化内容文件')
    }
    return readJson(CONTENT_FILE)
}

const config = loadConfig()
let content = loadContent()

/* ---------- 保存：备份 + 原子写入 ---------- */

function backupCurrent() {
    if (!fs.existsSync(CONTENT_FILE)) { return }
    ensureDir(BACKUP_DIR)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    fs.copyFileSync(CONTENT_FILE, path.join(BACKUP_DIR, `content-${stamp}.json`))

    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('content-')).sort()
    while (files.length > MAX_BACKUPS) {
        fs.unlinkSync(path.join(BACKUP_DIR, files.shift()))
    }
}

function saveContent(next) {
    backupCurrent()
    const tmp = CONTENT_FILE + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8')
    fs.renameSync(tmp, CONTENT_FILE)   // 原子替换，避免写一半被读到
    content = next
}

/* ---------- 鉴权：HMAC 签名令牌，无需服务端会话 ---------- */

function sign(payload) {
    return crypto.createHmac('sha256', config.secret).update(payload).digest('base64url')
}

function issueToken() {
    const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString('base64url')
    return `${payload}.${sign(payload)}`
}

function verifyToken(token) {
    if (typeof token !== 'string' || !token.includes('.')) { return false }
    const [payload, mac] = token.split('.')
    const expect = sign(payload)
    if (mac.length !== expect.length) { return false }
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) { return false }
    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
        return typeof data.exp === 'number' && data.exp > Date.now()
    } catch (e) {
        return false
    }
}

function checkPassword(input) {
    const a = Buffer.from(String(input || ''))
    const b = Buffer.from(config.password)
    if (a.length !== b.length) { return false }
    return crypto.timingSafeEqual(a, b)
}

/* ---------- HTTP 工具 ---------- */

function sendJson(res, status, data) {
    const body = JSON.stringify(data)
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Length': Buffer.byteLength(body),
    })
    res.end(body)
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let size = 0
        const chunks = []
        req.on('data', (c) => {
            size += c.length
            if (size > MAX_BODY) {
                reject(new Error('payload too large'))
                req.destroy()
                return
            }
            chunks.push(c)
        })
        req.on('end', () => {
            if (!chunks.length) { resolve({}); return }
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
            } catch (e) {
                reject(new Error('invalid json'))
            }
        })
        req.on('error', reject)
    })
}

function authOk(req) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    return verifyToken(token)
}

/* ---------- 内容校验：结构必须是对象，且不能过深 ---------- */

function validateContent(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return '内容必须是一个 JSON 对象'
    }
    const text = JSON.stringify(data)
    if (text.length > MAX_BODY) {
        return '内容过大'
    }
    for (const key of ['site', 'home', 'honors', 'projects', 'contact']) {
        if (!(key in data)) {
            return `缺少必要分区：${key}`
        }
    }
    return null
}

/* ---------- 静态资源 ---------- */

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
}

function serveStatic(req, res, urlPath) {
    const rel = decodeURIComponent(urlPath).replace(/^\/+/, '')
    let file = path.join(DIST_DIR, rel || 'index.html')

    // 防目录穿越：解析后必须仍在 dist 内
    if (!path.resolve(file).startsWith(path.resolve(DIST_DIR))) {
        res.writeHead(403)
        res.end('forbidden')
        return
    }

    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        if (rel && fs.existsSync(path.join(DIST_DIR, rel + '.html'))) {
            file = path.join(DIST_DIR, rel + '.html')
        } else if (rel === '404.html' && fs.existsSync(path.join(DIST_DIR, '404.html'))) {
            file = path.join(DIST_DIR, '404.html')
        } else {
            // SPA 回退
            file = path.join(DIST_DIR, 'index.html')
        }
    }

    if (!fs.existsSync(file)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('未找到 dist/，请先执行 npm run build')
        return
    }

    const ext = path.extname(file).toLowerCase()
    const immutable = file.includes(`${path.sep}assets${path.sep}`)
    res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    fs.createReadStream(file).pipe(res)
}

/* ---------- 路由 ---------- */

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const p = url.pathname

    try {
        if (p === '/api/health') {
            sendJson(res, 200, { ok: true, time: new Date().toISOString() })
            return
        }

        /* ---------- SEO 文件：随内容实时生成 ---------- */

        if (p === '/robots.txt' || p === '/sitemap.xml') {
            // 优先用内容里配置的站点网址；没配就用请求的 Host（反代下同样正确）
            const forwarded = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
            const encrypted = forwarded ? forwarded === 'https' : !!req.socket.encrypted
            const origin = normalizeOrigin(content.site && content.site.origin)
                || originFromHost(req.headers.host, encrypted)

            if (!origin) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
                res.end('无法确定站点网址，请在管理后台填写 site.origin')
                return
            }

            const body = p === '/robots.txt'
                ? buildRobots(origin)
                : buildSitemap(origin, { mode: URL_MODE })

            res.writeHead(200, {
                'Content-Type': p === '/robots.txt'
                    ? 'text/plain; charset=utf-8'
                    : 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600',
            })
            res.end(body)
            return
        }

        if (p === '/api/content' && req.method === 'GET') {
            sendJson(res, 200, content)
            return
        }

        if (p === '/api/login' && req.method === 'POST') {
            const body = await readBody(req)
            if (!checkPassword(body.password)) {
                sendJson(res, 401, { error: '密码不正确' })
                return
            }
            sendJson(res, 200, { token: issueToken(), expiresIn: TOKEN_TTL_MS })
            return
        }

        if (p === '/api/content' && req.method === 'PUT') {
            if (!authOk(req)) {
                sendJson(res, 401, { error: '未登录或登录已过期' })
                return
            }
            const body = await readBody(req)
            const problem = validateContent(body)
            if (problem) {
                sendJson(res, 400, { error: problem })
                return
            }
            saveContent(body)
            sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() })
            return
        }

        if (p === '/api/content/reset' && req.method === 'POST') {
            if (!authOk(req)) {
                sendJson(res, 401, { error: '未登录或登录已过期' })
                return
            }
            saveContent(readJson(DEFAULT_FILE))
            sendJson(res, 200, { ok: true, content })
            return
        }

        if (p.startsWith('/api/')) {
            sendJson(res, 404, { error: '未知接口' })
            return
        }

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405)
            res.end('method not allowed')
            return
        }

        serveStatic(req, res, p)
    } catch (err) {
        const status = err.message === 'payload too large' ? 413
            : err.message === 'invalid json' ? 400 : 500
        sendJson(res, status, { error: err.message })
    }
})

server.listen(PORT, HOST, () => {
    console.log(`站点后端已启动: http://localhost:${PORT}`)
    console.log(`  内容文件: ${CONTENT_FILE}`)
    console.log(`  静态目录: ${DIST_DIR}`)
})
