<script setup>
/**
 * 数字滚动。
 *
 * 进入视口才开始计数，只跑一次；prefers-reduced-motion 下直接显示终值。
 * .stat-suffix 是 scoped 样式，所以后缀在这里单独排版。
 */

import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
    value: { type: Number, required: true },
    suffix: { type: String, default: '' },
    label: { type: String, default: '' },
})

const el = ref(null)
const shown = ref('0')

const reduceMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let io = null
let raf = 0

function countUp() {
    if (reduceMotion) {
        shown.value = String(props.value)
        return
    }
    const duration = 1100
    let start = null

    const step = (ts) => {
        if (start === null) { start = ts }
        const p = Math.min((ts - start) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        shown.value = String(Math.round(props.value * eased))
        if (p < 1) {
            raf = requestAnimationFrame(step)
        } else {
            shown.value = String(props.value)
        }
    }
    raf = requestAnimationFrame(step)
}

onMounted(() => {
    const node = el.value
    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
        countUp()
        return
    }
    io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                countUp()
                io.unobserve(entry.target)
            }
        })
    }, { threshold: 0.4 })
    io.observe(node)
})

onUnmounted(() => {
    if (io) { io.disconnect() }
    cancelAnimationFrame(raf)
})
</script>

<template>
    <div class="data-item">
        <span class="data-number" ref="el">{{ shown }}<span v-if="suffix" class="stat-suffix">{{ suffix }}</span></span>
        <span class="data-label">{{ label }}</span>
    </div>
</template>

<style scoped>
.stat-suffix {
    font-size: 0.55em;
    color: #c5b8bb;
}
</style>
