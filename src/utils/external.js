/**
 * 站外链接工具。
 *
 * 所有指向站外的链接都不直接跳转，而是先进入 /leaving 提示页，
 * 由 externalTo() 生成跳转参数；真正的协议校验在 LeavingView 中进行。
 */

export function externalTo(url, name) {
    return {
        path: '/leaving',
        query: { to: url, name },
    }
}

/** 只允许 http / https，避免 javascript: 之类的伪协议被塞进链接 */
export function isSafeExternal(url) {
    if (typeof url !== 'string' || !url) { return false }
    try {
        const parsed = new URL(url)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch (e) {
        return false
    }
}
