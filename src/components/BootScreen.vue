<script setup>
/**
 * 开屏动画。
 *
 * 是否播放由 index.html 的内联脚本在首次绘制前决定（html.booting），
 * 这里只负责渲染与退场状态；脚本不可用时组件根本不会挂载。
 */

import { bootVisible, bootLeaving } from '../motion'
</script>

<template>
    <div v-if="bootVisible" class="boot-screen" :class="{ 'is-done': bootLeaving }" aria-hidden="true">
        <span class="boot-mark">Andycommander</span>
        <div class="boot-bar"><i></i></div>
        <span class="boot-note">Personal Portfolio</span>
    </div>
</template>
