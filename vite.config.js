/**
 * 构建配置。
 *
 * 两个要点：
 *   · VITE_ROUTER_MODE 同时决定前端路由、robots.txt 与 sitemap.xml 的形态，
 *     三处共用一个判断，不会各说各话
 *   · 构建时把 robots.txt / sitemap.xml 写进 dist/，供纯静态部署使用
 *     （用 server/index.js 时由后端实时生成，会覆盖这两个静态文件）
 */

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRobots, buildSitemap, normalizeOrigin } from './shared/seo.js'

const ROOT = path.dirname(fileURLToPath(import.meta.url))

/**
 * 路由模式：history（默认，地址干净、利于收录）| hash（静态托管零配置）
 * 用法：VITE_ROUTER_MODE=hash npm run build
 * 前端路由、robots.txt、sitemap.xml 三处都由这一个变量决定，不会互相错位。
 */
const URL_MODE = process.env.VITE_ROUTER_MODE === 'hash' ? 'hash' : 'history'

/** 构建时把 robots.txt / sitemap.xml 写进 dist/，供纯静态部署使用 */
function seoFilesPlugin() {
    return {
        name: 'seo-files',
        apply: 'build',
        closeBundle() {
            const outDir = path.join(ROOT, 'dist')
            if (!fs.existsSync(outDir)) { return }

            // 优先采用后端正在运行的内容，其次默认内容
            const live = path.join(ROOT, 'server', 'data', 'content.json')
            const fallback = path.join(ROOT, 'shared', 'content.default.json')
            const source = fs.existsSync(live) ? live : fallback

            let content = {}
            try {
                content = JSON.parse(fs.readFileSync(source, 'utf8'))
            } catch (e) {
                console.log(`  ! 读取内容失败，跳过 SEO 文件生成：${e.message}`)
                return
            }

            const origin = normalizeOrigin(content.site && content.site.origin)

            fs.writeFileSync(path.join(outDir, 'robots.txt'), buildRobots(origin), 'utf8')

            // public/ 下的文件是原样拷贝的，不会走 define，这里手动替换路由模式占位符
            const notFound = path.join(outDir, '404.html')
            if (fs.existsSync(notFound)) {
                fs.writeFileSync(notFound,
                    fs.readFileSync(notFound, 'utf8').replace(/__URL_MODE__/g, URL_MODE), 'utf8')
            }

            if (origin) {
                fs.writeFileSync(path.join(outDir, 'sitemap.xml'),
                    buildSitemap(origin, { mode: URL_MODE }), 'utf8')
                console.log(`  ✓ robots.txt 与 sitemap.xml 已生成（${origin} · ${URL_MODE} 模式）`)
            } else {
                console.log('  ✓ robots.txt 已生成')
                console.log('  ! 未设置 site.origin，跳过 sitemap.xml')
                console.log('    设置方式：管理后台 → 站点 → 站点网址，或改内容文件后重新构建')
            }
        },
    }
}

export default defineConfig({
    // 相对基址：构建产物放在任意子目录、甚至直接用 file:// 打开都能跑
    base: './',
    plugins: [vue(), seoFilesPlugin()],
    define: {
        // 前端路由与 SEO 文件共用同一个模式判断
        __URL_MODE__: JSON.stringify(URL_MODE),
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
    server: {
        // 开发时把 /api 代理到后端，前后端同源，无需处理跨域
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8788',
                changeOrigin: true,
            },
        },
    },
})
