/**
 * 站点数据的自动统计。
 *
 * 页面上所有数字（奖项总数、市级及以上、校级若干项……）都由这里算出来，
 * 改完内容不需要再去手工改数字，避免「加了条目忘了改统计」这类不一致。
 *
 * 用法：
 *   const stats = useStats()              // 组件里，响应式
 *   stats.value.totalAwards               // 取某个指标
 *   statValue(item, stats.value)          // 数据指标项 → 实际数字
 *   interpolate('共 {school} 项', stats.value)   // 文案里的 {占位符}
 */
import { computed } from 'vue'
import { state } from '../stores/content'

/**
 * 「市级及以上」的等级判定。
 * 用关键词而不是固定枚举，这样后台把等级写成
 * 「国家级」「省级」「跨省区域级」「市级」都能被认出来。
 */
const HIGH_LEVEL = /国家级|全国|省级|跨省|区域级|市级/

/** 大学阶段单独统计（不计入「市级及以上」） */
const UNIVERSITY_LEVEL = /大学/

/** 现任判定：时间线里带「至今」的条目 */
const ONGOING = /至今/

/** 学制对应的年级称呼 */
const GRADES = ['大一', '大二', '大三', '大四', '大五', '大六']

/**
 * 学年进度。
 * 每年 9 月自动进入新学年，不需要手动改百分比。
 * 未配置 startYear 时回退到手工百分比，兼容旧内容。
 */
function studyStats(progress = {}) {
    const years = Number(progress.years) || 4
    const startYear = Number(progress.startYear)

    if (!startYear) {
        return {
            studyYear: 0,
            studyYears: years,
            studyPercent: Number(progress.percent) || 0,
            grade: '',
        }
    }

    const now = new Date()
    // 9 月及以后算作新学年
    const academicYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
    const studyYear = Math.min(Math.max(academicYear - startYear + 1, 1), years)

    return {
        studyYear,
        studyYears: years,
        studyPercent: Math.round((studyYear / years) * 100),
        grade: GRADES[studyYear - 1] || `第 ${studyYear} 学年`,
    }
}

/**
 * 由内容算出全部可统计指标。
 * 新增指标只要在这里加一行，后台的下拉框会自动出现（见 admin/schema.js 的 METRICS）。
 */
export function computeStats(content) {
    const home = content.home || {}
    const honors = content.honors || {}
    const projects = content.projects || {}
    const contact = content.contact || {}

    const features = honors.features || []
    const titles = honors.schoolTitles || []
    const contests = honors.schoolContests || []
    const timeline = honors.timeline || []
    const skills = honors.skills || []
    const channels = contact.channels || []
    const pinned = projects.pinned || []

    const hasQingma = !!(honors.qingma && honors.qingma.name)

    return Object.assign({
        /* ---------- 奖项与荣誉 ---------- */
        // 总数 = 重点荣誉 + 青马工程 + 校级称号 + 校级竞赛
        totalAwards: features.length + (hasQingma ? 1 : 0) + titles.length + contests.length,
        // 市级及以上（国家级 / 省级 / 跨省区域级 / 市级）
        highLevel: features.filter((f) => HIGH_LEVEL.test(f.level || '')).length,
        // 大学阶段
        university: features.filter((f) => UNIVERSITY_LEVEL.test(f.level || '')).length,
        // 省级赛事入围：条目里显式勾选「入围省赛」
        provincial: features.filter((f) => f.provincial === true).length,
        // 三级培养（青马工程整行卡片）
        qingma: hasQingma ? 1 : 0,
        // 重点荣誉区实际卡片数
        featured: features.length + (hasQingma ? 1 : 0),

        /* ---------- 校级 ---------- */
        titles: titles.length,
        contests: contests.length,
        school: titles.length + contests.length,

        /* ---------- 经历与方向 ---------- */
        // 现任职务与身份：时间线里仍在进行中的
        current: timeline.filter((t) => ONGOING.test(t.date || '')).length,
        experience: timeline.length,
        skills: skills.length,

        /* ---------- 其他 ---------- */
        projects: pinned.length,
        channels: channels.length,
        homeStats: (home.stats || []).length,
    }, studyStats(home.progress))
}

/** 组件里用：const stats = useStats(); stats.value.totalAwards */
export function useStats() {
    return computed(() => computeStats(state.data))
}

/**
 * 取一条数据指标实际要显示的数字。
 * item.metric 指向某个统计指标；没写 metric 就用 item.value 手填的值。
 */
export function statValue(item, stats) {
    if (item && item.metric && stats && item.metric in stats) {
        return Number(stats[item.metric]) || 0
    }
    return Number(item && item.value) || 0
}

/**
 * 把文案里的 {占位符} 换成统计结果。
 * 认不出的占位符原样保留，方便一眼看出写错了。
 */
export function interpolate(template, stats) {
    if (typeof template !== 'string') { return template }
    return template.replace(/\{(\w+)\}/g, (whole, key) => (
        stats && key in stats ? String(stats[key]) : whole
    ))
}
