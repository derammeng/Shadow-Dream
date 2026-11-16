<script setup lang="ts">
const steps = [
  {
    no: '01',
    title: '安装',
    body: '下载精简安装包，或从源码构建；需要 Linux / Windows 上已经装好 QQ。',
    code: 'bash install.sh',
    time: '约 1 分钟',
  },
  {
    no: '02',
    title: '启动',
    body: '一键脚本会找 QQ、起 Xvfb（Linux 无头）、等 WebUI 就绪并打印地址与 token。',
    code: 'bash start-shadowdream.sh',
    time: '约 20 秒',
  },
  {
    no: '03',
    title: '连接',
    body: '把 Koishi / AstrBot 或任意 OneBot 11 SDK 指向 HTTP 或 WebSocket，就可以开始收发消息。',
    code: 'ws://127.0.0.1:3001',
    time: '即时',
  },
] as const;
</script>

<template>
  <section class="steps">
    <div class="shell">
      <header class="section-head">
        <p class="eyebrow">三步接入</p>
        <h2>装好就能用，不用先读源码</h2>
        <p class="sub">从零到收到第一条 QQ 消息，通常不超过一次泡面的时间。</p>
      </header>

      <ol class="list">
        <li v-for="step in steps" :key="step.no" class="step">
          <div class="rail" aria-hidden="true">
            <span class="num">{{ step.no }}</span>
          </div>
          <div class="content">
            <div class="head">
              <h3>{{ step.title }}</h3>
              <span class="time">{{ step.time }}</span>
            </div>
            <p>{{ step.body }}</p>
            <code class="snippet">{{ step.code }}</code>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.steps {
  padding: 54px 24px 10px;
}

.shell {
  max-width: 1040px;
  margin: 0 auto;
}

.section-head {
  max-width: 620px;
  margin: 0 auto 42px;
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

.list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  display: flex;
  gap: 18px;
  padding: 22px 24px;
  border-radius: var(--sd-radius-lg);
  border: 1px solid var(--sd-line-strong);
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.94), rgba(250, 246, 255, 0.88));
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

html.dark .step {
  background: linear-gradient(120deg, rgba(24, 18, 40, 0.94), rgba(17, 12, 30, 0.9));
}

.step:hover {
  border-color: var(--sd-lilac);
  box-shadow: var(--sd-shadow-sm);
  transform: translateY(-2px);
}

.rail {
  flex: none;
  padding-top: 2px;
}

.num {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--sd-gradient);
  box-shadow: 0 12px 24px -10px rgba(122, 92, 255, 0.7);
}

.content {
  min-width: 0;
  flex: 1;
}

.head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.head h3 {
  margin: 0;
  font-size: 16.5px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: var(--sd-ink);
}

.time {
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(122, 92, 255, 0.1);
  color: var(--sd-violet-deep);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

html.dark .time {
  color: #cbb9ff;
  background: rgba(154, 123, 255, 0.16);
}

.content p {
  margin: 8px 0 12px;
  color: var(--sd-muted);
  font-size: 13.5px;
  line-height: 1.72;
}

.snippet {
  display: inline-block;
  padding: 7px 12px;
  border-radius: 9px;
  border: 1px solid var(--sd-line);
  background: rgba(122, 92, 255, 0.06);
  color: var(--sd-ink-2);
  font-family: var(--vp-font-family-mono);
  font-size: 12.2px;
  white-space: pre-wrap;
  word-break: break-all;
}

html.dark .snippet {
  background: rgba(154, 123, 255, 0.1);
  color: var(--sd-ink-2);
}

@media (max-width: 640px) {
  .steps {
    padding: 40px 18px 6px;
  }

  .step {
    padding: 18px 16px;
    gap: 14px;
  }

  .num {
    width: 40px;
    height: 40px;
    border-radius: 13px;
    font-size: 13px;
  }
}
</style>
