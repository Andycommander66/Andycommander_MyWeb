/* ==========================================================================
   motion.js — 动效层（Vue 插件）
   1. v-reveal 指令（滚动揭示，支持同级自动错峰）
   2. 卡片光斑（全局事件委托，路由切换无需重新绑定）
   3. 开屏时机控制
   4. 滚动进度 / 回到顶部状态
   ========================================================================== */
import { ref } from 'vue'

/* ---------- 全局状态 ---------- */
export const bootVisible = ref(false)
export const bootLeaving = ref(false)
export const scrollRatio = ref(0)
export const scrollable = ref(false)
export const showToTop = ref(false)

const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- 1. 滚动揭示 ---------- */
let io = null

function ensureObserver() {
    if (io || reduceMotion || typeof IntersectionObserver === 'undefined') { return io }
    io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                reveal(entry.target)
                io.unobserve(entry.target)
            }
        })
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 })
    return io
}

/**
 * 标记为已揭示。
 * 刻意用 data-* 属性而不是 classList.add：
 * 元素若同时绑定了 Vue 的动态 :class，Vue 改写 className 时会把外部加的 class 抹掉，
 * 元素就会突然变回隐藏（曾导致管理页改完一处、整个区块消失）。
 */
function reveal(el) {
    el.setAttribute('data-reveal', 'visible')
}

const revealDirective = {
    mounted(el, binding) {
        el.setAttribute('data-reveal', 'pending')

        if (binding.value != null) {
            el.style.setProperty('--reveal-delay', binding.value + 'ms')
        } else {
            // 同级自动错峰，最多 5 级
            const parent = el.parentElement
            if (parent) {
                const sibs = Array.prototype.filter.call(parent.children, (c) => c.hasAttribute('data-reveal'))
                const idx = sibs.indexOf(el)
                if (idx > 0) { el.style.setProperty('--reveal-delay', Math.min(idx, 5) * 70 + 'ms') }
            }
        }

        const observer = ensureObserver()
        if (!observer) {
            reveal(el)
            return
        }
        observer.observe(el)
    },
    unmounted(el) {
        if (io) { io.unobserve(el) }
    },
}

/* ---------- 2. 卡片光斑（鼠标 + 手指） ---------- */
function placeSpotlight(card, x, y) {
    const r = card.getBoundingClientRect()
    if (!r.width || !r.height) { return }
    card.style.setProperty('--mx', ((x - r.left) / r.width * 100).toFixed(2) + '%')
    card.style.setProperty('--my', ((y - r.top) / r.height * 100).toFixed(2) + '%')
}

function findCard(target) {
    return target && target.closest ? target.closest('.spotlight') : null
}

function onMouseMove(e) {
    const card = findCard(e.target)
    if (card) { placeSpotlight(card, e.clientX, e.clientY) }
}

function onTouchMove(e) {
    const touch = e.touches && e.touches[0]
    if (!touch) { return }
    const card = findCard(e.target)
    if (!card) { return }
    card.classList.add('is-touching')
    placeSpotlight(card, touch.clientX, touch.clientY)
}

function onTouchEnd() {
    document.querySelectorAll('.spotlight.is-touching').forEach((el) => el.classList.remove('is-touching'))
}

/* ---------- 3 & 4. 滚动状态 ---------- */
let ticking = false

function updateScroll() {
    ticking = false
    const doc = document.documentElement
    const max = doc.scrollHeight - window.innerHeight
    const y = window.pageYOffset || doc.scrollTop || 0

    if (max > 40) {
        scrollable.value = true
        scrollRatio.value = Math.min(y / max, 1)
        showToTop.value = y > 480
    } else {
        scrollable.value = false
        scrollRatio.value = 0
        showToTop.value = false
    }
}

function onScroll() {
    if (!ticking) {
        ticking = true
        requestAnimationFrame(updateScroll)
    }
}

/** 路由切换、内容高度变化后重新计算 */
export function refreshScroll() {
    requestAnimationFrame(updateScroll)
}

export function scrollToTop() {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
}

/* ---------- 安装 ---------- */
export function installMotion(app) {
    app.directive('reveal', revealDirective)

    const root = document.documentElement

    /* 开屏：仅在本次会话首次进入时播放 */
    if (root.classList.contains('booting') && !reduceMotion) {
        bootVisible.value = true
        window.setTimeout(() => {
            bootLeaving.value = true
            root.classList.remove('booting')
            root.classList.add('boot-done')
            window.setTimeout(() => { bootVisible.value = false }, 820)
        }, 1150)
    } else {
        root.classList.remove('booting')
        root.classList.add('boot-done')
    }

    document.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('touchstart', onTouchMove, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchEnd, { passive: true })

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    updateScroll()
}
