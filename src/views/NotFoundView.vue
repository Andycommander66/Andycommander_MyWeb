<script setup>
/**
 * 404 页。
 *
 * SPA 内的未知路径与真实路径级 404 都落到这里。
 * 沿用整屏 Hero 的版式，页脚用 floating 形态。
 */

import { reactive, ref } from 'vue'
import AppFooter from '../components/AppFooter.vue'

const mainPanel = ref(null)

const orb = reactive({ top: '25%', left: '75%', opacity: 0, transition: 'opacity 0.7s ease-out' })

function place(e) {
    const rect = mainPanel.value.getBoundingClientRect()
    const pctX = ((e.clientX - rect.left) / rect.width) * 100
    const pctY = ((e.clientY - rect.top) / rect.height) * 100
    orb.left = (pctX * 0.7 + 15) + '%'
    orb.top = (pctY * 0.7 + 10) + '%'
    orb.opacity = 0.78
}

function reset() {
    orb.opacity = 0
    orb.transition = 'opacity 0.9s ease-out'
}

function onTouch(e) {
    const t = e.touches && e.touches[0]
    if (!t) { return }
    const rect = mainPanel.value.getBoundingClientRect()
    const pctX = Math.max(0, Math.min(100, ((t.clientX - rect.left) / rect.width) * 100))
    const pctY = Math.max(0, Math.min(100, ((t.clientY - rect.top) / rect.height) * 100))
    orb.left = (pctX * 0.7 + 15) + '%'
    orb.top = (pctY * 0.7 + 10) + '%'
    orb.opacity = 0.72
    orb.transition = 'opacity 0.3s ease-out'
}
</script>

<template>
    <div class="hero-container view-404">
        <div class="glass-panel-main spotlight" data-enter="fade" ref="mainPanel" @mousemove="place"
            @mouseleave="reset" @touchmove="onTouch" @touchend="reset">

            <div class="refraction-orb"
                :style="{ top: orb.top, left: orb.left, opacity: orb.opacity, transition: orb.transition }"></div>

            <div style="position:relative; z-index:22; display:flex; flex-direction:column; gap:clamp(10px,1.5vw,14px);">

                <!-- 404 大标题（带浮动字效） -->
                <h1 class="error-code">
                    <span class="glitch-char">4</span>
                    <span class="glitch-char">0</span>
                    <span class="glitch-char">4</span>
                </h1>

                <!-- 副标题 -->
                <p class="error-sub">✧ 页面已消失在数据流中 ✧</p>

                <!-- 描述 -->
                <p class="error-desc">
                    你访问的路径可能已被移除、更改，或者暂时不可用。
                    回到主页，重新出发。
                </p>

                <!-- 返回按钮 -->
                <RouterLink to="/" class="btn-404">
                    <span class="arrow">←</span> 返回主页
                </RouterLink>
            </div>
        </div>

        <AppFooter variant="floating" />
    </div>
</template>

<style scoped>
/* 404 卡片沿用原页面的尺寸，与首页 Hero 略有区别 */
.glass-panel-main {
    min-height: 360px;
    padding: clamp(28px, 4vw, 48px) clamp(24px, 4vw, 44px);
}
</style>
