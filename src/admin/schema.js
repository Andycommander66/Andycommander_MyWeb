/**
 * 管理界面 schema：用一份声明驱动全部编辑表单。
 * 想新增可编辑字段，只要在这里加一行，界面会自动出现对应输入框。
 *
 * 每个 block：
 *   path   在内容对象里的路径（支持 a.b.c）
 *   label  显示名
 *   group  归到哪个标签页
 *   type   object（单组表单）| string（单个字符串字段）| list（对象数组）| strings（字符串数组）
 *   fields [{ k, l, t }]   t: text（默认）| number | textarea
 *   flat   仅用于零散小字段，会被合并到「其他文案」一张卡里
 */

/**
 * 可自动统计的指标（见 utils/stats.js 的 computeStats）。
 * 数据指标项的「统计指标」下拉框由这里生成——加一个指标只要在这里加一行。
 */
export const METRICS = [
    { k: '', l: '（手填数值）' },
    { k: 'totalAwards', l: '奖项与荣誉总数' },
    { k: 'highLevel', l: '市级及以上奖项' },
    { k: 'provincial', l: '省级赛事入围' },
    { k: 'university', l: '大学阶段奖项' },
    { k: 'qingma', l: '三级培养项数' },
    { k: 'featured', l: '重点荣誉卡片数' },
    { k: 'school', l: '校级荣誉总数' },
    { k: 'titles', l: '校级称号数' },
    { k: 'contests', l: '校级竞赛数' },
    { k: 'current', l: '现任职务与身份' },
    { k: 'experience', l: '经历条数' },
    { k: 'skills', l: '方向与能力条数' },
    { k: 'projects', l: '置顶项目数' },
    { k: 'channels', l: '公开渠道数' },
]

/** 数据指标项共用的字段（首页与荣誉页一致） */
const STAT_FIELDS = [
    { k: 'metric', l: '统计指标（选自动，或留空手填）', t: 'select', options: () => METRICS },
    { k: 'value', l: '手填数值（选了统计指标则忽略）', t: 'number' },
    { k: 'suffix', l: '后缀（如 +）' },
    { k: 'label', l: '说明' },
]
export const groups = [
    { key: 'site', label: '站点' },
    { key: 'home', label: '首页' },
    { key: 'honors', label: '荣誉经历' },
    { key: 'projects', label: '项目' },
    { key: 'contact', label: '联系' },
]

export const blocks = [
    /* ---------- 站点 ---------- */
    {
        group: 'site', path: 'site', label: '站点信息', type: 'object',
        fields: [
            { k: 'name', l: '站点名（用于标题与分享卡片）' },
            { k: 'origin', l: '站点网址（如 https://example.com，供 sitemap 与结构化数据使用）' },
            { k: 'icp', l: '备案号' },
            { k: 'copyright', l: '版权行' },
            { k: 'labName', l: '实验室名称（导航与跳转提示页显示）' },
            { k: 'labUrl', l: '实验室官网地址' },
        ],
    },

    /* ---------- 首页 ---------- */
    {
        group: 'home', path: 'home.tags', label: '身份标签', type: 'list',
        fields: [
            { k: 'text', l: '文字' },
            { k: 'style', l: '配色变量（留空为默认）' },
            { k: 'dot', l: '圆点样式（留空为默认）' },
        ],
    },
    {
        group: 'home', path: 'home.role', label: '角色行', type: 'string',
        field: { l: '文字', t: 'textarea' },
    },
    {
        group: 'home', path: 'home.subtitle', label: '价值主张', type: 'string',
        field: { l: '文字', t: 'textarea' },
    },
    {
        group: 'home', path: 'home.stats', label: '数据指标', type: 'list',
        fields: STAT_FIELDS,
    },
    {
        group: 'home', path: 'home.progress', label: '进度条', type: 'object',
        fields: [
            { k: 'startYear', l: '入学年份（按此自动推进学年与百分比）', t: 'number' },
            { k: 'years', l: '学制年数', t: 'number' },
            { k: 'label', l: '标题模板（可用 {grade} {studyYear} {studyYears} {studyPercent}）' },
        ],
    },
    {
        group: 'home', path: 'home.primaryCta', label: '主按钮', type: 'object',
        fields: [
            { k: 'text', l: '按钮文字' },
            { k: 'to', l: '站内路径（如 /honors）' },
        ],
    },
    {
        group: 'home', path: 'home.secondaryCta', label: '次按钮', type: 'object',
        fields: [
            { k: 'text', l: '按钮文字' },
            { k: 'external', l: '站外地址' },
            { k: 'name', l: '站外站名（跳转提示页显示）' },
        ],
    },

    /* ---------- 荣誉经历 ---------- */
    {
        group: 'honors', path: 'honors.stats', label: '概览数据', type: 'list',
        fields: STAT_FIELDS,
    },
    {
        group: 'honors', path: 'honors.features', label: '重点荣誉', type: 'list',
        fields: [
            { k: 'level', l: '级别标签（决定「市级及以上」的统计口径）' },
            { k: 'date', l: '时间' },
            { k: 'name', l: '名称' },
            { k: 'award', l: '奖项' },
            { k: 'meta', l: '颁发单位' },
            { k: 'provincial', l: '入围省赛（计入「省级赛事入围」）', t: 'bool' },
            { k: 'tagStyle', l: '标签配色变量' },
            { k: 'dot', l: '圆点样式' },
        ],
    },
    {
        group: 'honors', path: 'honors.qingma', label: '青马工程（整行卡片）', type: 'object',
        fields: [
            { k: 'level', l: '级别标签' },
            { k: 'date', l: '时间' },
            { k: 'name', l: '名称' },
            { k: 'award', l: '说明行' },
            { k: 'meta', l: '底部说明' },
        ],
    },
    {
        group: 'honors', path: 'honors.qingma.stages', label: '青马工程 · 阶段明细', type: 'list',
        fields: [
            { k: 'name', l: '阶段名' },
            { k: 'meta', l: '时间与状态' },
        ],
    },
    {
        group: 'honors', path: 'honors.schoolTitles', label: '校级称号', type: 'list',
        fields: [
            { k: 'name', l: '名称' },
            { k: 'date', l: '时间' },
        ],
    },
    {
        group: 'honors', path: 'honors.schoolContests', label: '校级竞赛', type: 'list',
        fields: [
            { k: 'name', l: '名称' },
            { k: 'date', l: '时间' },
        ],
    },
    {
        group: 'honors', path: 'honors.timeline', label: '任职与经历', type: 'list',
        fields: [
            { k: 'date', l: '时间' },
            { k: 'title', l: '标题' },
            { k: 'desc', l: '描述', t: 'textarea' },
        ],
    },
    {
        group: 'honors', path: 'honors.skills', label: '方向与能力', type: 'list',
        fields: [
            { k: 'text', l: '文字' },
            { k: 'style', l: '配色变量' },
            { k: 'dot', l: '圆点样式' },
        ],
    },

    /* ---------- 项目 ---------- */
    {
        group: 'projects', path: 'projects', label: 'GitHub 账号', type: 'object',
        fields: [
            { k: 'githubUser', l: '用户名' },
            { k: 'githubUrl', l: '主页地址' },
        ],
    },
    {
        group: 'projects', path: 'projects.pinned', label: '置顶项目（始终展示）', type: 'list',
        fields: [
            { k: 'name', l: '名称' },
            { k: 'desc', l: '简介', t: 'textarea' },
            { k: 'lang', l: '语言' },
            { k: 'stars', l: 'Star 数', t: 'number' },
            { k: 'updated', l: '时间' },
            { k: 'url', l: '仓库地址' },
        ],
    },
    {
        group: 'projects', path: 'projects.fallback', label: '兜底项目（GitHub 读取失败时）', type: 'list',
        fields: [
            { k: 'name', l: '名称' },
            { k: 'desc', l: '简介', t: 'textarea' },
            { k: 'lang', l: '语言' },
            { k: 'stars', l: 'Star 数', t: 'number' },
            { k: 'updated', l: '时间' },
            { k: 'url', l: '仓库地址' },
        ],
    },

    /* ---------- 联系 ---------- */
    {
        group: 'contact', path: 'contact.channels', label: '公开入口', type: 'list',
        fields: [
            { k: 'name', l: '名称' },
            { k: 'action', l: '右侧动作文字' },
            { k: 'desc', l: '说明', t: 'textarea' },
            { k: 'external', l: '站外地址（填了就走跳转提示页）' },
            { k: 'to', l: '站内路径（如 /honors）' },
        ],
    },
    {
        group: 'contact', path: 'contact.mutedChannel', label: '暂未公开的渠道', type: 'object',
        fields: [
            { k: 'title', l: '标题' },
            { k: 'action', l: '右侧文字' },
            { k: 'desc', l: '说明', t: 'textarea' },
            { k: 'note', l: '底部小字' },
        ],
    },
    {
        group: 'contact', path: 'contact.directions', label: '交流方向', type: 'list',
        fields: [
            { k: 'text', l: '文字' },
            { k: 'style', l: '配色变量' },
            { k: 'dot', l: '圆点样式' },
        ],
    },
    {
        group: 'contact', path: 'contact.notes', label: '本站说明', type: 'strings',
    },

    /* ---------- 其他文案（归到荣誉经历页脚注） ---------- */
    {
        group: 'honors', path: 'honors.featureNote', label: '重点荣誉分组说明', type: 'object',
        fields: [{ k: 'value', l: '文字' }],
        flat: true,
    },
    {
        group: 'honors', path: 'honors.schoolNote', label: '校级荣誉分组说明', type: 'object',
        fields: [{ k: 'value', l: '文字' }],
        flat: true,
    },
    {
        group: 'honors', path: 'honors.schoolTitlesLabel', label: '称号列标题', type: 'object',
        fields: [{ k: 'value', l: '文字' }],
        flat: true,
    },
    {
        group: 'honors', path: 'honors.schoolContestsLabel', label: '竞赛列标题', type: 'object',
        fields: [{ k: 'value', l: '文字' }],
        flat: true,
    },
]

/* ---------- 路径读写 ---------- */

export function getByPath(obj, path) {
    return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}

export function setByPath(obj, path, value) {
    const keys = path.split('.')
    const last = keys.pop()
    const target = keys.reduce((acc, key) => {
        if (acc[key] == null) { acc[key] = {} }
        return acc[key]
    }, obj)
    target[last] = value
}

export function deepClone(value) {
    return JSON.parse(JSON.stringify(value))
}
