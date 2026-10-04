<script setup>
/**
 * 联系方式页。
 *
 *   · 公开入口：站外地址自动走 /leaving 提示页，站内地址直接跳路由
 *   · 私人渠道：只说明「暂未公开」，不展示任何真实联系方式
 *   · 本站说明：逐条声明数据来源与隐私做法，可后台编辑
 */

import { computed } from 'vue'
import AppFooter from '../components/AppFooter.vue'
import { useContent } from '../stores/content'
import { externalTo } from '../utils/external'

const content = useContent()

const TAG_FIRST = '--tag-bg:rgba(160,40,55,0.22);--tag-border:rgba(200,80,95,0.35);--tag-text:#f0b0b6;'
const TAG_THIRD = '--tag-bg:rgba(140,35,48,0.2);--tag-border:rgba(190,70,85,0.32);--tag-text:#f0a8b0;'
const DOT_ACCENT = 'background:#f0a0a8;box-shadow:0 0 8px rgba(240,140,150,0.7);'

/** 站外地址走 /leaving 提示页，站内地址直接给路由 */
const channels = computed(() => content.contact.channels.map((c) => ({
    ...c,
    link: c.external ? externalTo(c.external, c.name) : (c.to || '/'),
})))
</script>

<template>
    <div class="view-contact">
        <main class="page-wrap">

            <!-- 概览卡片 -->
            <header class="glass-card spotlight" data-enter>
                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                    <span class="status-tag"><span class="tag-dot"></span> 联系方式</span>
                    <span class="status-tag" :style="TAG_FIRST"><span class="tag-dot"></span> 开放交流</span>
                    <span class="status-tag" :style="TAG_THIRD"><span class="tag-dot" :style="DOT_ACCENT"></span> 隐私优先</span>
                </div>

                <h1 class="page-title">联系方式</h1>

                <p class="page-subtitle">
                    欢迎就竞赛组队、项目合作与学习交流联系我。<br>
                    本站不公开电话、住址、证件等任何私人敏感信息。
                </p>
            </header>

            <!-- 公开入口 -->
            <section class="glass-card spotlight" v-reveal>
                <h2 class="section-title">公开入口</h2>
                <p class="section-note" style="margin:0;">以下入口均为公开可访问的渠道</p>

                <div class="channel-list">
                    <RouterLink v-for="c in channels" :key="c.name" class="channel" :to="c.link">
                        <div class="channel-head">
                            <span class="channel-name">{{ c.name }}</span>
                            <span class="channel-action">{{ c.action }}</span>
                        </div>
                        <p class="channel-desc">{{ c.desc }}</p>
                    </RouterLink>
                </div>
            </section>

            <!-- 私人联系方式 -->
            <section class="glass-card spotlight" v-reveal>
                <h2 class="section-title">私人联系方式</h2>

                <div class="channel-list">
                    <div class="channel channel-muted">
                        <div class="channel-head">
                            <span class="channel-name">{{ content.contact.mutedChannel.title }}</span>
                            <span class="channel-action">{{ content.contact.mutedChannel.action }}</span>
                        </div>
                        <p class="channel-desc">{{ content.contact.mutedChannel.desc }}</p>
                    </div>
                </div>

                <p class="section-note" style="margin:0;">{{ content.contact.mutedChannel.note }}</p>
            </section>

            <!-- 交流方向 -->
            <section class="glass-card spotlight" v-reveal>
                <h2 class="section-title">交流方向</h2>
                <p class="section-note" style="margin:0;">以下方向欢迎交流与组队</p>

                <div class="chip-row">
                    <span v-for="d in content.contact.directions" :key="d.text" class="status-tag"
                        :style="d.style || null">
                        <span class="tag-dot" :style="d.dot || null"></span> {{ d.text }}
                    </span>
                </div>
            </section>

            <!-- 本站说明 -->
            <section class="glass-card spotlight" v-reveal>
                <h2 class="section-title">本站说明</h2>

                <div class="point-list">
                    <p v-for="n in content.contact.notes" :key="n" class="point">{{ n }}</p>
                </div>
            </section>
        </main>

        <AppFooter />
    </div>
</template>
