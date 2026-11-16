<script setup lang="ts">
import { withBase } from 'vitepress';
</script>

<template>
  <section class="hero">
    <div class="hero-decor" aria-hidden="true">
      <span class="blob blob-a"></span>
      <span class="blob blob-b"></span>
      <span class="blob blob-c"></span>
      <span class="dots"></span>
    </div>

    <div class="shell">
      <p class="badge">
        <span class="badge-dot"></span>
        v0.3.0 · 图片 / 语音发送已支持
      </p>

      <h1 class="title">把 QQ 接进<br /><span class="gradient-text">OneBot 11</span> 的梦</h1>

      <p class="lead">插件跑在 QQ 主进程里，复用已有登录态。HTTP、WebSocket、WebUI、图片语音、配置自动重载，一次安装全部就绪。</p>

      <div class="actions">
        <a class="btn btn-primary" :href="withBase('/guide/introduction')">
          快速开始
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" /></svg>
        </a>
        <a class="btn btn-ghost" :href="withBase('/guide/install')">安装指南</a>
        <a
          class="btn btn-text"
          href="https://github.com/derammeng/Shadow-Dream"
          target="_blank"
          rel="noreferrer"
        >GitHub ↗</a>
      </div>

      <ul class="chips">
        <li>不改 wrapper.node</li>
        <li>Koishi / AstrBot 兼容</li>
        <li>Linux 无头运行</li>
      </ul>

      <div class="terminal-wrap">
        <div class="terminal">
          <div class="terminal-bar">
            <span class="light red"></span>
            <span class="light amber"></span>
            <span class="light green"></span>
            <span class="terminal-name">start-shadowdream.sh</span>
            <span class="terminal-tag">live</span>
          </div>

          <div class="terminal-body">
            <p class="line prompt"><span class="sigil">$</span> bash start-shadowdream.sh</p>
            <p class="line ok"><span class="tick">✔</span> QQ 已登录 · 3753172731</p>
            <p class="line muted">启动 Xvfb + QQ，等待 WebUI 就绪…</p>
            <p class="line">
              <span class="key">Shadow Dream</span>
              <span class="value">已就绪 · v0.3.0</span>
            </p>
            <p class="line"><span class="key">HTTP API</span><span class="value">http://127.0.0.1:3000</span></p>
            <p class="line"><span class="key">WebSocket</span><span class="value">ws://127.0.0.1:3001</span></p>
            <p class="line"><span class="key">WebUI</span><span class="value">http://127.0.0.1:3000/webui/</span></p>
            <p class="line ok"><span class="tick">✔</span> Koishi 已连接 · 文本 / 图片 / 语音可发送</p>
          </div>
        </div>

        <div class="float-card float-a">
          <strong>图片 · 语音</strong>
          <span>PNG / GIF / SILK · WAV · MP3</span>
        </div>
        <div class="float-card float-b">
          <strong>OneBot 11</strong>
          <span>HTTP · 正向 / 反向 WS</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  padding: 76px 24px 40px;
}

.shell {
  position: relative;
  z-index: 1;
  max-width: 980px;
  margin: 0 auto;
  text-align: center;
}

.hero-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* 底部渐隐，避免渐变在 hero 边界上出现一条硬边。 */
  mask-image: linear-gradient(180deg, #000 0%, #000 58%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 58%, transparent 100%);
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.75;
}

.blob-a {
  width: 460px;
  height: 460px;
  left: -140px;
  top: -120px;
  background: radial-gradient(circle, rgba(122, 92, 255, 0.38), transparent 68%);
}

.blob-b {
  width: 520px;
  height: 520px;
  right: -180px;
  top: -160px;
  background: radial-gradient(circle, rgba(255, 122, 182, 0.34), transparent 68%);
}

.blob-c {
  width: 420px;
  height: 420px;
  left: 38%;
  top: 260px;
  background: radial-gradient(circle, rgba(107, 184, 255, 0.26), transparent 70%);
}

.dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(122, 92, 255, 0.16) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: radial-gradient(520px 320px at 50% 0%, #000 20%, transparent 78%);
  -webkit-mask-image: radial-gradient(520px 320px at 50% 0%, #000 20%, transparent 78%);
  opacity: 0.6;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 22px;
  padding: 7px 15px 7px 11px;
  border-radius: 999px;
  border: 1px solid var(--sd-line-strong);
  background: rgba(255, 255, 255, 0.72);
  color: var(--sd-ink-2);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow: var(--sd-shadow-xs);
  backdrop-filter: blur(8px);
}

html.dark .badge {
  background: rgba(23, 17, 40, 0.72);
}

.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sd-gradient);
  box-shadow: 0 0 0 4px rgba(122, 92, 255, 0.12);
}

.title {
  margin: 0;
  font-family: var(--sd-font-display);
  font-size: clamp(38px, 6.2vw, 68px);
  font-weight: 820;
  line-height: 1.12;
  letter-spacing: -0.035em;
  color: var(--sd-ink);
  text-wrap: balance;
}

.gradient-text {
  background: var(--sd-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  padding-right: 0.06em;
}

.lead {
  max-width: 620px;
  margin: 22px auto 0;
  color: var(--sd-muted);
  font-size: 16px;
  line-height: 1.78;
  text-wrap: pretty;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 30px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 22px;
  border-radius: 999px;
  font-size: 14.5px;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease,
    border-color 0.18s ease, color 0.18s ease;
}

.btn svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.18s ease;
}

.btn-primary {
  color: #fff;
  background: var(--sd-gradient);
  box-shadow: 0 14px 30px rgba(122, 92, 255, 0.32);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 38px rgba(122, 92, 255, 0.4);
}

.btn-primary:hover svg {
  transform: translateX(3px);
}

.btn-ghost {
  color: var(--sd-ink);
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid var(--sd-line-strong);
  box-shadow: var(--sd-shadow-xs);
}

html.dark .btn-ghost {
  background: rgba(23, 17, 40, 0.86);
}

.btn-ghost:hover {
  transform: translateY(-2px);
  border-color: var(--sd-lilac);
  box-shadow: var(--sd-shadow-sm);
}

.btn-text {
  color: var(--sd-muted);
  padding: 0 10px;
}

.btn-text:hover {
  color: var(--sd-violet-deep);
}

html.dark .btn-text:hover {
  color: var(--vp-c-brand-1);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin: 26px 0 0;
  padding: 0;
  list-style: none;
}

.chips li {
  padding: 6px 13px;
  border-radius: 999px;
  border: 1px dashed var(--sd-line-strong);
  color: var(--sd-muted);
  font-size: 12px;
  font-weight: 600;
}

.terminal-wrap {
  position: relative;
  margin: 54px auto 0;
  max-width: 780px;
}

.terminal {
  position: relative;
  border-radius: 22px;
  border: 1px solid rgba(122, 92, 255, 0.22);
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.96), rgba(248, 243, 255, 0.94));
  box-shadow: 0 32px 70px -24px rgba(64, 40, 140, 0.42), 0 2px 0 rgba(255, 255, 255, 0.7) inset;
  overflow: hidden;
  text-align: left;
}

html.dark .terminal {
  background: linear-gradient(165deg, rgba(26, 19, 44, 0.96), rgba(18, 13, 32, 0.96));
  border-color: rgba(154, 123, 255, 0.28);
  box-shadow: 0 32px 70px -24px rgba(0, 0, 0, 0.8), 0 1px 0 rgba(255, 255, 255, 0.05) inset;
}

.terminal::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: var(--sd-gradient);
  opacity: 0.35;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.terminal-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--sd-line);
  background: rgba(122, 92, 255, 0.04);
}

.light {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.light.red { background: #ff8fa3; }
.light.amber { background: #ffd479; }
.light.green { background: #7ee2b8; }

.terminal-name {
  margin-left: 8px;
  color: var(--sd-muted);
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  letter-spacing: 0.02em;
}

.terminal-tag {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(79, 214, 176, 0.16);
  color: #1f9c78;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

html.dark .terminal-tag {
  color: #7fe7c4;
}

.terminal-body {
  padding: 18px 20px 20px;
  font-family: var(--vp-font-family-mono);
  font-size: 12.8px;
  line-height: 1.95;
}

.line {
  display: flex;
  flex-wrap: wrap;
  gap: 0 10px;
  margin: 0;
  color: var(--sd-ink-2);
  white-space: pre-wrap;
  word-break: break-word;
}

.line .sigil {
  color: var(--sd-pink);
  font-weight: 700;
}

.line .tick {
  color: #21b98b;
  font-weight: 700;
}

.line .key {
  min-width: 96px;
  color: var(--sd-violet-deep);
  font-weight: 600;
}

html.dark .line .key {
  color: #c3b0ff;
}

.line .value {
  color: var(--sd-muted);
}

.line.muted {
  color: var(--sd-muted);
  opacity: 0.85;
}

.float-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 178px;
  padding: 11px 15px;
  border-radius: 14px;
  border: 1px solid var(--sd-line-strong);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--sd-shadow-md);
  backdrop-filter: blur(10px);
  text-align: left;
  animation: float 7s ease-in-out infinite;
}

html.dark .float-card {
  background: rgba(23, 17, 40, 0.92);
}

.float-card strong {
  font-size: 12.5px;
  font-weight: 750;
  color: var(--sd-ink);
}

.float-card span {
  font-size: 11px;
  color: var(--sd-muted);
}

.float-a {
  left: calc(100% + 24px);
  top: 42px;
  animation-delay: -1.4s;
}

.float-b {
  right: calc(100% + 24px);
  bottom: 38px;
  animation-delay: -3.6s;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-9px); }
}

@media (max-width: 1200px) {
  .float-card { display: none; }
}

@media (max-width: 768px) {
  .hero {
    padding: 48px 18px 20px;
  }

  .lead {
    font-size: 14.5px;
  }

  .actions {
    gap: 10px;
  }

  .btn {
    height: 44px;
    padding: 0 18px;
    font-size: 14px;
  }

  .terminal-body {
    font-size: 11.6px;
    padding: 14px 14px 16px;
  }

  .line .key {
    min-width: 82px;
  }

  .chips li {
    font-size: 11.5px;
  }
}
</style>
