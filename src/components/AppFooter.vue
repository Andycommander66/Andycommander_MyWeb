<script setup>
/**
 * 页脚，两种形态：
 *   floating —— 首页 / 404 用，绝对定位在整屏容器底部
 *   static   —— 长页面用，跟随内容排在末尾
 *
 * 备案号刻意保持直链（工信部合规查询入口，不必再经中转提示页）。
 */

import { useContent } from '../stores/content'

/**
 * 页脚：两种形态
 *  - floating：首页 / 404 用，绝对定位在整屏容器底部（原 .scroll-indicator）
 *  - static  ：长页面用，跟随内容排在末尾（原 .page-footer）
 */
defineProps({
    variant: {
        type: String,
        default: 'static',
        validator: (v) => ['static', 'floating'].includes(v),
    },
})

const content = useContent()
</script>

<template>
    <footer :class="variant === 'floating' ? 'scroll-indicator' : 'page-footer'">
        <div class="scroll-line"></div>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" class="scroll-text">{{ content.site.icp }}</a>
        <span class="scroll-text scroll-text-plain">{{ content.site.copyright }}</span>
    </footer>
</template>
