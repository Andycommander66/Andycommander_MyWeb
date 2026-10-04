<script setup>
/**
 * 预览模式浮条。
 *
 * 只在管理员点了「预览效果」后出现：此时全站展示的是未保存的草稿，
 * 这根条子始终提醒当前状态，并可随时保存、返回编辑或退出预览。
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { saveContent, state, stopPreview } from '../stores/content'

/**
 * 预览模式浮条。
 * 只在管理员点了「预览」后出现：此时全站展示的是未保存的草稿，
 * 这根条子始终提醒当前状态，并随时可以保存或退出。
 */
const router = useRouter()
const busy = ref(false)
const note = ref('')

async function save() {
    busy.value = true
    note.value = ''
    try {
        await saveContent()
        // 保存成功后 previewing 已被清除，浮条自动消失
    } catch (e) {
        note.value = e.message
    } finally {
        busy.value = false
    }
}

function backToEdit() {
    // 管理页会在挂载时自动退出预览，这里直接跳回去即可
    router.push('/admin')
}
</script>

<template>
    <Transition name="pv">
        <div v-if="state.previewing" class="preview-bar" role="status">
            <span class="preview-tag"><span class="preview-dot"></span> 预览模式</span>
            <span class="preview-text">正在预览<strong>未保存</strong>的修改</span>

            <span v-if="note" class="preview-note">{{ note }}</span>

            <div class="preview-actions">
                <button type="button" :disabled="busy" @click="save">{{ busy ? '保存中…' : '保存' }}</button>
                <button type="button" :disabled="busy" @click="backToEdit">返回编辑</button>
                <button type="button" class="ghost" :disabled="busy" @click="stopPreview">退出预览</button>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.preview-bar {
    position: fixed;
    top: 74px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 55;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: calc(100% - 32px);
    padding: 9px 16px;
    border-radius: 999px;
    border: 1px solid rgba(230, 120, 130, 0.32);
    background: rgba(26, 9, 13, 0.94);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 14px 34px rgba(50, 8, 14, 0.5), 0 0 0 1px rgba(255, 220, 225, 0.04) inset;
}

.preview-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 11px;
    border-radius: 999px;
    border: 1px solid rgba(200, 80, 95, 0.4);
    background: rgba(180, 50, 60, 0.24);
    color: #f0b0b6;
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    white-space: nowrap;
}

.preview-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #f0a0a8;
    box-shadow: 0 0 8px rgba(240, 140, 150, 0.9);
    animation: previewPulse 1.8s ease-in-out infinite;
}

@keyframes previewPulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.35;
    }
}

.preview-text {
    font-size: 0.76rem;
    color: #d6c8cb;
    letter-spacing: 0.04em;
    white-space: nowrap;
}

.preview-text strong {
    color: #f0b0b6;
    font-weight: 600;
}

.preview-note {
    font-size: 0.74rem;
    color: #ff9a9a;
}

.preview-actions {
    display: flex;
    gap: 7px;
}

.preview-actions button {
    padding: 5px 13px;
    border-radius: 999px;
    border: 1px solid rgba(230, 120, 130, 0.35);
    background: rgba(200, 55, 70, 0.22);
    color: #ffeef0;
    font-family: inherit;
    font-size: 0.74rem;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: all 0.35s ease;
    white-space: nowrap;
}

.preview-actions button:hover:not(:disabled) {
    border-color: rgba(240, 140, 150, 0.6);
    background: rgba(210, 65, 80, 0.32);
}

.preview-actions button.ghost {
    background: transparent;
    border-color: rgba(255, 210, 215, 0.14);
    color: #c5b8bb;
}

.preview-actions button.ghost:hover:not(:disabled) {
    border-color: rgba(230, 140, 150, 0.45);
    color: #f0c0c6;
}

.preview-actions button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.preview-actions button:focus-visible {
    outline: 2px solid rgba(232, 140, 150, 0.65);
    outline-offset: 2px;
}

/* 进出场 */
.pv-enter-active,
.pv-leave-active {
    transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.pv-enter-from,
.pv-leave-to {
    opacity: 0;
    transform: translate(-50%, -10px);
}

@media (max-width: 768px) {
    .preview-bar {
        top: 62px;
        gap: 8px 10px;
        padding: 8px 12px;
        border-radius: 18px;
    }

    .preview-text {
        font-size: 0.72rem;
    }
}

@media (prefers-reduced-motion: reduce) {

    .preview-dot {
        animation: none;
    }

    .pv-enter-active,
    .pv-leave-active {
        transition: none;
    }
}
</style>
