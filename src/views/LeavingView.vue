<script setup>
/**
 * 站外跳转提示页。
 *
 * 所有站外链接都不直接跳转，先到这里：
 *   · 展示目标站点名称、域名与完整地址
 *   · 「继续访问」是真实外链（target=_blank + rel=noopener noreferrer nofollow）
 *   · 协议白名单：仅放行 http / https，javascript: 之类会显示「已阻止跳转」
 */

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppFooter from '../components/AppFooter.vue'
import { isSafeExternal } from '../utils/external'

const TAG_FIRST = '--tag-bg:rgba(160,40,55,0.22);--tag-border:rgba(200,80,95,0.35);--tag-text:#f0b0b6;'
const TAG_THIRD = '--tag-bg:rgba(140,35,48,0.2);--tag-border:rgba(190,70,85,0.32);--tag-text:#f0a8b0;'
const DOT_ACCENT = 'background:#f0a0a8;box-shadow:0 0 8px rgba(240,140,150,0.7);'

const route = useRoute()
const router = useRouter()

const target = computed(() => (typeof route.query.to === 'string' ? route.query.to : ''))
const siteName = computed(() => (typeof route.query.name === 'string' && route.query.name ? route.query.name : '外部网站'))
const safe = computed(() => isSafeExternal(target.value))

/** 只展示域名，避免把带参数的完整地址铺满卡片 */
const host = computed(() => {
    if (!safe.value) { return '' }
    try { return new URL(target.value).host } catch (e) { return '' }
})

function goBack() {
    if (window.history.length > 1) {
        router.back()
    } else {
        router.replace('/')
    }
}
</script>

<template>
    <div class="view-leaving">
        <main class="page-wrap">
            <header class="glass-card spotlight" data-enter>
                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                    <span class="status-tag"><span class="tag-dot"></span> 站外链接</span>
                    <span class="status-tag" :style="TAG_FIRST"><span class="tag-dot"></span> 安全提示</span>
                    <span class="status-tag" :style="TAG_THIRD"><span class="tag-dot" :style="DOT_ACCENT"></span> 即将离开本站</span>
                </div>

                <h1 class="page-title">即将离开本站</h1>

                <p class="page-subtitle">
                    你即将前往一个<strong>站外网站</strong>。<br>
                    该网站的内容、隐私政策与安全性由其自身负责，本站无法控制。
                </p>

                <!-- 目标地址 -->
                <div class="channel-list">
                    <div v-if="safe" class="channel">
                        <div class="channel-head">
                            <span class="channel-name">{{ siteName }}</span>
                            <span class="channel-action">{{ host }}</span>
                        </div>
                        <p class="channel-desc" style="word-break:break-all;">{{ target }}</p>
                    </div>

                    <div v-else class="channel channel-muted">
                        <div class="channel-head">
                            <span class="channel-name">链接地址无效</span>
                            <span class="channel-action">已阻止跳转</span>
                        </div>
                        <p class="channel-desc">
                            该链接缺少有效的目标地址，或使用了不被允许的协议，因此没有继续跳转。
                        </p>
                    </div>
                </div>

                <!-- 操作 -->
                <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;">
                    <a v-if="safe" :href="target" target="_blank" rel="noopener noreferrer nofollow"
                        class="hero-cta">
                        继续访问
                        <span class="cta-arrow">→</span>
                    </a>
                    <button type="button" class="hero-cta"
                        style="background:transparent;border-color:rgba(255,210,215,0.1);" @click="goBack">
                        <span class="cta-arrow">←</span> 返回上一页
                    </button>
                </div>
            </header>

            <section class="glass-card spotlight" v-reveal>
                <h2 class="section-title">温馨提示</h2>
                <div class="point-list">
                    <p class="point">本站不对站外网站的内容、可用性与安全性负责。</p>
                    <p class="point">在站外网站填写个人信息前，请先确认该网站可信。</p>
                    <p class="point">如果这不是你预期的目标，请直接返回上一页。</p>
                </div>
            </section>
        </main>

        <AppFooter />
    </div>
</template>
