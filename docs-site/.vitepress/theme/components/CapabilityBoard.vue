<script setup lang="ts">
import { withBase } from 'vitepress';

const messageItems = [
  { name: '文本', note: 'CQ 码 / 消息段' },
  { name: '表情', note: '小黄脸 · 商城表情' },
  { name: '@', note: '群成员 · @全体' },
  { name: '回复', note: '引用指定消息' },
  { name: '图片', note: 'PNG / JPEG / GIF / WebP / BMP' },
  { name: '语音', note: 'SILK / WAV / MP3 → SILK' },
];

const transportItems = [
  { name: 'HTTP API', note: 'token 鉴权 · CORS' },
  { name: '正向 WebSocket', note: '多端点独立配置' },
  { name: '反向 WebSocket', note: '断线自动重连' },
  { name: 'HTTP POST', note: 'HMAC-SHA1 签名' },
  { name: '心跳与生命周期', note: 'meta_event' },
  { name: 'WebUI', note: '登录 · 日志 · 更新' },
];

const laterItems = ['视频 / 文件发送', '合并转发', '群公告', '频道 / Guild'];
</script>

<template>
  <section class="board">
    <div class="shell">
      <header class="section-head">
        <p class="eyebrow">能力清单</p>
        <h2>现在就能用的，写清楚</h2>
        <p class="sub">不玩「理论上支持」：能发的消息段、能开的传输层，都在这里。</p>
      </header>

      <div class="panels">
        <article class="panel">
          <div class="panel-head">
            <span class="tag">消息与媒体</span>
            <span class="count">6 项可用</span>
          </div>
          <ul class="rows">
            <li v-for="item in messageItems" :key="item.name">
              <span class="check" aria-hidden="true">✓</span>
              <span class="name">{{ item.name }}</span>
              <span class="note">{{ item.note }}</span>
            </li>
          </ul>
          <a class="panel-link" :href="withBase('/api/onebot')">消息段与返回码 →</a>
        </article>

        <article class="panel">
          <div class="panel-head">
            <span class="tag">传输与运维</span>
            <span class="count">6 项可用</span>
          </div>
          <ul class="rows">
            <li v-for="item in transportItems" :key="item.name">
              <span class="check" aria-hidden="true">✓</span>
              <span class="name">{{ item.name }}</span>
              <span class="note">{{ item.note }}</span>
            </li>
          </ul>
          <a class="panel-link" :href="withBase('/guide/webui')">WebUI 与自动化接口 →</a>
        </article>
      </div>

      <div class="later">
        <span class="later-label">仍在路上</span>
        <ul>
          <li v-for="item in laterItems" :key="item">{{ item }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.board {
  padding: 56px 24px 12px;
}

.shell {
  max-width: 1040px;
  margin: 0 auto;
}

.section-head {
  max-width: 620px;
  margin: 0 auto 40px;
  text-align: center;
}

.eyebrow {
  margin: 0 0 12px;
  font-size: 11.5px;
  font-weight: 750;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  background: var(--sd-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.section-head h2 {
  margin: 0;
  font-family: var(--sd-font-display);
  font-size: clamp(26px, 3.4vw, 36px);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--sd-ink);
}

.sub {
  margin: 14px 0 0;
  color: var(--sd-muted);
  font-size: 14.5px;
  line-height: 1.78;
}

.panels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.panel {
  padding: 22px 22px 18px;
  border-radius: var(--sd-radius-lg);
  border: 1px solid var(--sd-line-strong);
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.94), rgba(250, 246, 255, 0.88));
  box-shadow: var(--sd-shadow-xs);
}

html.dark .panel {
  background: linear-gradient(165deg, rgba(24, 18, 40, 0.94), rgba(17, 12, 30, 0.9));
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.tag {
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.04em;
  color: var(--sd-violet-deep);
}

html.dark .tag {
  color: var(--vp-c-brand-1);
}

.count {
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(79, 214, 176, 0.14);
  color: #179a76;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

html.dark .count {
  color: #8ff0d3;
}

.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.rows li {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 9px 0;
  border-top: 1px dashed var(--sd-line);
}

.rows li:first-child {
  border-top: none;
}

.check {
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  flex: none;
  border-radius: 6px;
  background: rgba(79, 214, 176, 0.16);
  color: #179a76;
  font-size: 10px;
  font-weight: 800;
  transform: translateY(2px);
}

html.dark .check {
  color: #8ff0d3;
}

.name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--sd-ink);
  white-space: nowrap;
}

.note {
  margin-left: auto;
  color: var(--sd-muted);
  font-size: 12px;
  text-align: right;
}

.panel-link {
  display: inline-block;
  margin-top: 12px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--sd-violet-deep);
  text-decoration: none;
}

html.dark .panel-link {
  color: var(--vp-c-brand-1);
}

.later {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding: 14px 18px;
  border-radius: var(--sd-radius);
  border: 1px dashed var(--sd-line-strong);
  background: rgba(122, 92, 255, 0.04);
}

.later-label {
  font-size: 11.5px;
  font-weight: 750;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sd-muted);
}

.later ul {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.later li {
  padding: 4px 11px;
  border-radius: 999px;
  background: var(--sd-surface);
  border: 1px solid var(--sd-line);
  color: var(--sd-muted);
  font-size: 11.5px;
  font-weight: 600;
}

@media (max-width: 860px) {
  .panels {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .board {
    padding: 40px 18px 6px;
  }

  .panel {
    padding: 18px 16px 14px;
  }

  .note {
    display: none;
  }
}
</style>
