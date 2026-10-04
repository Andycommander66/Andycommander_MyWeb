<script setup>
/**
 * 背景激光线节点网络。
 *
 * 在全站骨架里只渲染一份，路由切换时不重建，所以动画不会中断。
 * 支持鼠标视差、触摸带动与自动漂移；prefers-reduced-motion 下不启动。
 * 尺寸用 ResizeObserver 跟随，避免频繁 resize 造成抖动。
 */

import { onMounted, onUnmounted, ref } from 'vue'

const el = ref(null)

let ctx = null
let raf = 0
let dpr = 1
let W = 0
let H = 0

let nodes = []
let connections = []

let mouseX = 0
let mouseY = 0
let targetX = 0
let targetY = 0
let onScreen = false
let touchActive = false

let time = 0
let autoX = 0
let autoY = 0
let autoTX = 0
let autoTY = 0
let autoTimer = 0

const DEPTH_LAYERS = 3
const PARALLAX = [0.018, 0.045, 0.09]

function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    W = window.innerWidth
    H = window.innerHeight
    const canvas = el.value
    if (!canvas) { return }
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
}

function initNetwork() {
    nodes = []
    connections = []
    const count = window.innerWidth <= 480 ? 22 : (window.innerWidth <= 768 ? 32 : 60)

    for (let i = 0; i < count; i++) {
        const layer = Math.floor(Math.random() * DEPTH_LAYERS)
        nodes.push({
            baseX: Math.random() * W,
            baseY: Math.random() * H,
            x: 0,
            y: 0,
            layer: layer,
            parallax: PARALLAX[layer],
            radius: 0.5 + Math.random() * 1.5,
            alpha: 0.2 + Math.random() * 0.5,
            driftAmp: 0.25 + Math.random() * 0.9,
            driftSpeed: 0.0003 + Math.random() * 0.001,
            driftOffset: Math.random() * Math.PI * 2,
        })
    }

    const connDist = window.innerWidth <= 480 ? 120 : (window.innerWidth <= 768 ? 170 : 240)
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            if (nodes[i].layer !== nodes[j].layer) { continue }
            const dx = nodes[i].baseX - nodes[j].baseX
            const dy = nodes[i].baseY - nodes[j].baseY
            if (Math.sqrt(dx * dx + dy * dy) < connDist) {
                connections.push({
                    from: i,
                    to: j,
                    maxDist: connDist,
                    alpha: 0.10 + Math.random() * 0.28,
                    layer: nodes[i].layer,
                })
            }
        }
    }
}

function animate(ts) {
    time = ts * 0.001

    const smoothing = touchActive ? 0.25 : 0.08
    mouseX += (targetX - mouseX) * smoothing
    mouseY += (targetY - mouseY) * smoothing

    if (!onScreen && !touchActive) {
        autoTimer += 0.016
        if (autoTimer > 4 + Math.random() * 3) {
            autoTimer = 0
            autoTX = (Math.random() - 0.5) * W * 0.35
            autoTY = (Math.random() - 0.5) * H * 0.35
        }
        autoX += (autoTX - autoX) * 0.015
        autoY += (autoTY - autoY) * 0.015
    } else {
        autoX *= 0.9
        autoY *= 0.9
        autoTimer = 0
    }

    const offsetX = (mouseX - W / 2) + autoX
    const offsetY = (mouseY - H / 2) + autoY

    for (const node of nodes) {
        node.x = node.baseX + offsetX * node.parallax + Math.sin(time * node.driftSpeed * 60 + node.driftOffset) * node.driftAmp
        node.y = node.baseY + offsetY * node.parallax + Math.cos(time * node.driftSpeed * 55 + node.driftOffset + 1.3) * node.driftAmp
    }

    ctx.clearRect(0, 0, W, H)

    // 连接线 - 红色系
    for (const conn of connections) {
        const a = nodes[conn.from]
        const b = nodes[conn.to]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const ratio = 1 - Math.min(Math.sqrt(dx * dx + dy * dy) / conn.maxDist, 1)
        const alpha = conn.alpha * ratio * ratio
        if (alpha < 0.012) { continue }

        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        if (conn.layer === 0) {
            ctx.strokeStyle = `rgba(200,100,110,${alpha.toFixed(4)})`
        } else if (conn.layer === 1) {
            ctx.strokeStyle = `rgba(215,120,130,${alpha.toFixed(4)})`
        } else {
            ctx.strokeStyle = `rgba(225,140,150,${(alpha * 1.12).toFixed(4)})`
        }
        ctx.lineWidth = 0.5 + ratio * 0.8
        ctx.stroke()
    }

    // 节点
    for (const node of nodes) {
        const glowAlpha = node.alpha * 0.7
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 3.8)
        if (node.layer === 0) {
            gradient.addColorStop(0, `rgba(190,80,95,${glowAlpha})`)
        } else if (node.layer === 1) {
            gradient.addColorStop(0, `rgba(210,100,115,${glowAlpha})`)
        } else {
            gradient.addColorStop(0, `rgba(225,130,140,${glowAlpha * 1.2})`)
        }
        gradient.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius * 3.8, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = node.layer === 2
            ? `rgba(240,155,165,${node.alpha.toFixed(3)})`
            : `rgba(210,115,125,${(node.alpha * 0.8).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius * 0.7, 0, Math.PI * 2)
        ctx.fill()
    }

    raf = requestAnimationFrame(animate)
}

function onMouseMove(e) {
    targetX = e.clientX
    targetY = e.clientY
    onScreen = true
}
function onMouseLeave() {
    onScreen = false
    targetX = W / 2
    targetY = H / 2
}
function onTouchMove(e) {
    if (!e.touches.length) { return }
    targetX = e.touches[0].clientX
    targetY = e.touches[0].clientY
    touchActive = true
    onScreen = true
}
function onTouchEnd() {
    touchActive = false
    onScreen = false
    targetX = W / 2
    targetY = H / 2
}
function onResize() {
    resize()
    initNetwork()
}

onMounted(() => {
    ctx = el.value.getContext('2d')
    resize()
    initNetwork()

    mouseX = targetX = W / 2
    mouseY = targetY = H / 2

    document.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)

    raf = requestAnimationFrame(animate)
})

onUnmounted(() => {
    cancelAnimationFrame(raf)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseleave', onMouseLeave)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('orientationchange', onResize)
})
</script>

<template>
    <canvas id="laserCanvas" ref="el"></canvas>
</template>
