<script setup>
/**
 * 内容管理页。
 *
 * 结构：常驻操作条 → 分组标签 + 区块索引 → 各区块表单。
 *
 * 三个关键设计：
 *   1. 草稿放在 stores/content.js，不放在本组件里 —— 点「预览」会跳到前台浏览，
 *      组件卸载后草稿必须还在
 *   2. 改动标记按区块比对草稿与正式内容，标出改了哪几处
 *   3. 长列表提供筛选框，列表项用原始索引写回，筛选后路径不会错位
 */

import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import FieldRow from '../components/admin/FieldRow.vue'
import {
    useContent, isLoggedIn, login, logout, resetContent, saveContent, state,
    markDirty, resetDraft as resetStoreDraft, startPreview, stopPreview,
} from '../stores/content'
import { blocks, groups, getByPath, setByPath } from '../admin/schema'

const router = useRouter()
const content = useContent()

const logged = ref(isLoggedIn())
const password = ref('')
const busy = ref(false)
const message = ref('')
const messageType = ref('ok')
/** 记住上次编辑的分组，从预览返回时不会跳回默认标签 */
const activeGroup = ref(readTab())

function readTab() {
    try {
        return sessionStorage.getItem('ac66-admin-tab') || 'honors'
    } catch (e) {
        return 'honors'
    }
}

watch(activeGroup, (value) => {
    try { sessionStorage.setItem('ac66-admin-tab', value) } catch (e) { /* 隐私模式下忽略 */ }
})

/** 折叠状态与筛选词，按区块路径索引 */
const collapsed = reactive({})
const filters = reactive({})

/**
 * 草稿与改动标记都放在 store 里：
 * 这样点「预览」跳到前台浏览时，草稿不会因为组件卸载而丢失。
 */
const draft = computed(() => state.draft)
const dirty = computed(() => state.dirty)

/** 本次离开管理页是为了进预览，路由守卫放行 */
let previewNav = false

function resetDraft() {
    resetStoreDraft()
    for (const key of Object.keys(collapsed)) { delete collapsed[key] }
    for (const key of Object.keys(filters)) { delete filters[key] }
}

onMounted(() => {
    // 从预览返回编辑：先退出预览，否则草稿与正式内容相同，会被误判为"没有改动"
    stopPreview()
    if (!state.dirty) { resetDraft() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('beforeunload', onBeforeUnload)
})

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('beforeunload', onBeforeUnload)
})

/** 离开页面前拦一下未保存的修改 */
onBeforeRouteLeave(() => {
    if (previewNav) { previewNav = false; return true }
    if (!dirty.value) { return true }
    return window.confirm('有未保存的修改，确定离开吗？')
})

function onBeforeUnload(e) {
    if (!dirty.value) { return }
    e.preventDefault()
    e.returnValue = ''
}

/** Ctrl / Cmd + S 保存 */
function onKey(e) {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') { return }
    e.preventDefault()
    if (dirty.value && !busy.value) { doSave() }
}

function setMessage(text, type) {
    message.value = text
    messageType.value = type
}

function touch() {
    markDirty()
    message.value = ''
}

/* ---------- 导航：分组、区块索引、各区块改动标记 ---------- */

const currentBlocks = computed(() => blocks.filter((b) => b.group === activeGroup.value))

/** 每个区块是否被改动过（按 JSON 比对，够准也够快） */
const dirtyPaths = computed(() => {
    const set = new Set()
    if (!draft.value) { return set }
    for (const b of blocks) {
        if (JSON.stringify(getByPath(draft.value, b.path)) !== JSON.stringify(getByPath(state.data, b.path))) {
            set.add(b.path)
        }
    }
    return set
})

const changedCount = computed(() => dirtyPaths.value.size)

/** 分组上的区块数，一眼看出内容规模 */
const groupCounts = computed(() => {
    const out = {}
    for (const g of groups) {
        out[g.key] = blocks.filter((b) => b.group === g.key).length
    }
    return out
})

function jumpTo(path) {
    const el = document.getElementById(blockId(path))
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
}

function blockId(path) {
    return 'block-' + path.replace(/\./g, '-')
}

/* ---------- 登录 ---------- */

async function doLogin() {
    busy.value = true
    message.value = ''
    try {
        await login(password.value)
        logged.value = true
        password.value = ''
        resetDraft()
        setMessage('登录成功', 'ok')
    } catch (e) {
        setMessage(e.message, 'error')
    } finally {
        busy.value = false
    }
}

function doLogout() {
    if (dirty.value && !window.confirm('有未保存的修改，确定退出吗？')) { return }
    logout()
    logged.value = false
    resetDraft()
    setMessage('已退出登录', 'ok')
}

/* ---------- 预览 / 保存 / 重置 ---------- */

/**
 * 保存前预览：把草稿临时换上，跳到前台实际浏览效果（不写后端）。
 * 顶部会常驻一根预览浮条，可随时保存、返回编辑或退出。
 */
function doPreview() {
    if (!dirty.value) { return }
    previewNav = true
    startPreview()
    router.push('/')
}

async function doSave() {
    busy.value = true
    try {
        await saveContent()
        setMessage('已保存，访问者刷新后即可看到', 'ok')
    } catch (e) {
        setMessage(e.message, 'error')
    } finally {
        busy.value = false
    }
}

async function doReset() {
    if (!window.confirm('确定要恢复为内置默认内容吗？当前内容已被备份，可在 server/data/backups 找回。')) { return }
    busy.value = true
    try {
        await resetContent()
        resetDraft()
        setMessage('已恢复默认内容', 'ok')
    } catch (e) {
        setMessage(e.message, 'error')
    } finally {
        busy.value = false
    }
}

function doRevert() {
    resetDraft()
    setMessage('已放弃未保存的修改', 'ok')
}

/* ---------- 列表操作 ---------- */

function listOf(path) {
    const value = getByPath(draft.value, path)
    return Array.isArray(value) ? value : []
}

/** 带原始索引的行，保证筛选后写入的路径依然正确 */
function visibleRows(block) {
    const rows = listOf(block.path).map((item, index) => ({ item, index }))
    const q = String(filters[block.path] || '').trim().toLowerCase()
    if (!q) { return rows }
    return rows.filter(({ item }) => JSON.stringify(item).toLowerCase().includes(q))
}

function addItem(block, index) {
    const list = listOf(block.path)
    const at = (index === undefined || index < 0) ? list.length : index + 1
    list.splice(at, 0, blankItem(block))
    touch()
}

function removeItem(block, index) {
    listOf(block.path).splice(index, 1)
    touch()
}

function moveItem(block, index, delta) {
    const list = listOf(block.path)
    const target = index + delta
    if (target < 0 || target >= list.length) { return }
    const [item] = list.splice(index, 1)
    list.splice(target, 0, item)
    touch()
}

function blankItem(block) {
    if (block.type === 'strings') { return '' }
    const item = {}
    for (const f of block.fields || []) {
        item[f.k] = f.t === 'number' ? 0 : ''
    }
    return item
}

/* ---------- 字段读写 ---------- */

function fieldPath(block, index, key) {
    return block.type === 'strings' ? `${block.path}.${index}` : `${block.path}.${index}.${key}`
}

function read(path) {
    const v = getByPath(draft.value, path)
    return v === undefined || v === null ? '' : v
}

function write(path, value) {
    setByPath(draft.value, path, value)
    touch()
}

const flatBlocks = (list) => list.filter((b) => b.type === 'object' && b.flat)
const stringBlocks = (list) => list.filter((b) => b.type === 'string')
const objectBlocks = (list) => list.filter((b) => b.type === 'object' && !b.flat)
const arrayBlocks = (list) => list.filter((b) => b.type === 'list' || b.type === 'strings')

/** 下拉框选项：schema 里可以直接给数组，也可以给函数（便于复用同一份列表） */
function fieldOptions(field) {
    const src = field && field.options
    if (typeof src === 'function') { return src() }
    return Array.isArray(src) ? src : []
}
</script>

<template>
    <div class="view-admin">
        <main class="page-wrap">

            <!-- ============ 未登录 ============ -->
            <header v-if="!logged" class="glass-card spotlight" data-enter>
                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                    <span class="status-tag"><span class="tag-dot"></span> 管理后台</span>
                    <span class="status-tag" style="--tag-bg:rgba(160,40,55,0.22);--tag-border:rgba(200,80,95,0.35);--tag-text:#f0b0b6;">
                        <span class="tag-dot"></span> 需要密码
                    </span>
                </div>

                <h1 class="page-title">内容管理</h1>
                <p class="page-subtitle">
                    登录后可以修改荣誉、经历、项目与联系方式等全部内容。<br>
                    保存后写入服务端 JSON 文件，访问者刷新即可看到。
                </p>

                <div class="admin-form" style="max-width:380px;">
                    <FieldRow v-model="password" label="管理密码" type="text" />
                    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px;">
                        <button type="button" class="hero-cta" :disabled="busy" @click="doLogin">
                            {{ busy ? '登录中…' : '登录' }}
                        </button>
                        <RouterLink to="/" class="hero-cta is-ghost">返回站点</RouterLink>
                    </div>
                </div>

                <p v-if="message" class="admin-msg" :class="messageType">{{ message }}</p>

                <div class="point-list" style="margin-top:6px;">
                    <p class="point">首次启动时，后端会在控制台打印初始密码，并写入 <code>server/config.json</code>。</p>
                    <p class="point">忘记密码：改 <code>server/config.json</code> 的 password 字段后重启后端。</p>
                </div>
            </header>

            <!-- ============ 已登录 ============ -->
            <template v-else>
                <!-- 常驻操作条：滚到任何位置都能保存 -->
                <header class="glass-card spotlight admin-bar" data-enter>
                    <div class="admin-bar-main">
                        <div class="admin-bar-title">
                            <h1 class="page-title admin-bar-h1">内容管理</h1>
                            <div class="admin-bar-tags">
                                <span class="status-tag" :style="state.source === 'server'
                                    ? '--tag-bg:rgba(140,35,48,0.2);--tag-border:rgba(190,70,85,0.32);--tag-text:#f0a8b0;'
                                    : '--tag-bg:rgba(120,60,60,0.25);--tag-border:rgba(180,110,110,0.4);--tag-text:#e0b0b0;'">
                                    <span class="tag-dot"></span>
                                    {{ state.source === 'server' ? '已连接后端' : '离线（默认内容）' }}
                                </span>
                                <span class="status-tag" :style="dirty
                                    ? '--tag-bg:rgba(160,40,55,0.22);--tag-border:rgba(200,80,95,0.35);--tag-text:#f0b0b6;'
                                    : '--tag-bg:rgba(140,35,48,0.2);--tag-border:rgba(190,70,85,0.32);--tag-text:#f0a8b0;'">
                                    <span class="tag-dot"></span>
                                    {{ dirty ? `有未保存修改 · ${changedCount} 处` : '已同步' }}
                                </span>
                            </div>
                        </div>

                        <div class="admin-bar-actions">
                            <button type="button" class="hero-cta is-ghost" :disabled="busy || !dirty"
                                title="在不保存的情况下到前台看实际效果" @click="doPreview">
                                预览效果
                            </button>
                            <button type="button" class="hero-cta" :disabled="busy || !dirty"
                                title="快捷键 Ctrl / Cmd + S" @click="doSave">
                                {{ busy ? '保存中…' : '保存修改' }}
                            </button>
                            <button type="button" class="hero-cta is-ghost" :disabled="busy || !dirty"
                                @click="doRevert">放弃修改</button>
                            <button type="button" class="hero-cta is-ghost" :disabled="busy"
                                @click="doReset">恢复默认</button>
                            <button type="button" class="hero-cta is-ghost" :disabled="busy"
                                @click="doLogout">退出登录</button>
                            <RouterLink to="/" class="hero-cta is-ghost">查看站点</RouterLink>
                        </div>
                    </div>

                    <p v-if="message" class="admin-msg" :class="messageType">{{ message }}</p>
                </header>

                <!-- 导航：分组 + 区块索引 -->
                <nav class="glass-card spotlight admin-nav" v-reveal>
                    <div class="admin-tabs" role="tablist">
                        <button v-for="g in groups" :key="g.key" type="button" class="admin-tab" role="tab"
                            :class="{ 'is-active': activeGroup === g.key }" :aria-selected="activeGroup === g.key"
                            @click="activeGroup = g.key">
                            {{ g.label }}
                            <span class="admin-tab-count">{{ groupCounts[g.key] }}</span>
                        </button>
                    </div>

                    <div class="admin-index">
                        <span class="admin-index-label">本页区块</span>
                        <button v-for="b in currentBlocks" :key="b.path" type="button" class="admin-chip"
                            :class="{ 'is-changed': dirtyPaths.has(b.path) }" @click="jumpTo(b.path)">
                            {{ b.label }}
                            <span v-if="dirtyPaths.has(b.path)" class="admin-chip-dot" title="已修改">•</span>
                        </button>
                    </div>
                </nav>

                <!-- 单字段字符串 -->
                <section v-for="b in stringBlocks(currentBlocks)" :id="blockId(b.path)" :key="b.path"
                    class="glass-card spotlight admin-block" :class="{ 'is-changed': dirtyPaths.has(b.path) }" v-reveal>
                    <div class="admin-block-head">
                        <h2 class="section-title">{{ b.label }}</h2>
                        <span v-if="dirtyPaths.has(b.path)" class="admin-badge">已修改</span>
                    </div>
                    <div class="admin-form">
                        <FieldRow :label="b.field.l" :type="b.field.t || 'text'" :model-value="read(b.path)"
                            @update:model-value="write(b.path, $event)" />
                    </div>
                </section>

                <!-- 对象字段 -->
                <section v-for="b in objectBlocks(currentBlocks)" :id="blockId(b.path)" :key="b.path"
                    class="glass-card spotlight admin-block" :class="{ 'is-changed': dirtyPaths.has(b.path) }" v-reveal>
                    <div class="admin-block-head">
                        <h2 class="section-title">{{ b.label }}</h2>
                        <span v-if="dirtyPaths.has(b.path)" class="admin-badge">已修改</span>
                    </div>
                    <div class="admin-form admin-grid">
                        <FieldRow v-for="f in b.fields" :key="f.k" :label="f.l" :type="f.t || 'text'"
                            :options="fieldOptions(f)" :model-value="read(b.path + '.' + f.k)"
                            @update:model-value="write(b.path + '.' + f.k, $event)" />
                    </div>
                </section>

                <!-- 列表 -->
                <section v-for="b in arrayBlocks(currentBlocks)" :id="blockId(b.path)" :key="b.path"
                    class="glass-card spotlight admin-block" :class="{ 'is-changed': dirtyPaths.has(b.path) }" v-reveal>
                    <div class="admin-block-head">
                        <button type="button" class="admin-fold" :aria-expanded="!collapsed[b.path]"
                            @click="collapsed[b.path] = !collapsed[b.path]">
                            <span class="admin-fold-icon">{{ collapsed[b.path] ? '▸' : '▾' }}</span>
                            <span class="section-title">{{ b.label }}</span>
                        </button>
                        <div class="admin-block-meta">
                            <span v-if="dirtyPaths.has(b.path)" class="admin-badge">已修改</span>
                            <span class="section-note">共 {{ listOf(b.path).length }} 条</span>
                        </div>
                    </div>

                    <template v-if="!collapsed[b.path]">
                        <!-- 长列表给个筛选框 -->
                        <div v-if="listOf(b.path).length >= 6" class="admin-filter">
                            <input v-model="filters[b.path]" class="af-input" type="search"
                                :placeholder="`在 ${listOf(b.path).length} 条中筛选…`">
                            <button type="button" class="admin-add" @click="addItem(b)">＋ 新增一条</button>
                        </div>

                        <div class="admin-list">
                            <article v-for="row in visibleRows(b)" :key="row.index" class="admin-item">
                                <div class="admin-item-head">
                                    <span class="admin-item-no">#{{ row.index + 1 }}</span>
                                    <div class="admin-item-actions">
                                        <button type="button" title="上移" :disabled="row.index === 0"
                                            @click="moveItem(b, row.index, -1)">↑</button>
                                        <button type="button" title="下移"
                                            :disabled="row.index === listOf(b.path).length - 1"
                                            @click="moveItem(b, row.index, 1)">↓</button>
                                        <button type="button" title="在下方插入" @click="addItem(b, row.index)">＋</button>
                                        <button type="button" class="danger" title="删除"
                                            @click="removeItem(b, row.index)">✕</button>
                                    </div>
                                </div>

                                <div v-if="b.type === 'strings'" class="admin-form">
                                    <FieldRow :label="'第 ' + (row.index + 1) + ' 条'" type="textarea"
                                        :model-value="read(fieldPath(b, row.index))"
                                        @update:model-value="write(fieldPath(b, row.index), $event)" />
                                </div>
                                <div v-else class="admin-form admin-grid">
                                    <FieldRow v-for="f in b.fields" :key="f.k" :label="f.l" :type="f.t || 'text'"
                                        :options="fieldOptions(f)"
                                        :model-value="read(fieldPath(b, row.index, f.k))"
                                        @update:model-value="write(fieldPath(b, row.index, f.k), $event)" />
                                </div>
                            </article>

                            <p v-if="!visibleRows(b).length" class="section-note" style="margin:0;">
                                {{ listOf(b.path).length ? '没有匹配的条目。' : '还没有条目，点下面的按钮添加。' }}
                            </p>

                            <button v-if="listOf(b.path).length < 6" type="button" class="admin-add"
                                @click="addItem(b, listOf(b.path).length - 1)">
                                ＋ 新增一条
                            </button>
                        </div>
                    </template>
                </section>

                <!-- 零散文案：合并成一张卡放在最后 -->
                <section v-if="flatBlocks(currentBlocks).length" class="glass-card spotlight admin-block" v-reveal>
                    <div class="admin-block-head">
                        <h2 class="section-title">其他文案</h2>
                        <span class="section-note">分组标题、说明文字等</span>
                    </div>
                    <div class="admin-form admin-grid">
                        <FieldRow v-for="b in flatBlocks(currentBlocks)" :key="b.path" :label="b.label"
                            :type="b.fields[0].t || 'text'" :model-value="read(b.path)"
                            @update:model-value="write(b.path, $event)" />
                    </div>
                </section>

                <!-- 底部再放一次保存：长列表翻到底就不用滚回去 -->
                <div v-if="dirty" class="admin-footbar">
                    <span class="admin-footbar-text">{{ `有 ${changedCount} 处修改未保存` }}</span>
                    <button type="button" class="hero-cta is-ghost" :disabled="busy" @click="doPreview">预览效果</button>
                    <button type="button" class="hero-cta" :disabled="busy" @click="doSave">
                        {{ busy ? '保存中…' : '保存修改' }}
                    </button>
                    <button type="button" class="hero-cta is-ghost" :disabled="busy" @click="doRevert">放弃修改</button>
                </div>
            </template>
        </main>
    </div>
</template>

<style scoped>
.view-admin {
    position: relative;
    z-index: 10;
}

/* ---------- 常驻操作条 ---------- */
.admin-bar {
    position: sticky;
    top: 72px;
    z-index: 30;
    padding: 16px 20px;
}

.admin-bar-h1 {
    font-size: 1.5rem;
    margin: 0;
}

.admin-bar-main {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 18px;
    align-items: center;
    justify-content: space-between;
}

.admin-bar-title {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
}

.admin-bar-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.admin-bar-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.admin-bar-actions .hero-cta {
    padding: 9px 16px;
    font-size: 0.8rem;
}

/* ---------- 导航区 ---------- */
.admin-nav {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px 20px;
}

.admin-tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.admin-tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 14px;
    border-radius: 20px;
    border: 1px solid rgba(255, 220, 220, 0.10);
    background: rgba(18, 6, 10, 0.4);
    color: var(--text-secondary, #c5b8bb);
    font-family: inherit;
    font-size: 0.82rem;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.4s ease;
}

.admin-tab:hover {
    border-color: rgba(220, 110, 120, 0.35);
    color: var(--text-primary, #f5f0f1);
}

.admin-tab.is-active {
    border-color: rgba(230, 120, 130, 0.55);
    background: rgba(200, 55, 70, 0.20);
    color: #fff5f5;
}

.admin-tab-count {
    font-size: 0.68rem;
    padding: 1px 6px;
    border-radius: 9px;
    background: rgba(255, 220, 225, 0.10);
    color: #d8c6c9;
    font-variant-numeric: tabular-nums;
}

.admin-tab.is-active .admin-tab-count {
    background: rgba(255, 220, 225, 0.18);
    color: #fff0f2;
}

.admin-index {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 220, 220, 0.06);
}

.admin-index-label {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    color: var(--text-muted, #9a8a8e);
}

.admin-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 11px;
    border-radius: 14px;
    border: 1px dashed rgba(255, 210, 215, 0.16);
    background: transparent;
    color: var(--text-secondary, #c5b8bb);
    font-family: inherit;
    font-size: 0.74rem;
    cursor: pointer;
    transition: all 0.35s ease;
}

.admin-chip:hover {
    border-color: rgba(230, 120, 130, 0.45);
    color: #f0a0a8;
}

.admin-chip.is-changed {
    border-style: solid;
    border-color: rgba(230, 120, 130, 0.4);
    color: #f0b0b8;
}

.admin-chip-dot {
    color: #f0a0a8;
    line-height: 1;
}

/* ---------- 区块 ---------- */
.admin-block {
    scroll-margin-top: 160px;
    transition: border-color 0.5s ease, box-shadow 0.5s ease;
}

.admin-block.is-changed {
    border-color: rgba(230, 120, 130, 0.28);
    box-shadow: 0 0 0 1px rgba(230, 120, 130, 0.08), 0 14px 40px rgba(120, 20, 30, 0.18);
}

.admin-block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
}

.admin-block-head .section-title {
    margin: 0;
}

.admin-block-meta {
    display: flex;
    align-items: center;
    gap: 10px;
}

.admin-fold {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
}

.admin-fold-icon {
    font-size: 0.7rem;
    color: var(--text-muted, #9a8a8e);
}

.admin-badge {
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    padding: 2px 9px;
    border-radius: 10px;
    background: rgba(200, 55, 70, 0.22);
    border: 1px solid rgba(230, 120, 130, 0.35);
    color: #f0b0b8;
}

.admin-filter {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 12px;
}

.admin-filter .af-input {
    flex: 1 1 220px;
    padding: 8px 12px;
    border-radius: 9px;
    border: 1px solid rgba(255, 220, 220, 0.10);
    background: rgba(18, 6, 10, 0.55);
    color: var(--text-primary, #f5f0f1);
    font-family: inherit;
    font-size: 0.8rem;
}

.admin-filter .af-input:focus {
    outline: none;
    border-color: rgba(230, 120, 130, 0.55);
}

/* ---------- 表单 ---------- */
.admin-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.admin-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
    gap: 10px;
}

.admin-msg {
    margin: 10px 0 0;
    font-size: 0.78rem;
    letter-spacing: 0.04em;
}

.admin-msg.ok {
    color: #f0a0a8;
}

.admin-msg.error {
    color: #ff9a9a;
}

/* ---------- 列表 ---------- */
.admin-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.admin-item {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255, 220, 220, 0.07);
    background: rgba(18, 6, 10, 0.32);
}

.admin-item-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.admin-item-no {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    color: var(--text-muted, #9a8a8e);
    font-variant-numeric: tabular-nums;
}

.admin-item-actions {
    display: flex;
    gap: 6px;
}

.admin-item-actions button {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    border: 1px solid rgba(255, 220, 220, 0.10);
    background: rgba(18, 6, 10, 0.5);
    color: var(--text-secondary, #c5b8bb);
    font-size: 0.78rem;
    line-height: 1;
    cursor: pointer;
    transition: all 0.3s ease;
}

.admin-item-actions button:hover:not(:disabled) {
    border-color: rgba(230, 120, 130, 0.5);
    color: #fff5f5;
}

.admin-item-actions button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.admin-item-actions button.danger:hover {
    border-color: rgba(255, 120, 120, 0.6);
    color: #ffb0b0;
}

.admin-add {
    align-self: flex-start;
    padding: 8px 18px;
    border-radius: 20px;
    border: 1px dashed rgba(255, 210, 215, 0.20);
    background: transparent;
    color: var(--text-muted, #9a8a8e);
    font-family: inherit;
    font-size: 0.78rem;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.4s ease;
}

.admin-add:hover {
    border-color: rgba(230, 120, 130, 0.5);
    color: #f0a0a8;
}

/* ---------- 底部操作条 ---------- */
.admin-footbar {
    position: sticky;
    bottom: 16px;
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 12px 18px;
    border-radius: 16px;
    border: 1px solid rgba(230, 120, 130, 0.25);
    background: rgba(24, 8, 12, 0.9);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: 0 16px 40px rgba(60, 10, 16, 0.5);
}

.admin-footbar-text {
    font-size: 0.78rem;
    color: #f0b0b8;
    letter-spacing: 0.04em;
}

.admin-footbar .hero-cta {
    padding: 8px 16px;
    font-size: 0.78rem;
}

/* ---------- 按钮形态 ---------- */
button.hero-cta {
    font-family: inherit;
}

.hero-cta.is-ghost {
    background: transparent;
    border-color: rgba(255, 210, 215, 0.1);
}

.hero-cta:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .admin-bar {
        top: 60px;
        padding: 14px 16px;
    }

    .admin-bar-h1 {
        font-size: 1.25rem;
    }

    .admin-bar-actions .hero-cta {
        padding: 8px 13px;
        font-size: 0.76rem;
    }

    .admin-block {
        scroll-margin-top: 130px;
    }
}
</style>
