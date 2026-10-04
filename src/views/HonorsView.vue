<script setup>
/**
 * 荣誉与经历页。
 *
 * 分区：概览数据 → 重点荣誉（含青马工程整行卡片）→ 校级荣誉 → 任职与经历 → 方向与能力。
 *
 * 全部数字由 utils/stats.js 从条目算出：加一条荣誉，统计与分组说明会同步变化。
 * 分组说明与列标题里的 {school}、{highLevel} 等占位符由 interpolate() 替换。
 */

import { computed } from 'vue'
import AppFooter from '../components/AppFooter.vue'
import StatCounter from '../components/StatCounter.vue'
import { useContent } from '../stores/content'
import { interpolate, statValue, useStats } from '../utils/stats'

const content = useContent()
/** 全部数字由条目自动算出：加一条荣誉，统计跟着变，不用手工改 */
const stats = useStats()

/** 分组说明与列标题里的 {highLevel}、{school} 等占位符换成实际值 */
const featureNote = computed(() => interpolate(content.honors.featureNote, stats.value))
const schoolNote = computed(() => interpolate(content.honors.schoolNote, stats.value))
const titlesLabel = computed(() => interpolate(content.honors.schoolTitlesLabel, stats.value))
const contestsLabel = computed(() => interpolate(content.honors.schoolContestsLabel, stats.value))

const TAG_FIRST = '--tag-bg:rgba(160,40,55,0.22);--tag-border:rgba(200,80,95,0.35);--tag-text:#f0b0b6;'
const TAG_THIRD = '--tag-bg:rgba(140,35,48,0.2);--tag-border:rgba(190,70,85,0.32);--tag-text:#f0a8b0;'
const DOT_ACCENT = 'background:#f0a0a8;box-shadow:0 0 8px rgba(240,140,150,0.7);'
</script>

<template>
    <div class="view-honors">
        <main class="page-wrap">

            <!-- 概览卡片 -->
            <header class="glass-card spotlight" data-enter>
                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                    <span class="status-tag"><span class="tag-dot"></span> 荣誉经历</span>
                    <span class="status-tag" :style="TAG_FIRST"><span class="tag-dot"></span> 竞赛驱动</span>
                    <span class="status-tag" :style="TAG_THIRD"><span class="tag-dot" :style="DOT_ACCENT"></span> 持续更新</span>
                </div>

                <h1 class="page-title">荣誉与经历</h1>

                <p class="page-subtitle">
                    从校级称号到省级赛事，每一份记录都对应一次真实的实践。<br>
                    按奖项层级归类，条目与奖状原件一致。
                </p>

                <div class="data-row">
                    <StatCounter v-for="s in content.honors.stats" :key="s.label" :value="statValue(s, stats)"
                        :suffix="s.suffix" :label="s.label" />
                </div>
            </header>

            <!-- 重点荣誉 -->
            <section class="glass-card spotlight" v-reveal>
                <div class="section-head">
                    <h2 class="section-title">重点荣誉</h2>
                    <span class="section-note">{{ featureNote }}</span>
                </div>

                <div class="feature-grid">
                    <article v-for="f in content.honors.features" :key="f.name" class="feature">
                        <div class="feature-top">
                            <span class="status-tag" :style="f.tagStyle || null"><span class="tag-dot"
                                    :style="f.dot || null"></span> {{ f.level }}</span>
                            <span class="feature-date">{{ f.date }}</span>
                        </div>
                        <h3 class="feature-name">{{ f.name }}</h3>
                        <span class="feature-award">{{ f.award }}</span>
                        <p class="feature-meta">{{ f.meta }}</p>
                    </article>

                    <article class="feature feature-wide">
                        <div class="feature-top">
                            <span class="status-tag" :style="content.honors.qingma.tagStyle || null"><span class="tag-dot"
                                    :style="content.honors.qingma.dot || null"></span> {{ content.honors.qingma.level }}</span>
                            <span class="feature-date">{{ content.honors.qingma.date }}</span>
                        </div>
                        <h3 class="feature-name">{{ content.honors.qingma.name }}</h3>
                        <span class="feature-award">{{ content.honors.qingma.award }}</span>

                        <div class="feature-stages">
                            <div v-for="s in content.honors.qingma.stages" :key="s.name" class="stage">
                                <span class="stage-name">{{ s.name }}</span>
                                <span class="stage-meta">{{ s.meta }}</span>
                            </div>
                        </div>

                        <p class="feature-meta">{{ content.honors.qingma.meta }}</p>
                    </article>
                </div>
            </section>

            <!-- 校级荣誉 -->
            <section class="glass-card spotlight" v-reveal>
                <div class="section-head">
                    <h2 class="section-title">校级荣誉</h2>
                    <span class="section-note">{{ schoolNote }}</span>
                </div>

                <div class="honor-cols">
                    <div class="honor-col">
                        <span class="group-label">{{ titlesLabel }}</span>
                        <div class="mini-list">
                            <div v-for="m in content.honors.schoolTitles" :key="m.name" class="mini">
                                <span class="mini-name">{{ m.name }}</span>
                                <span class="mini-date">{{ m.date }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="honor-col">
                        <span class="group-label">{{ contestsLabel }}</span>
                        <div class="mini-list">
                            <div v-for="m in content.honors.schoolContests" :key="m.name" class="mini">
                                <span class="mini-name">{{ m.name }}</span>
                                <span class="mini-date">{{ m.date }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 任职与经历 -->
            <section class="glass-card spotlight" v-reveal>
                <div class="section-head">
                    <h2 class="section-title">任职与经历</h2>
                    <span class="section-note">按时间倒序</span>
                </div>

                <div class="timeline">
                    <div v-for="t in content.honors.timeline" :key="t.title" class="tl-item">
                        <span class="tl-date">{{ t.date }}</span>
                        <h3 class="tl-title">{{ t.title }}</h3>
                        <p class="tl-desc">{{ t.desc }}</p>
                    </div>
                </div>
            </section>

            <!-- 方向与能力 -->
            <section class="glass-card spotlight" v-reveal>
                <div class="section-head">
                    <h2 class="section-title">方向与能力</h2>
                    <span class="section-note">在学与在研方向，随学习进度更新</span>
                </div>

                <div class="chip-row">
                    <span v-for="s in content.honors.skills" :key="s.text" class="status-tag" :style="s.style || null">
                        <span class="tag-dot" :style="s.dot || null"></span> {{ s.text }}
                    </span>
                </div>
            </section>
        </main>

        <AppFooter />
    </div>
</template>
