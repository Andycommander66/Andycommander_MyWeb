/**
 * 运行时写入与内容相关的 SEO 标签。
 *
 *   · canonical / og:url —— 逐页规范地址
 *   · description        —— 逐页描述
 *   · robots             —— 管理页、中转页、404 不收录
 *   · JSON-LD            —— Person + WebSite 结构化数据
 *
 * 放在运行时而不是构建期，是为了让站点网址与内容改动立刻生效，
 * 不必为了改一行简介重新构建。
 */

import { buildJsonLd, normalizeOrigin } from '../../shared/seo'

/**
 * 把与内容相关的 SEO 标签写进 <head>：
 *   - canonical（规范地址）
 *   - description（逐页描述）
 *   - robots（管理页、中转页、404 不收录）
 *   - JSON-LD 结构化数据（Person + WebSite）
 *
 * 这些标签依赖站点内容与站点网址，所以放在运行时生成，改内容后立刻生效。
 */

const LD_ID = 'ac66-jsonld'

function upsertMeta(selector, attrs) {
    let el = document.head.querySelector(selector)
    if (!el) {
        el = document.createElement('meta')
        document.head.appendChild(el)
    }
    for (const key of Object.keys(attrs)) {
        el.setAttribute(key, attrs[key])
    }
}

function removeIfPresent(selector) {
    const el = document.head.querySelector(selector)
    if (el) { el.remove() }
}

export function applySeo(content, route) {
    const site = content.site || {}
    const origin = normalizeOrigin(site.origin)
    const meta = route.meta || {}

    /* ---------- 逐页描述 ---------- */
    if (meta.description) {
        upsertMeta('meta[name="description"]', { name: 'description', content: meta.description })
        upsertMeta('meta[property="og:description"]', { property: 'og:description', content: meta.description })
    }

    /* ---------- 是否允许收录 ---------- */
    if (meta.noindex) {
        upsertMeta('meta[name="robots"]', { name: 'robots', content: 'noindex, follow' })
    } else {
        upsertMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow' })
    }

    /* ---------- 规范地址 ---------- */
    // 没有配置站点网址时不输出 canonical，避免指错域名
    if (origin && !meta.noindex) {
        const path = meta.canonical || route.path
        let link = document.head.querySelector('link[rel="canonical"]')
        if (!link) {
            link = document.createElement('link')
            link.setAttribute('rel', 'canonical')
            document.head.appendChild(link)
        }
        link.setAttribute('href', origin + path)

        upsertMeta('meta[property="og:url"]', { property: 'og:url', content: origin + path })
        upsertMeta('meta[property="og:title"]', { property: 'og:title', content: document.title })
    } else {
        removeIfPresent('link[rel="canonical"]')
        removeIfPresent('meta[property="og:url"]')
    }

    /* ---------- 结构化数据 ---------- */
    removeIfPresent('#' + LD_ID)
    if (!meta.noindex) {
        const script = document.createElement('script')
        script.type = 'application/ld+json'
        script.id = LD_ID
        script.textContent = buildJsonLd(content, origin)
        document.head.appendChild(script)
    }
}
