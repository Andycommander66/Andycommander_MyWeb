/**
 * 站点内容仓库。
 *
 * 页面先用内置默认内容渲染（首屏零等待），随后尝试从 /api/content 拉取后端内容。
 * 后端不可用时保持默认内容 —— 也就是说，纯静态托管依然能正常访问整个站点。
 *
 * 管理端还有一份「草稿」：编辑只改草稿，点保存才提交；
 * 预览模式会把草稿临时换上，让管理员在不保存的情况下浏览真实效果。
 */
import { reactive } from 'vue'
import defaults from '../../shared/content.default.json'

const API = {
    content: '/api/content',
    login: '/api/login',
    reset: '/api/content/reset',
}

const TOKEN_KEY = 'ac66-admin-token'

const clone = (value) => JSON.parse(JSON.stringify(value))

/** 深合并：后端内容缺字段时回落到默认值，避免改结构后页面报错 */
function merge(base, patch) {
    if (Array.isArray(patch)) { return patch }
    if (patch && typeof patch === 'object') {
        const out = Object.assign({}, base)
        for (const key of Object.keys(patch)) {
            out[key] = merge(base ? base[key] : undefined, patch[key])
        }
        return out
    }
    return patch === undefined ? base : patch
}

export const state = reactive({
    data: merge({}, defaults),
    /** 管理端的编辑草稿（普通访问者用不到） */
    draft: merge({}, defaults),
    /** 草稿是否有未保存改动 */
    dirty: false,
    /** 是否正在预览草稿 */
    previewing: false,
    /** 预览前的正式内容，用于退出预览时还原 */
    source0: null,
    source: 'default',   // default | server
    loading: true,
    error: '',
    saving: false,
    ready: false,
    /** 内容版本号：每次整体替换 +1，供外部做廉价的变更侦听 */
    version: 0,
})

/** 原地替换目标对象的内容，保持引用不变（组件已持有该引用） */
function fill(target, next) {
    const merged = merge(defaults, next)
    for (const key of Object.keys(target)) {
        delete target[key]
    }
    Object.assign(target, merged)
}

/**
 * 替换正式内容。
 * 必须先深拷贝：merge() 对数组是按引用返回的，若直接填入，
 * state.data 与 state.draft 会共享同一个数组——改草稿就等于改了线上内容，
 * 改动标记也会因为两边相同而永远不出现。
 */
function replaceData(next) {
    fill(state.data, clone(next))
    state.version += 1
}

/** 替换草稿（同样先深拷贝，与正式内容彻底隔离） */
export function replaceDraft(next) {
    fill(state.draft, clone(next))
    state.dirty = false
}

/** 把草稿重置为当前正式内容 */
export function resetDraft() {
    replaceDraft(state.data)
}

/** 标记草稿已改动 */
export function markDirty() {
    state.dirty = true
}

export function token() {
    try { return localStorage.getItem(TOKEN_KEY) || '' } catch (e) { return '' }
}

export function setToken(value) {
    try {
        if (value) { localStorage.setItem(TOKEN_KEY, value) } else { localStorage.removeItem(TOKEN_KEY) }
    } catch (e) { /* 隐私模式下忽略 */ }
}

export function isLoggedIn() {
    return !!token()
}

/* ---------- 预览 ---------- */

/**
 * 进入预览：把草稿临时换到正式内容上，全站立刻呈现改动后的效果。
 * 不写后端，随时可退出。
 */
export function startPreview() {
    if (state.previewing) { return }
    state.source0 = clone(state.data)
    replaceData(state.draft)
    state.previewing = true
}

/** 退出预览：还原进入前的正式内容，草稿原样保留 */
export function stopPreview() {
    if (!state.previewing) { return }
    if (state.source0) { replaceData(state.source0) }
    state.source0 = null
    state.previewing = false
}

/* ---------- 网络 ---------- */

/** 拉取后端内容；失败时静默保留默认内容 */
export async function loadContent() {
    try {
        const res = await fetch(API.content, { cache: 'no-store' })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const data = await res.json()
        replaceData(data)
        state.source = 'server'
        state.error = ''
    } catch (e) {
        state.source = 'default'
        state.error = '未能连接后端，当前展示的是内置默认内容'
    } finally {
        // 草稿跟随正式内容初始化；管理员已有未保存改动时不覆盖
        if (!state.dirty && !state.previewing) { replaceDraft(state.data) }
        state.loading = false
        state.ready = true
    }
}

export async function login(password) {
    const res = await fetch(API.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { throw new Error(data.error || '登录失败') }
    setToken(data.token)
    return true
}

export function logout() {
    stopPreview()
    setToken('')
}

/** 保存草稿（或指定内容）到后端 */
export async function saveContent(next) {
    const payload = next || clone(state.draft)
    state.saving = true
    try {
        const res = await fetch(API.content, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token(),
            },
            body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (res.status === 401) {
            setToken('')
            throw new Error('登录已过期，请重新登录')
        }
        if (!res.ok) { throw new Error(data.error || '保存失败') }

        // 保存成功：草稿成为正式内容，预览状态一并收掉
        state.source0 = null
        state.previewing = false
        replaceData(payload)
        replaceDraft(payload)
        state.source = 'server'
        return data
    } finally {
        state.saving = false
    }
}

export async function resetContent() {
    const res = await fetch(API.reset, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token() },
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) {
        setToken('')
        throw new Error('登录已过期，请重新登录')
    }
    if (!res.ok) { throw new Error(data.error || '重置失败') }

    state.source0 = null
    state.previewing = false
    replaceData(data.content)
    replaceDraft(data.content)
    return data
}

/** 组件里取内容：const c = useContent(); c.home.tags */
export function useContent() {
    return state.data
}
