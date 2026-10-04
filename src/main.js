/**
 * 应用入口。
 *
 * 顺序有讲究：
 *   1. 先挂载应用（此时用的是内置默认内容，首屏零等待）
 *   2. 再异步拉取后端内容，回来后原地替换、页面自动更新
 *
 * 样式必须按 base → motion → responsive 引入：后者是最终生效层。
 */

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { installMotion } from './motion'
import { loadContent } from './stores/content'

import './styles/base.css'
import './styles/motion.css'
import './styles/responsive.css'

const app = createApp(App)

app.use(router)
installMotion(app)

app.mount('#app')

// 先用内置默认内容渲染（首屏零等待），再异步拉取后端内容
loadContent()
