<script setup>
/**
 * 应用骨架。
 *
 * 负责三件事：
 *   1. 全站共用的背景层（底色 + 激光线 + 光晕 + 网格），只渲染一份
 *   2. 顶部导航、回到顶部、预览浮条、开屏动画
 *   3. 路由出口的切换过渡，以及 SEO 标签与内容来源标记的同步
 *
 * 页脚不在这里：各视图按自身形态引入（长页面 static、整屏页面 floating）。
 */

import { watch } from 'vue'
import { useRoute } from 'vue-router'

import AppNav from './components/AppNav.vue'
import BootScreen from './components/BootScreen.vue'
import LaserCanvas from './components/LaserCanvas.vue'
import PreviewBar from './components/PreviewBar.vue'
import ToTopButton from './components/ToTopButton.vue'

import { refreshScroll } from './motion'
import { state } from './stores/content'
import { applySeo } from './utils/seo'

const route = useRoute()

/** 内容或路由变化时同步 canonical / description / robots / 结构化数据 */
watch(
    [() => route.fullPath, () => state.version],
    () => { applySeo(state.data, route) },
    { immediate: true },
)

/**
 * 在 <html> 上标记当前内容来源，便于排查「为什么显示的不是后台改过的内容」：
 *   server  = 已连上后端
 *   default = 后端不可用，正在用内置默认内容
 *   preview = 管理员正在预览未保存的草稿
 */
watch(
    [() => state.source, () => state.ready, () => state.previewing],
    () => {
        const root = document.documentElement
        root.dataset.contentSource = !state.ready ? 'loading'
            : state.previewing ? 'preview' : state.source
    },
    { immediate: true },
)

// 路由切换后页面高度变化，滚动进度需要重算（滚动复位由 router 的 scrollBehavior 负责）
watch(() => route.fullPath, () => {
    refreshScroll()
})
</script>

<template>
    <!-- 背景层：底色 + 激光线网络 + 光晕 + 网格，全站共用一份 -->
    <div class="bg-base"></div>
    <LaserCanvas />
    <div class="bg-aura aura-1"></div>
    <div class="bg-aura aura-2"></div>
    <div class="bg-aura aura-3"></div>
    <div class="grid-texture"></div>

    <AppNav />

    <!-- 页面切换过渡：out-in 先退场再进场，避免两页叠在一起 -->
    <RouterView v-slot="{ Component, route: current }">
        <Transition name="page" mode="out-in">
            <component :is="Component" :key="current.path" />
        </Transition>
    </RouterView>

    <ToTopButton />
    <PreviewBar />
    <BootScreen />

    <!-- 页脚由各视图按形态引入：长页面 static、整屏页面 floating -->
</template>
