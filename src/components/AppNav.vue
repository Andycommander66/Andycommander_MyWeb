<script setup>
/**
 * 顶部导航。
 *
 * 要点：
 *   · 站点内用 RouterLink，站外统一走 /leaving 提示页
 *   · 底部那条进度条反映整页滚动进度，只在页面可滚动时才淡入
 *   · 404 页额外挂一枚角标，沿用原设计
 *
 * 定位用 left:0/right:0 + margin:auto 居中，而不是 left:50% + translate：
 * 后者会把 fixed 元素的可用宽度限制成视口的一半，窄屏上文字会换行。
 */

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { scrollRatio, scrollable } from '../motion'
import { useContent } from '../stores/content'
import { externalTo } from '../utils/external'

const route = useRoute()
const content = useContent()

/** 当前页高亮（沿用原设计：当前项亮一档） */
const ACTIVE = 'color:rgba(245,230,232,0.85);'

const isHome = computed(() => route.name === 'home')
const isProjects = computed(() => route.name === 'projects')
const isHonors = computed(() => route.name === 'honors')
const isContact = computed(() => route.name === 'contact')
/** 404 页额外挂一枚角标，与原设计一致 */
const is404 = computed(() => route.name === 'notfound')

/** 站外链接统一走 /leaving 提示页 */
const labLink = computed(() => externalTo(content.site.labUrl, content.site.labName))

const progressWidth = computed(() => (scrollRatio.value * 100).toFixed(2) + '%')
</script>

<template>
    <nav class="nav-glass" :class="{ 'is-scrollable': scrollable }">
        <span class="nav-dot"></span>

        <RouterLink to="/" class="nav-link" :style="isHome ? ACTIVE : null"
            :aria-current="isHome ? 'page' : null">首页</RouterLink>
        <span class="nav-separator"></span>

        <RouterLink to="/projects" class="nav-link" :style="isProjects ? ACTIVE : null"
            :aria-current="isProjects ? 'page' : null">项目</RouterLink>
        <span class="nav-separator"></span>

        <RouterLink to="/honors" class="nav-link" :style="isHonors ? ACTIVE : null"
            :aria-current="isHonors ? 'page' : null">荣誉经历</RouterLink>
        <span class="nav-separator"></span>

        <RouterLink :to="labLink" class="nav-link">实验室</RouterLink>
        <span class="nav-separator"></span>

        <RouterLink to="/contact" class="nav-link" :style="isContact ? ACTIVE : null"
            :aria-current="isContact ? 'page' : null">联系</RouterLink>

        <template v-if="is404">
            <span class="nav-separator"></span>
            <span class="nav-btn-404" aria-current="page" title="当前页面：404">404</span>
        </template>

        <div class="nav-progress">
            <span class="nav-progress-fill" :style="{ width: progressWidth }"></span>
        </div>
    </nav>
</template>
