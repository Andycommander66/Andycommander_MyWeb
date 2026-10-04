<script setup>
/**
 * 回到顶部按钮。
 * 只在页面滚动超过一定距离后出现，显隐状态来自 motion 的 showToTop。
 */

import { showToTop, scrollToTop } from '../motion'
</script>

<template>
    <button type="button" class="to-top" :class="{ 'is-active': showToTop }" aria-label="回到顶部"
        @click="scrollToTop">&uarr;</button>
</template>
