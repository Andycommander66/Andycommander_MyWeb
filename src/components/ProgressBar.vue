<script setup>
/**
 * 首页进度条。
 *
 * 视觉沿用原设计（6px 轨道 + 三段渐变 + 呼吸光晕），只叠加动效：
 *   1. 填充条由 0 缓动到目标值
 *   2. 右侧百分比用同一缓动同步滚动
 *   3. 一道柔和高光周期性扫过
 *
 * 时序很关键：必须等开屏动画结束再播，否则用户看到页面时动画早已跑完。
 * 因此这里监听 motion 的 bootVisible，结束后再延迟一小段（与主面板分段入场对齐）。
 */

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { bootVisible } from '../motion'

/**
 * 首页进度条。
 * 在原有视觉（6px 轨道 + 三段渐变 + 呼吸光晕）不变的前提下补三层细腻动效：
 *   1. 填充条由 0 缓动到目标值
 *   2. 右侧百分比同步滚动
 *   3. 填充条上一道流光扫过，端点浮现一点辉光
 *
 * 时序：开屏动画期间不播放（否则用户看到时动画早已跑完），
 * 开屏结束后再等一小段，与主面板 0.9s 的分段入场对齐。
 * 同时进入视口才播放；全程尊重 prefers-reduced-motion。
 */
const props = defineProps({
    label: { type: String, default: '' },
    value: { type: String, default: '' },
    percent: { type: Number, default: 0 },
})

const root = ref(null)
const started = ref(false)
const done = ref(false)
const shown = ref(0)

const DURATION = 1100
/** 开屏结束后的等待：与 .hero-stagger 的分段入场错开，观感更像"依次亮起" */
const START_DELAY = 380
const EASING = (p) => 1 - Math.pow(1 - p, 3)

let timer = 0
let frame = 0
let observer = null
let stopBootWatch = null

const target = computed(() => Math.max(0, Math.min(100, Number(props.percent) || 0)))

/** value 形如 "25%" 时跟随动画滚动；否则（如 "3 / 4"）原样显示 */
const parsed = computed(() => {
    const m = /^(\d+(?:\.\d+)?)\s*%$/.exec(String(props.value).trim())
    return m ? Number(m[1]) : null
})

const displayValue = computed(() => {
    if (parsed.value === null) { return props.value }
    return Math.round(shown.value) + '%'
})

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function play() {
    if (started.value) { return }
    started.value = true

    if (reduced()) {
        shown.value = parsed.value === null ? target.value : parsed.value
        done.value = true
        return
    }

    const to = parsed.value === null ? target.value : parsed.value
    const t0 = performance.now()

    const step = (now) => {
        const p = Math.min(1, (now - t0) / DURATION)
        shown.value = to * EASING(p)
        if (p < 1) {
            frame = requestAnimationFrame(step)
        } else {
            shown.value = to
            done.value = true
        }
    }
    frame = requestAnimationFrame(step)

    // 填充条本身交给 CSS 过渡，时长与缓动跟数字对齐
    timer = window.setTimeout(() => { done.value = true }, DURATION + 60)
}

/** 进入视口后才播放 */
function watchViewport() {
    const el = root.value
    if (!el || !('IntersectionObserver' in window)) {
        timer = window.setTimeout(play, reduced() ? 0 : START_DELAY)
        return
    }

    observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) { continue }
            observer.disconnect()
            observer = null
            if (reduced()) { play() } else { timer = window.setTimeout(play, START_DELAY) }
            break
        }
    }, { threshold: 0.35 })

    observer.observe(el)
}

onMounted(() => {
    if (bootVisible.value) {
        // 开屏还在放，等它结束再排队
        stopBootWatch = watch(bootVisible, (visible) => {
            if (visible) { return }
            if (stopBootWatch) { stopBootWatch(); stopBootWatch = null }
            watchViewport()
        })
    } else {
        watchViewport()
    }
})

onBeforeUnmount(() => {
    if (observer) { observer.disconnect() }
    if (stopBootWatch) { stopBootWatch() }
    if (frame) { cancelAnimationFrame(frame) }
    if (timer) { window.clearTimeout(timer) }
})
</script>

<template>
    <div ref="root" class="progress-block" data-enter>
        <div class="progress-head">
            <span class="progress-label">{{ label }}</span>
            <span class="progress-value" :class="{ 'is-done': done }">{{ displayValue }}</span>
        </div>

        <div class="progress-bar-wrap" role="progressbar" :aria-label="label" aria-valuemin="0" aria-valuemax="100"
            :aria-valuenow="target" :aria-valuetext="displayValue">
            <div class="progress-bar-fill" :style="{ width: started ? target + '%' : '0%' }">
                <span class="progress-sheen" aria-hidden="true"></span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.progress-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 2px;
}

.progress-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

.progress-label {
    font-size: 0.75rem;
    color: #c5b8bb;
    font-weight: 500;
    letter-spacing: 0.05em;
}

.progress-value {
    font-size: 0.75rem;
    color: #e0a0a8;
    font-weight: 600;
    letter-spacing: 0.04em;
    white-space: nowrap;
    /* 数字宽度变化时用等宽数字，避免左右抖动 */
    font-variant-numeric: tabular-nums;
    transition: color 0.5s ease, text-shadow 0.5s ease;
}

.progress-value.is-done {
    color: #f0b0b8;
    text-shadow: 0 0 12px rgba(230, 120, 130, 0.35);
}

/* 覆盖 base.css 的 0.6s：这里由组件统一控制起始与时长 */
.progress-bar-fill {
    transition: width 1.1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    position: relative;
}

/* 流光：一道柔和高光沿填充条扫过，只在动画结束后周期性出现 */
.progress-sheen {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    overflow: hidden;
    pointer-events: none;
}

.progress-sheen::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 46px;
    background: linear-gradient(90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 235, 238, 0.42) 50%,
            rgba(255, 255, 255, 0) 100%);
    filter: blur(1px);
    transform: translateX(-60px);
    animation: sheenSweep 4.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 1.4s infinite;
}

@keyframes sheenSweep {
    0% {
        transform: translateX(-60px);
        opacity: 0;
    }

    12% {
        opacity: 1;
    }

    46% {
        transform: translateX(calc(100% + 60px));
        opacity: 0;
    }

    100% {
        transform: translateX(calc(100% + 60px));
        opacity: 0;
    }
}

@media (prefers-reduced-motion: reduce) {

    .progress-sheen::after {
        animation: none;
    }

    .progress-sheen {
        display: none;
    }

    .progress-bar-fill {
        transition: none;
    }
}
</style>
