<script setup>
/**
 * 项目页。
 *
 * 数据来自两处：
 *   1. 访客浏览器直接读 GitHub 公开 API（新建仓库会自动出现）
 *   2. 内容里的置顶项与兜底清单（读不到 GitHub 时仍能展示）
 *
 * 只展示自有仓库，fork 与归档的已由 utils/github.js 过滤掉。
 */

import { computed, onMounted, ref, watch } from 'vue'
import AppFooter from '../components/AppFooter.vue'
import { useContent } from '../stores/content'
import { externalTo } from '../utils/external'
import { fetchRepos } from '../utils/github'

const content = useContent()

const TAG_FIRST = '--tag-bg:rgba(160,40,55,0.22);--tag-border:rgba(200,80,95,0.35);--tag-text:#f0b0b6;'
const TAG_THIRD = '--tag-bg:rgba(140,35,48,0.2);--tag-border:rgba(190,70,85,0.32);--tag-text:#f0a8b0;'
const DOT_ACCENT = 'background:#f0a0a8;box-shadow:0 0 8px rgba(240,140,150,0.7);'

const FALLBACK_NOTE = '未能读取到 GitHub 仓库列表（可能是网络原因），下面展示的是手工维护的清单，完整内容请前往 GitHub 主页查看。'

const status = ref('loading')   // loading | live | fallback
const repos = ref([])

const profileLink = computed(() => externalTo(content.projects.githubUrl, `GitHub · ${content.projects.githubUser}`))

/** 项目卡片：置顶的手工条目排在最前，其余来自 GitHub（接口已排除 fork 与归档） */
const ownProjects = computed(() => {
    const pinned = content.projects.pinned || []
    if (status.value === 'live') { return pinned.concat(repos.value) }
    return pinned.concat(content.projects.fallback || [])
})

const note = computed(() => {
    if (status.value === 'live') {
        return `已读取 ${repos.value.length} 个自有仓库（不含 fork 与归档），按最近提交排序，数据来自 GitHub 公开 API。`
    }
    return FALLBACK_NOTE
})

async function load() {
    status.value = 'loading'
    try {
        const list = await fetchRepos(content.projects.githubUser)
        repos.value = list
        status.value = list.length ? 'live' : 'fallback'
    } catch (e) {
        status.value = 'fallback'
    }
}

onMounted(load)
// 后台改过用户名后无需刷新页面即可重新拉取
watch(() => content.projects.githubUser, load)
</script>

<template>
    <div class="view-projects">
        <main class="page-wrap">

            <!-- 概览卡片 -->
            <header class="glass-card spotlight" data-enter>
                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                    <span class="status-tag"><span class="tag-dot"></span> 项目</span>
                    <span class="status-tag" :style="TAG_FIRST"><span class="tag-dot"></span> 开源</span>
                    <span class="status-tag" :style="TAG_THIRD"><span class="tag-dot" :style="DOT_ACCENT"></span> 持续更新</span>
                </div>

                <h1 class="page-title">项目</h1>

                <p class="page-subtitle">
                    课程作业、竞赛作品与自用工具都在这里。<br>
                    仓库列表直接读取 GitHub，新建的项目会自动出现。
                </p>

                <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;">
                    <RouterLink :to="profileLink" class="hero-cta">
                        前往 GitHub 主页
                        <span class="cta-arrow">→</span>
                    </RouterLink>
                    <RouterLink to="/honors" class="hero-cta"
                        style="background:transparent;border-color:rgba(255,210,215,0.1);">
                        查看荣誉与经历
                    </RouterLink>
                </div>
            </header>

            <!-- GitHub 入口 -->
            <section class="glass-card spotlight" v-reveal>
                <div class="section-head">
                    <h2 class="section-title">代码托管</h2>
                    <span class="section-note">仓库源自 GitHub 公开主页</span>
                </div>

                <div class="channel-list">
                    <RouterLink class="channel" :to="profileLink">
                        <div class="channel-head">
                            <span class="channel-name">GitHub · {{ content.projects.githubUser }}</span>
                            <span class="channel-action">访问 →</span>
                        </div>
                        <p class="channel-desc">{{ content.projects.githubUrl }}</p>
                    </RouterLink>
                </div>
            </section>

            <!-- 项目列表 -->
            <section class="glass-card spotlight" v-reveal>
                <div class="section-head">
                    <h2 class="section-title">项目列表</h2>
                    <span class="section-note">{{ note }}</span>
                </div>

                <p v-if="status === 'loading'" class="section-note" style="margin:0;">
                    正在读取 GitHub 仓库列表…
                </p>

                <div v-if="ownProjects.length" class="feature-grid">
                    <article v-for="p in ownProjects" :key="p.name" class="feature">
                        <div class="feature-top">
                            <span class="status-tag" :style="TAG_THIRD">
                                <span class="tag-dot" :style="DOT_ACCENT"></span> {{ p.lang || '仓库' }}
                            </span>
                            <span class="feature-date">{{ p.updated }}</span>
                        </div>

                        <h3 class="feature-name">{{ p.name }}</h3>
                        <p class="feature-meta" style="margin:0;">{{ p.desc || '暂无简介' }}</p>

                        <div class="feature-top" style="margin-top:2px;">
                            <span class="feature-award">
                                <template v-if="p.pinned">本站自有</template>
                                <template v-else-if="p.stars">★ {{ p.stars }}</template>
                                <template v-else>尚未获得 Star</template>
                            </span>
                            <RouterLink class="feature-award" :to="externalTo(p.url, p.name)"
                                style="text-decoration:none;">查看仓库 →</RouterLink>
                        </div>
                    </article>
                </div>

                <p v-else-if="status !== 'loading'" class="section-note" style="margin:0;">
                    暂时没有可展示的仓库。
                </p>
            </section>

            <!-- 说明 -->
            <section class="glass-card spotlight" v-reveal>
                <h2 class="section-title">关于本页</h2>
                <div class="point-list">
                    <p class="point">仓库列表由你的浏览器直接向 GitHub 公开 API 读取，本站服务端不参与、也不缓存任何数据。</p>
                    <p class="point">只展示自有仓库：fork 与已归档的仓库一律不显示，列表按最近提交时间排序。</p>
                    <p class="point">置顶的「个人主页 · 本站」为手工维护条目，其余条目均来自 GitHub。</p>
                    <p class="point">若网络无法访问 GitHub，本页会回退到手工维护的清单，功能不受影响。</p>
                </div>
            </section>
        </main>

        <AppFooter />
    </div>
</template>
