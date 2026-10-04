/**
 * robots.txt 与 sitemap.xml 的生成逻辑。
 *
 * 后端（运行时）与构建脚本（构建期）共用这一份实现，保证两边产出一致。
 */

/** 需要被搜索引擎收录的页面。管理与中转页刻意不在其中。 */
export const PUBLIC_ROUTES = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/projects', priority: '0.9', changefreq: 'weekly' },
    { path: '/honors', priority: '0.9', changefreq: 'monthly' },
    { path: '/contact', priority: '0.7', changefreq: 'monthly' },
]

/**
 * 站点地址规范化：补协议、去尾斜杠。
 * 返回空串表示未配置（此时后端会退回用请求的 Host）。
 */
export function normalizeOrigin(origin) {
    const raw = String(origin || '').trim()
    if (!raw) { return '' }
    const withScheme = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw
    try {
        const url = new URL(withScheme)
        return `${url.protocol}//${url.host}`
    } catch (e) {
        return ''
    }
}

/**
 * 从请求头推断站点地址（后端未配置 site.origin 时的兜底）。
 * 只接受合法主机名，避免 Host 头注入到 robots/sitemap 里。
 */
export function originFromHost(host, encrypted = false) {
    const value = String(host || '').trim()
    if (!/^[a-z0-9.-]+(:\d+)?$/i.test(value)) { return '' }
    return (encrypted ? 'https://' : 'http://') + value
}

export function buildRobots(origin) {
    const lines = [
        'User-agent: *',
        'Allow: /',
        '',
        '# 接口不参与收录',
        'Disallow: /api/',
        '',
        '# 管理后台：页面本身也带 noindex，双保险',
        'Disallow: /admin',
        '',
        '# 站外跳转提示页没有独立内容，不需要收录',
        'Disallow: /leaving',
        '',
    ]

    if (origin) {
        lines.push(`Sitemap: ${origin}/sitemap.xml`, '')
    } else {
        lines.push('# 未配置 site.origin，暂不输出 Sitemap 行', '')
    }

    return lines.join('\n')
}

/**
 * 生成 sitemap.xml。
 *
 * mode 说明：
 *   history —— 每个页面是独立地址，逐条列出
 *   hash    —— 片段（#/xxx）不会被搜索引擎当作独立页面，只列出站点根地址
 */
export function buildSitemap(origin, options = {}) {
    const { mode = 'hash', lastmod = new Date().toISOString().slice(0, 10) } = options
    const base = normalizeOrigin(origin) || String(origin || '').replace(/\/+$/, '')

    const entries = mode === 'history'
        ? PUBLIC_ROUTES
        : [{ path: '/', priority: '1.0', changefreq: 'weekly' }]

    const urls = entries.map((route) => [
        '    <url>',
        `        <loc>${escapeXml(base + route.path)}</loc>`,
        `        <lastmod>${lastmod}</lastmod>`,
        `        <changefreq>${route.changefreq}</changefreq>`,
        `        <priority>${route.priority}</priority>`,
        '    </url>',
    ].join('\n'))

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
        '',
    ].join('\n')
}

function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

/** 生成结构化数据（Person + WebSite），由前端注入到 <head> */
export function buildJsonLd(content, origin) {
    const site = content.site || {}
    const home = content.home || {}
    const projects = content.projects || {}
    const base = normalizeOrigin(origin)

    const person = {
        '@type': 'Person',
        name: site.name || 'Andycommander66',
        url: base ? base + '/' : undefined,
        description: home.subtitle || undefined,
        jobTitle: home.role || undefined,
        knowsAbout: (content.honors && content.honors.skills || []).map((s) => s.text).filter(Boolean),
        sameAs: [projects.githubUrl].filter(Boolean),
    }

    Object.keys(person).forEach((k) => { if (person[k] === undefined) { delete person[k] } })

    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            person,
            {
                '@type': 'WebSite',
                name: site.name || 'Andycommander66',
                url: base ? base + '/' : undefined,
                inLanguage: 'zh-CN',
            },
        ],
    }

    if (!base) {
        delete graph['@graph'][0].url
        delete graph['@graph'][1].url
    }

    return JSON.stringify(graph, null, 2)
}
