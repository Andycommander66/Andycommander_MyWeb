<script setup>
/**
 * 首页 Hero。
 *
 *   · 主卡片内的折射光斑跟随鼠标 / 手指，背后两层毛玻璃面板做视差
 *   · 所有文案与数字来自内容仓库；统计数字由 utils/stats.js 自动算出
 *   · 进度条按入学年份自动推进，不用每年手动改百分比
 */

import { computed, reactive, ref } from 'vue'
import AppFooter from '../components/AppFooter.vue'
import ProgressBar from '../components/ProgressBar.vue'
import StatCounter from '../components/StatCounter.vue'
import { useContent } from '../stores/content'
import { externalTo } from '../utils/external'
import { interpolate, statValue, useStats } from '../utils/stats'

const content = useContent()
/** 全部数字由内容自动算出，改条目不用再手动改统计 */
const stats = useStats()

/** 进度条标题里的 {grade}、{studyYear} 等占位符换成实际值 */
const progressLabel = computed(() => interpolate(content.home.progress.label, stats.value))
const progressValue = computed(() => `${stats.value.studyPercent}%`)

/** 站外链接统一走 /leaving 提示页 */
const labLink = computed(() => externalTo(content.home.secondaryCta.external, content.home.secondaryCta.name))

const mainPanel = ref(null)
const back1 = ref(null)
const back2 = ref(null)

const orb = reactive({ top: '28%', left: '72%', opacity: 0, transition: 'opacity 0.7s ease-out' })
const back1Shift = ref('translate(0, 0)')
const back2Shift = ref('translate(0, 0)')

function place(e) {
    const rect = mainPanel.value.getBoundingClientRect()
    const pctX = ((e.clientX - rect.left) / rect.width) * 100
    const pctY = ((e.clientY - rect.top) / rect.height) * 100

    orb.left = (pctX * 0.7 + 15) + '%'
    orb.top = (pctY * 0.7 + 10) + '%'
    orb.opacity = 0.78

    back1Shift.value = `translate(${(pctX - 50) * 0.04}px, ${(pctY - 50) * 0.04}px)`
    back2Shift.value = `translate(${(pctX - 50) * 0.025}px, ${(pctY - 50) * 0.025}px)`
}

function reset() {
    orb.opacity = 0
    orb.transition = 'opacity 0.9s ease-out'
    back1Shift.value = 'translate(0, 0)'
    back2Shift.value = 'translate(0, 0)'
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

/** CTA 点击波纹（沿用原站效果） */
function ripple(e) {
    const btn = e.currentTarget
    const span = document.createElement('span')
    span.style.cssText = [
        'position:absolute', 'border-radius:50%', 'background:rgba(230,110,120,0.28)',
        'width:20px', 'height:20px', 'top:50%', 'left:50%',
        'transform:translate(-50%,-50%) scale(0)', 'pointer-events:none',
        'animation:rippleOut 1.2s ease-out forwards',
    ].join(';')
    btn.appendChild(span)
    window.setTimeout(() => span.remove(), 1300)
}
</script>

<template>
    <div class="hero-container">
        <!-- 背后偏移毛玻璃面板 -->
        <div class="glass-panel glass-panel-back-1" ref="back1"
            :style="{ width: '56%', height: '50%', top: '20%', left: '16%', borderRadius: '24px', transform: back1Shift }">
        </div>
        <div class="glass-panel glass-panel-back-2" ref="back2"
            :style="{ width: '44%', height: '40%', top: '28%', left: '30%', borderRadius: '22px', transform: back2Shift }">
        </div>

        <!-- 小型装饰毛玻璃 -->
        <div class="glass-accent accent-1" style="top:16%;right:16%;"></div>
        <div class="glass-accent accent-2" style="top:58%;left:10%;"></div>
        <div class="glass-accent accent-3" style="bottom:20%;right:20%;"></div>

        <!-- Hero Section · 主毛玻璃卡片 -->
        <div class="glass-panel glass-panel-main spotlight" data-enter="fade" ref="mainPanel" @mousemove="place"
            @mouseleave="reset" @touchmove="onTouch" @touchend="reset">

            <div class="refraction-orb"
                :style="{ top: orb.top, left: orb.left, opacity: orb.opacity, transition: orb.transition }"></div>

            <div class="hero-stagger"
                style="position:relative;z-index:22;display:flex;flex-direction:column;gap:clamp(10px,1.5vw,14px);">

                <!-- Hero 眉标 · 身份标签行 -->
                <div data-enter style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                    <span v-for="tag in content.home.tags" :key="tag.text" class="status-tag" :style="tag.style || null">
                        <span class="tag-dot" :style="tag.dot || null"></span> {{ tag.text }}
                    </span>
                </div>

                <!-- Hero 主标题 -->
                <h1 class="hero-title" data-enter style="margin:0;">
                    <span class="highlight">Andycommander</span>
                </h1>

                <!-- Hero 角色行 -->
                <p class="hero-role" data-enter style="margin:0;">
                    {{ content.home.role }}
                </p>

                <!-- Hero 价值主张 -->
                <p class="hero-subtitle" data-enter style="margin:0;">
                    {{ content.home.subtitle }}
                </p>

                <!-- Hero 数据指标行 -->
                <div id="honors" data-enter
                    style="display:flex;gap:clamp(16px,3vw,32px);flex-wrap:wrap;align-items:flex-end;margin-top:2px;">
                    <StatCounter v-for="s in content.home.stats" :key="s.label" :value="statValue(s, stats)"
                        :suffix="s.suffix" :label="s.label" />
                </div>

                <!-- Hero 进度条 · 当前学段（百分比按入学年份自动推进） -->
                <ProgressBar :label="progressLabel" :value="progressValue" :percent="stats.studyPercent" />

                <!-- Hero 行动按钮 -->
                <div id="contact" data-enter
                    style="display:flex;gap:12px;flex-wrap:wrap;position:relative;z-index:22;margin-top:4px;">
                    <RouterLink :to="content.home.primaryCta.to" class="hero-cta" @click="ripple">
                        {{ content.home.primaryCta.text }}
                        <span class="cta-arrow">→</span>
                    </RouterLink>
                    <RouterLink :to="labLink" class="hero-cta"
                        style="background:transparent;border-color:rgba(255,210,215,0.1);" @click="ripple">
                        {{ content.home.secondaryCta.text }}
                    </RouterLink>
                </div>
            </div>
        </div>

        <AppFooter variant="floating" />
    </div>
</template>

<style>
/* 波纹关键帧（原站由脚本注入） */
@keyframes rippleOut {
    0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0.7;
    }

    100% {
        transform: translate(-50%, -50%) scale(12);
        opacity: 0;
    }
}
</style>
