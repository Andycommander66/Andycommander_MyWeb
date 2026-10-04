/**
 * 读取 GitHub 公开仓库。
 *
 * 由访客浏览器直接请求 GitHub 公开 API，本站服务端不参与、也不缓存，
 * 所以访客的 IP 不会经过我们的服务器。
 *
 * 只返回自有仓库：fork 与已归档的一律排除。
 * 8 秒超时；失败时由调用方回退到手工清单，页面不会因此报错。
 */

const TIMEOUT_MS = 8000

/**
 * 读取指定用户的 GitHub 公开仓库（无需令牌）。
 * 由访客浏览器直接请求，本站服务端不参与、也不缓存任何数据。
 * 只返回自有仓库：fork 与已归档的一律排除。
 */
export async function fetchRepos(user) {
    if (!user) { throw new Error('缺少 GitHub 用户名') }

    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
    const api = `https://api.github.com/users/${encodeURIComponent(user)}/repos?sort=pushed&direction=desc&per_page=100`

    try {
        const res = await fetch(api, {
            headers: { Accept: 'application/vnd.github+json' },
            signal: controller.signal,
        })
        if (!res.ok) {
            throw new Error('HTTP ' + res.status)
        }
        const list = await res.json()
        if (!Array.isArray(list)) {
            throw new Error('unexpected payload')
        }

        return list
            .filter((repo) => !repo.fork && !repo.archived)
            .map((repo) => ({
                name: repo.name,
                desc: repo.description || '',
                lang: repo.language || '',
                stars: repo.stargazers_count || 0,
                updated: (repo.pushed_at || repo.updated_at || '').slice(0, 10),
                url: repo.html_url,
                tags: Array.isArray(repo.topics) ? repo.topics.slice(0, 4) : [],
            }))
    } finally {
        window.clearTimeout(timer)
    }
}
