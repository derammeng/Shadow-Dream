<script setup lang="ts">
import { withBase } from 'vitepress';
</script>

<template>
  <section class="cta">
    <div class="shell">
      <div class="card">
        <div class="glow" aria-hidden="true"></div>
        <p class="eyebrow">开始使用</p>
        <h2>把 QQ 变成协议端，<br class="br" />只差一次安装</h2>
        <p class="sub">支持 Windows 与 Linux 无头运行，配置改完自动重载。遇到问题先去排故页看看，绝大多数都能在日志里找到答案。</p>
        <div class="actions">
          <a class="btn primary" :href="withBase('/guide/install')">安装 Shadow Dream</a>
          <a class="btn ghost" :href="withBase('/guide/troubleshooting')">常见问题</a>
        </div>
        <ul class="meta">
          <li>MIT License</li>
          <li>v0.3.0</li>
          <li>OneBot 11</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cta {
  padding: 64px 24px 72px;
}

.shell {
  max-width: 1040px;
  margin: 0 auto;
}

.card {
  position: relative;
  overflow: hidden;
  padding: 52px 28px 46px;
  border-radius: 30px;
  border: 1px solid rgba(122, 92, 255, 0.2);
  background:
    radial-gradient(600px 260px at 50% -10%, rgba(255, 255, 255, 0.65), transparent 70%),
    linear-gradient(135deg, rgba(122, 92, 255, 0.14), rgba(255, 122, 182, 0.14) 55%, rgba(107, 184, 255, 0.14));
  text-align: center;
  box-shadow: var(--sd-shadow-md);
}

html.dark .card {
  border-color: rgba(154, 123, 255, 0.24);
  background:
    radial-gradient(600px 260px at 50% -10%, rgba(154, 123, 255, 0.16), transparent 70%),
    linear-gradient(135deg, rgba(122, 92, 255, 0.18), rgba(255, 122, 182, 0.14) 55%, rgba(107, 184, 255, 0.12));
}

.glow {
  position: absolute;
  width: 420px;
  height: 420px;
  left: 50%;
  top: -260px;
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8), transparent 65%);
  filter: blur(30px);
  pointer-events: none;
}

html.dark .glow {
  background: radial-gradient(circle, rgba(196, 176, 255, 0.35), transparent 65%);
}

.eyebrow {
  position: relative;
  margin: 0 0 14px;
  font-size: 11.5px;
  font-weight: 750;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sd-violet-deep);
}

html.dark .eyebrow {
  color: #cbb9ff;
}

h2 {
  position: relative;
  margin: 0;
  font-family: var(--sd-font-display);
  font-size: clamp(26px, 3.6vw, 40px);
  font-weight: 820;
  line-height: 1.22;
  letter-spacing: -0.03em;
  color: var(--sd-ink);
  text-wrap: balance;
}

.sub {
  position: relative;
  max-width: 560px;
  margin: 16px auto 0;
  color: var(--sd-ink-2);
  font-size: 14.5px;
  line-height: 1.78;
}

.actions {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 28px;
}

.btn {
  display: inline-flex;
  align-items: center;
  height: 46px;
  padding: 0 24px;
  border-radius: 999px;
  font-size: 14.5px;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.btn.primary {
  color: #fff;
  background: var(--sd-gradient);
  box-shadow: 0 16px 34px -12px rgba(122, 92, 255, 0.65);
}

.btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 40px -12px rgba(122, 92, 255, 0.75);
}

.btn.ghost {
  color: var(--sd-ink);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid var(--sd-line-strong);
}

html.dark .btn.ghost {
  background: rgba(23, 17, 40, 0.72);
}

.btn.ghost:hover {
  transform: translateY(-2px);
  border-color: var(--sd-lilac);
}

.meta {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 18px;
  margin: 26px 0 0;
  padding: 0;
  list-style: none;
  color: var(--sd-muted);
  font-size: 11.5px;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.meta li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta li + li::before {
  content: "";
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--sd-lilac);
}

@media (max-width: 640px) {
  .cta {
    padding: 44px 18px 52px;
  }

  .card {
    padding: 38px 20px 34px;
    border-radius: 24px;
  }
}
</style>
