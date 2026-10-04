/**
 * 路由表与页面标题。
 *
 * 两个约定：
 *   · 标题统一为「Andycommander66 · 页面名」，由一个函数生成，不各写各的
 *   · 路由模式与 robots/sitemap 共用构建变量 __URL_MODE__，三处不会错位
 *
 * meta 里还带着逐页 description 与 noindex 标记，由 utils/seo.js 读取。
 */

import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'

/* 标题统一格式：Andycommander66 · 页面名
   一个分隔符、一种顺序，各路由保持一致 */
const SITE = 'Andycommander66'
const title = (page) => `${SITE} · ${page}`

/**
 * 路由模式与 robots/sitemap 共用同一个构建变量（见 vite.config.js），
 * 三处不会各说各话：
 *   history —— 默认。地址干净、利于收录；需要服务端把未命中路径回退到 index.html
 *              （用 server/index.js 时已内置；纯静态托管需自己配一条规则）
 *   hash    —— 构建时设 VITE_ROUTER_MODE=hash。静态托管零配置，但片段不参与收录
 */
const URL_MODE = typeof __URL_MODE__ === 'undefined' ? 'history' : __URL_MODE__

const routes = [
    {
        path: '/',
        name: 'home',
        component: () => import('../views/HomeView.vue'),
        meta: {
            title: title('个人主页'),
            description: 'Andycommander66 的个人主页：计算机科学与技术专业在读，IPET 智能光电技术实验室成员，记录科研、竞赛与工程实践中的成长与荣誉。',
            canonical: '/',
        },
    },
    {
        path: '/projects',
        name: 'projects',
        component: () => import('../views/ProjectsView.vue'),
        meta: {
            title: title('项目'),
            description: 'Andycommander66 的项目：课程作业、竞赛作品与自用工具。仓库列表直接读取 GitHub 公开主页，按最近提交排序。',
            canonical: '/projects',
        },
    },
    {
        path: '/honors',
        name: 'honors',
        component: () => import('../views/HonorsView.vue'),
        meta: {
            title: title('荣誉经历'),
            description: 'Andycommander66 的荣誉与经历：竞赛获奖、任职情况、「青马工程」三级培养与 IPET 智能光电技术实验室的科研经历。',
            canonical: '/honors',
        },
    },
    {
        path: '/contact',
        name: 'contact',
        component: () => import('../views/ContactView.vue'),
        meta: {
            title: title('联系方式'),
            description: 'Andycommander66 的联系方式与开放交流方向：竞赛组队、数学建模、C/C++ 工程实践与智能光电方向的学习交流。',
            canonical: '/contact',
        },
    },
    {
        path: '/admin',
        name: 'admin',
        component: () => import('../views/AdminView.vue'),
        meta: { title: title('内容管理'), noindex: true },
    },
    {
        path: '/leaving',
        name: 'leaving',
        component: () => import('../views/LeavingView.vue'),
        meta: { title: title('即将离开本站'), noindex: true },
    },
    {
        path: '/404',
        name: 'notfound',
        component: () => import('../views/NotFoundView.vue'),
        meta: { title: title('页面未找到'), noindex: true },
    },
    {
        // 未知路径一并落到 404 视图
        path: '/:pathMatch(.*)*',
        component: () => import('../views/NotFoundView.vue'),
        meta: { title: title('页面未找到'), noindex: true },
    },
]

const router = createRouter({
    history: URL_MODE === 'hash' ? createWebHashHistory() : createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) { return savedPosition }
        if (to.hash) { return { el: to.hash, behavior: 'smooth', top: 96 } }
        return { top: 0 }
    },
})

router.afterEach((to) => {
    if (to.meta && to.meta.title) {
        document.title = to.meta.title
    }
})

export default router
