<script setup>
/**
 * 通用表单控件。
 * 由字段声明里的 t 决定渲染成哪种输入：text / number / textarea / select / bool。
 */
const props = defineProps({
    modelValue: { type: [String, Number, Boolean], default: '' },
    /** 字段说明，显示在控件上方 */
    label: { type: String, default: '' },
    /** text | number | textarea | select | bool */
    type: { type: String, default: 'text' },
    /** select 用：[{ k, l }] */
    options: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

function onInput(e) {
    const raw = e.target.value
    emit('update:modelValue', props.type === 'number' ? (raw === '' ? 0 : Number(raw)) : raw)
}

/** 布尔值用下拉表达，比复选框更贴合表单的纵向排版 */
function onBool(e) {
    emit('update:modelValue', e.target.value === 'true')
}
</script>

<template>
    <label class="af-row">
        <span class="af-label">{{ label }}</span>

        <textarea v-if="type === 'textarea'" class="af-input" rows="3" :value="modelValue"
            @input="onInput"></textarea>

        <select v-else-if="type === 'select'" class="af-input" :value="modelValue" @change="onInput">
            <option v-for="o in options" :key="o.k" :value="o.k">{{ o.l }}</option>
        </select>

        <select v-else-if="type === 'bool'" class="af-input" :value="String(!!modelValue)" @change="onBool">
            <option value="false">否</option>
            <option value="true">是</option>
        </select>

        <input v-else class="af-input" :type="type === 'number' ? 'number' : 'text'" :value="modelValue"
            @input="onInput">
    </label>
</template>

<style scoped>
.af-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.af-label {
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    line-height: 1.5;
    color: var(--text-muted, #9a8a8e);
}

.af-input {
    width: 100%;
    padding: 8px 10px;
    border-radius: 9px;
    border: 1px solid rgba(255, 220, 220, 0.10);
    background: rgba(18, 6, 10, 0.55);
    color: var(--text-primary, #f5f0f1);
    font-family: inherit;
    font-size: 0.82rem;
    letter-spacing: 0.03em;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.af-input:focus {
    outline: none;
    border-color: rgba(230, 120, 130, 0.55);
    box-shadow: 0 0 16px rgba(200, 60, 75, 0.18);
}

textarea.af-input {
    resize: vertical;
    line-height: 1.6;
}

/* 下拉框：跟随站点的深色配色，避免系统默认白底 */
select.af-input {
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
    padding-right: 28px;
    background-image: linear-gradient(45deg, transparent 50%, #c5b8bb 50%),
        linear-gradient(135deg, #c5b8bb 50%, transparent 50%);
    background-position: calc(100% - 15px) 50%, calc(100% - 10px) 50%;
    background-size: 5px 5px, 5px 5px;
    background-repeat: no-repeat;
}

select.af-input option {
    background: #1a0a0e;
    color: #f5f0f1;
}
</style>
