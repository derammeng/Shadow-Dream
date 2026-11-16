<script setup lang="ts">
import { withBase } from 'vitepress';

const features = [
  {
    title: '不改 QQ 二进制',
    body: '通过 LiteLoaderQQNT 插件进入 QQ 主进程，复用 QQ 自己的登录态与 wrapper session，不修改 wrapper.node，也不注入 DLL。',
    tone: 'violet',
    link: '/guide/introduction',
    linkText: '了解原理',
    icon: 'shield',
  },
  {
    title: 'OneBot 11 全链路',
    body: 'HTTP API、正向 / 反向 WebSocket、HTTP POST、心跳、CQ 码与消息 ID 映射，Koishi、AstrBot 等框架可以直接接入。',
    tone: 'sky',
    link: '/api/onebot',
    linkText: '查看接口',
    icon: 'nodes',
  },
  {
    title: '自带 WebUI',
    body: '扫码 / 密码 / 一键登录，登录过 QQ 后自动恢复账号；账号状态、网络配置、日志、更新和调试台都在一个页面里。',
    tone: 'pink',
    link: '/guide/webui',
    linkText: '控制台说明',
    icon: 'layout',
  },
  {
    title: '图片与语音',
    body: '图片支持 PNG / JPEG / GIF / WebP / BMP，语音支持 SILK / WAV / MP3；本地路径、URL、base64 都能直接发。',
    tone: 'pink',
    link: '/api/onebot',
    linkText: '媒体格式',
    icon: 'media',
  },
  {
    title: '一键启动与更新',
    body: 'Linux / Windows 一键拉起 QQ 与 Shadow Dream；WebUI 或命令行检查更新、下载安装并自动重启，配置和插件 data 保留。',
    tone: 'mint',
    link: '/guide/start',
    linkText: '启动方式',
    icon: 'rocket',
  },
  {
    title: '适合小服务器',
    body: 'Linux + Xvfb 无头运行，配置改完自动重载；核心与插件用 TypeScript 实现，出问题通常能在日志里定位。',
    tone: 'mint',
    link: '/guide/headless',
    linkText: '无头运行',
    icon: 'server',
  },
] as const;
</script>

<template>
  <section class="features">
    <div class="shell">
      <header class="section-head">
        <p class="eyebrow">为什么是影梦</p>
        <h2>把协议端做薄，把体验做厚</h2>
        <p class="sub">不碰二进制边界，所有能力都长在 QQ 自己的 session 上；该有的协议细节一个不少，用起来不烧心。</p>
      </header>

      <div class="grid">
        <article v-for="item in features" :key="item.title" class="card" :class="`tone-${item.tone}`">
          <div class="icon" aria-hidden="true">
            <svg v-if="item.icon === 'shield'" viewBox="0 0 24 24">
              <path d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6l7-3z" />
              <path d="M9 12l2.2 2.2L15.5 10" />
            </svg>
            <svg v-else-if="item.icon === 'nodes'" viewBox="0 0 24 24">
              <circle cx="6" cy="6" r="2.6" />
              <circle cx="18" cy="8" r="2.6" />
              <circle cx="9" cy="18" r="2.6" />
              <path d="M8.2 7.2l7.2 1.1M7.4 8.4l1.1 7.1M16.4 9.7l-5.6 6.6" />
            </svg>
            <svg v-else-if="item.icon === 'layout'" viewBox="0 0 24 24">
              <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
              <path d="M3.5 9.5h17M9 9.5V19.5" />
            </svg>
            <svg v-else-if="item.icon === 'media'" viewBox="0 0 24 24">
              <rect x="3.5" y="5" width="12" height="11" rx="2.6" />
              <path d="M5.6 13.4l2.8-3 2.4 2.5 1.7-1.8 2 2.3" />
              <path d="M18.5 10v6.5M21 12v3" />
            </svg>
            <svg v-else-if="item.icon === 'rocket'" viewBox="0 0 24 24">
              <path d="M13.6 4.6c3.2-1 5.8-1 5.8-1s0 2.6-1 5.8c-1 3.2-3.2 5.6-6.4 7l-2.6-2.6c1.4-3.2 3.8-5.4 7-6.4" />
              <path d="M8.4 13.8l-3.4.7.7-3.4M10.2 15.6l-.7 3.4 3.4-.7" />
            </svg>
            <svg v-else viewBox="0 0 24 24">
              <rect x="3.5" y="4.5" width="17" height="6.5" rx="2.4" />
              <rect x="3.5" y="13.5" width="17" height="6" rx="2.4" />
              <path d="M7 7.7h.01M7 16.6h.01" />
            </svg>
          </div>

          <h3>{{ item.title }}</h3>
          <p>{{ item.body }}</p>

          <a class="more" :href="withBase(item.link)">
            {{ item.linkText }}
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" /></svg>
          </a>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features {
  position: relative;
  padding: 34px 24px 20px;
}

.shell {
  max-width: 1160px;
  margin: 0 auto;
}

.section-head {
  max-width: 660px;
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

.section-head .sub {
  margin: 14px 0 0;
  color: var(--sd-muted);
  font-size: 14.5px;
  line-height: 1.78;
  text-wrap: pretty;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 24px 22px 20px;
  border-radius: var(--sd-radius-lg);
  border: 1px solid var(--sd-line-strong);
  background: linear-gradient(170deg, rgba(255, 255, 255, 0.94), rgba(251, 247, 255, 0.86));
  box-shadow: var(--sd-shadow-xs);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  overflow: hidden;
}

html.dark .card {
  background: linear-gradient(170deg, rgba(24, 18, 40, 0.94), rgba(17, 12, 30, 0.9));
}

.card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0;
  transition: opacity 0.22s ease;
  pointer-events: none;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--sd-shadow-md);
  border-color: var(--sd-lilac);
}

.card:hover::after {
  opacity: 1;
}

.tone-violet::after { background: radial-gradient(320px 180px at 10% 0%, rgba(122, 92, 255, 0.12), transparent 70%); }
.tone-sky::after { background: radial-gradient(320px 180px at 10% 0%, rgba(107, 184, 255, 0.14), transparent 70%); }
.tone-pink::after { background: radial-gradient(320px 180px at 10% 0%, rgba(255, 122, 182, 0.13), transparent 70%); }
.tone-mint::after { background: radial-gradient(320px 180px at 10% 0%, rgba(79, 214, 176, 0.14), transparent 70%); }

.icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  margin-bottom: 16px;
  color: var(--sd-violet-deep);
  background: linear-gradient(150deg, rgba(122, 92, 255, 0.14), rgba(255, 122, 182, 0.12));
  border: 1px solid rgba(122, 92, 255, 0.14);
}

html.dark .icon {
  color: #cbb9ff;
}

.tone-sky .icon {
  color: #1f7fd1;
  background: linear-gradient(150deg, rgba(107, 184, 255, 0.18), rgba(122, 92, 255, 0.1));
  border-color: rgba(107, 184, 255, 0.24);
}

.tone-pink .icon {
  color: #d8448b;
  background: linear-gradient(150deg, rgba(255, 122, 182, 0.18), rgba(255, 184, 214, 0.16));
  border-color: rgba(255, 122, 182, 0.24);
}

.tone-mint .icon {
  color: #179a76;
  background: linear-gradient(150deg, rgba(79, 214, 176, 0.18), rgba(107, 184, 255, 0.12));
  border-color: rgba(79, 214, 176, 0.26);
}

html.dark .tone-sky .icon { color: #8ccdff; }
html.dark .tone-pink .icon { color: #ffa9cd; }
html.dark .tone-mint .icon { color: #8ff0d3; }

.icon svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.card h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: var(--sd-ink);
}

.card p {
  margin: 0 0 16px;
  color: var(--sd-muted);
  font-size: 13.5px;
  line-height: 1.72;
  flex: 1;
}

.more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--sd-violet-deep);
  text-decoration: none;
}

html.dark .more {
  color: var(--vp-c-brand-1);
}

.more svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.18s ease;
}

.more:hover svg {
  transform: translateX(3px);
}

@media (max-width: 1000px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .features {
    padding: 24px 18px 10px;
  }

  .grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .card {
    padding: 20px 18px 18px;
  }
}
</style>
