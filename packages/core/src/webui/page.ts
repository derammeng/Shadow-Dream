/**
 * 无构建依赖的控制台页面。所有资源都内联，方便插件打包后直接运行。
 */
export const WEBUI_CSS = `
:root {
  color-scheme: light;
  --bg: #fdfbff;
  --surface: #ffffff;
  --surface-2: #fbf8ff;
  --panel-grad: linear-gradient(170deg, #ffffff, #fdfaff);
  --side-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(251, 248, 255, 0.82));
  --bar-bg: rgba(255, 255, 255, 0.86);
  --input-bg: #ffffff;
  --line: #efe9fa;
  --line-strong: #e2d8f5;
  --text: #211a33;
  --text-2: #4c4466;
  --muted: #7b7394;
  --accent: #6a4bf5;
  --accent-2: #b06bff;
  --accent-3: #ff7ab6;
  --accent-soft: rgba(122, 92, 255, 0.1);
  --gradient: linear-gradient(118deg, #7a5cff 0%, #b06bff 42%, #ff7ab6 100%);
  --gradient-soft: linear-gradient(118deg, rgba(122, 92, 255, 0.12), rgba(255, 122, 182, 0.12));
  --good: #1f9c78;
  --warn: #c9821a;
  --bad: #d8446f;
  --shadow-xs: 0 1px 2px rgba(33, 26, 51, 0.04);
  --shadow-sm: 0 6px 18px rgba(33, 26, 51, 0.06);
  --shadow-md: 0 18px 44px rgba(60, 40, 120, 0.1);
  --shadow-lg: 0 32px 80px rgba(60, 40, 120, 0.16);
  --glow-a: rgba(255, 122, 182, 0.12);
  --glow-b: rgba(122, 92, 255, 0.12);
  --hero-grad:
    radial-gradient(360px 160px at 0% 0%, rgba(255, 122, 182, 0.16), transparent 70%),
    radial-gradient(320px 150px at 100% 100%, rgba(107, 184, 255, 0.14), transparent 72%),
    linear-gradient(150deg, #ffffff, #fbf7ff);
  --ws-grad: linear-gradient(170deg, #ffffff, #fbf7ff);
  --result-bg: #f7f3ff;
  --switch-off: #e4dcf3;
  --overlay: rgba(33, 26, 51, 0.42);
  --banner-bg: rgba(255, 214, 178, 0.28);
  --banner-border: rgba(201, 130, 26, 0.3);
  --banner-text: #8a5510;
  --toast-bg: #211a33;
  --toast-text: #f6f1ff;
  --log-bg: #171130;
  --log-text: #d8d0ee;
  --log-time: #7c7396;
  --log-scope: #9a8fbe;
  --log-msg: #ddd5f2;
  --log-info: #a6f0d3;
  --log-debug: #8fd8f6;
  --log-warn: #f0b45f;
  --log-error: #ff8aa9;
  --mono: "JetBrains Mono", "Cascadia Code", ui-monospace, SFMono-Regular, Menlo, monospace;
  --display: "Inter", "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
}

html.dark {
  color-scheme: dark;
  --bg: #0d0a17;
  --surface: #171128;
  --surface-2: #120d20;
  --panel-grad: linear-gradient(170deg, #191228, #140f22);
  --side-bg: linear-gradient(180deg, rgba(23, 17, 40, 0.94), rgba(18, 13, 32, 0.86));
  --bar-bg: rgba(23, 17, 40, 0.86);
  --input-bg: #140f22;
  --line: #2a2242;
  --line-strong: #372d55;
  --text: #f6f1ff;
  --text-2: #cfc6e6;
  --muted: #948cab;
  --accent: #b9a3ff;
  --accent-2: #c58bff;
  --accent-3: #ff92c4;
  --accent-soft: rgba(154, 123, 255, 0.16);
  --gradient: linear-gradient(118deg, #9a7bff 0%, #c58bff 42%, #ff92c4 100%);
  --gradient-soft: linear-gradient(118deg, rgba(154, 123, 255, 0.2), rgba(255, 146, 196, 0.16));
  --good: #5ee0b4;
  --warn: #f0b45f;
  --bad: #ff8aa9;
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-sm: 0 6px 18px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 18px 44px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 32px 80px rgba(0, 0, 0, 0.6);
  --glow-a: rgba(255, 122, 182, 0.14);
  --glow-b: rgba(122, 92, 255, 0.18);
  --hero-grad:
    radial-gradient(360px 160px at 0% 0%, rgba(255, 122, 182, 0.16), transparent 70%),
    radial-gradient(320px 150px at 100% 100%, rgba(107, 184, 255, 0.12), transparent 72%),
    linear-gradient(150deg, #1a132c, #151026);
  --ws-grad: linear-gradient(170deg, #191228, #140f22);
  --result-bg: #140f22;
  --switch-off: #372d55;
  --overlay: rgba(4, 2, 10, 0.62);
  --banner-bg: rgba(201, 130, 26, 0.16);
  --banner-border: rgba(240, 180, 95, 0.32);
  --banner-text: #f0b45f;
  --toast-bg: #f6f1ff;
  --toast-text: #171128;
  --log-bg: #100b1e;
  --log-text: #ddd5f2;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; min-height: 100%; }
body {
  background:
    radial-gradient(1000px 560px at 92% -8%, var(--glow-a), transparent 62%),
    radial-gradient(820px 520px at 4% 0%, var(--glow-b), transparent 60%),
    var(--bg);
  background-attachment: fixed;
  color: var(--text);
  font-family: var(--display);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.2s ease, color 0.2s ease;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
button, input, select, textarea { font: inherit; }
::selection { background: rgba(255, 122, 182, 0.24); }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 99px; border: 2px solid transparent; background-clip: padding-box; }
::-webkit-scrollbar-track { background: transparent; }
:focus-visible { outline: 2px solid rgba(122, 92, 255, 0.55); outline-offset: 2px; border-radius: 8px; }
.hidden { display: none !important; }

/* ============ 布局 ============ */
.app { display: grid; grid-template-columns: 252px minmax(0, 1fr); min-height: 100vh; }
.sidebar {
  position: sticky; top: 0; height: 100vh; padding: 22px 16px 18px;
  border-right: 1px solid var(--line);
  background: var(--side-bg);
  backdrop-filter: blur(14px);
  display: flex; flex-direction: column; gap: 22px;
}

/* ============ 品牌 ============ */
.brand { display: flex; gap: 12px; align-items: center; padding: 0 6px; }
.logo {
  width: 40px; height: 40px; border-radius: 13px; position: relative; flex: none;
  background: var(--gradient);
  box-shadow: 0 10px 24px rgba(122, 92, 255, 0.3);
}
.logo::after {
  content: ""; position: absolute; inset: 9px; border-radius: 50%;
  background: #fff; opacity: 0.96;
  -webkit-mask: radial-gradient(circle at 64% 36%, transparent 40%, #000 43%);
  mask: radial-gradient(circle at 64% 36%, transparent 40%, #000 43%);
}
.brand h1 { font-size: 12.5px; letter-spacing: 0.1em; margin: 0; font-weight: 800; line-height: 1.35; color: var(--text); }
.brand p { margin: 2px 0 0; color: var(--muted); font-size: 11px; }

/* ============ 导航 ============ */
.nav { display: flex; flex-direction: column; gap: 4px; }
.nav-item {
  border: 1px solid transparent; background: transparent; color: var(--text-2);
  text-align: left; padding: 9px 12px; border-radius: 11px; cursor: pointer;
  display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600;
  transition: color 0.16s ease, background-color 0.16s ease, border-color 0.16s ease;
}
.nav-item::before {
  content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.35;
  transition: opacity 0.16s ease, box-shadow 0.16s ease;
}
.nav-item:hover { color: var(--text); background: var(--accent-soft); }
.nav-item.active {
  color: var(--accent); background: var(--gradient-soft);
  border-color: rgba(122, 92, 255, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}
.nav-item.active::before { opacity: 1; background: var(--gradient); box-shadow: 0 0 0 4px rgba(122, 92, 255, 0.12); }

.side-foot {
  margin-top: auto; border-top: 1px solid var(--line); padding: 14px 8px 0;
  display: flex; align-items: center; gap: 9px; color: var(--muted); font-size: 12px;
}
.side-foot strong { display: block; color: var(--text); font-size: 12px; font-weight: 700; }
.side-foot small { display: block; font-size: 10px; color: var(--muted); }

/* ============ 状态点 ============ */
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); flex: none; }
.dot.online { background: var(--good); box-shadow: 0 0 0 4px rgba(31, 156, 120, 0.14); }
.dot.offline { background: var(--bad); box-shadow: 0 0 0 4px rgba(216, 68, 111, 0.14); }
.dot.pending { background: var(--warn); box-shadow: 0 0 0 4px rgba(201, 130, 26, 0.16); }

/* ============ 主区域 ============ */
.main { min-width: 0; overflow-x: clip; padding: 26px 30px 56px; }
.topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.topbar h2 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: var(--text); }
.topbar p { margin: 4px 0 0; color: var(--muted); font-size: 12.5px; }
.top-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* ============ 按钮 ============ */
.btn {
  border: 1px solid transparent;
  background: var(--gradient);
  color: #fff; padding: 8px 16px; border-radius: 999px; cursor: pointer;
  font-size: 12.5px; font-weight: 700; letter-spacing: 0.01em;
  box-shadow: 0 10px 22px -10px rgba(122, 92, 255, 0.65);
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease,
    background-color 0.16s ease, color 0.16s ease;
}
.btn:hover { transform: translateY(-1px); box-shadow: 0 14px 26px -10px rgba(122, 92, 255, 0.7); }
.btn:active { transform: translateY(0); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
.btn.ghost { background: var(--surface); color: var(--text-2); border-color: var(--line-strong); box-shadow: var(--shadow-xs); }
.btn.ghost:hover { color: var(--accent); border-color: rgba(122, 92, 255, 0.4); box-shadow: var(--shadow-sm); }
.btn.danger { background: rgba(216, 68, 111, 0.1); color: var(--bad); border-color: rgba(216, 68, 111, 0.28); box-shadow: none; }
.btn.danger:hover { background: rgba(216, 68, 111, 0.16); border-color: rgba(216, 68, 111, 0.45); }
.btn.sm { padding: 6px 12px; font-size: 11.5px; }
.btn.theme-btn { padding: 6px 9px; display: inline-flex; align-items: center; justify-content: center; }
.btn.theme-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.btn.theme-btn .icon-sun { display: none; }
html.dark .btn.theme-btn .icon-sun { display: block; }
html.dark .btn.theme-btn .icon-moon { display: none; }

/* ============ 卡片 ============ */
.view { display: none; }
.view.active { display: block; animation: fade 0.18s ease; }
@keyframes fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.card {
  background: var(--panel-grad);
  border: 1px solid var(--line); border-radius: 20px; padding: 18px 20px;
  box-shadow: var(--shadow-xs);
}
.card + .card { margin-top: 14px; }
.card h3 { font-size: 14px; margin: 0 0 4px; font-weight: 750; letter-spacing: -0.01em; color: var(--text); }
.card .hint { color: var(--muted); font-size: 12.5px; margin: 0 0 14px; }
.card .hint code { font-family: var(--mono); font-size: 11.5px; background: var(--accent-soft); color: var(--accent); border-radius: 6px; padding: 1px 6px; }

.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 13px; margin: 14px 0; }
.stats > .card + .card { margin-top: 0; }
.stat-label { color: var(--muted); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; }
.stat-value { font-size: 26px; font-weight: 800; margin-top: 3px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; color: var(--text); }
.stat-sub { color: var(--muted); font-size: 11px; margin-top: 1px; }

/* ============ 账号 Hero ============ */
.hero {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  border-color: rgba(122, 92, 255, 0.18);
  background: var(--hero-grad);
  box-shadow: var(--shadow-sm);
}
.avatar {
  width: 58px; height: 58px; border-radius: 18px; flex: none;
  display: grid; place-items: center; font-size: 22px; font-weight: 800;
  background: var(--gradient);
  color: #fff; box-shadow: 0 12px 26px -10px rgba(122, 92, 255, 0.7);
}
.hero-name { font-size: 22px; font-weight: 800; line-height: 1.3; letter-spacing: -0.02em; }
.hero-sub { color: var(--muted); font-size: 12.5px; }
.hero-spacer { flex: 1; }

/* ============ 两栏 ============ */
.grid-two { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr); gap: 14px; margin-top: 14px; align-items: start; }
.grid-two > .card + .card { margin-top: 0; }

/* ============ 端点 / 元信息 ============ */
.endpoint { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px dashed var(--line-strong); min-width: 0; }
.endpoint:last-child { border-bottom: none; }
.endpoint .name { width: 86px; color: var(--muted); font-size: 11.5px; flex: none; }
.endpoint code { flex: 1; min-width: 0; font-family: var(--mono); font-size: 12px; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.endpoint .copy {
  margin-left: auto; border: 1px solid var(--line-strong); background: var(--surface); color: var(--muted);
  border-radius: 999px; padding: 3px 10px; cursor: pointer; font-size: 10.5px; font-weight: 600;
  transition: color 0.16s ease, border-color 0.16s ease;
}
.endpoint .copy:hover { color: var(--accent); border-color: rgba(122, 92, 255, 0.4); }
.meta-line { display: flex; justify-content: space-between; gap: 14px; padding: 8px 0; border-bottom: 1px dashed var(--line-strong); font-size: 12.5px; }
.meta-line:last-child { border-bottom: none; }
.meta-line span:first-child { color: var(--muted); white-space: nowrap; }
.meta-line span:last-child { min-width: 0; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-2); }

/* ============ 事件列表 ============ */
.event-list { display: flex; flex-direction: column; }
.event-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--line-strong); font-size: 12px; }
.event-row:last-child { border-bottom: none; }
.event-time { color: var(--muted); font-family: var(--mono); font-size: 11px; width: 64px; flex: none; }
.event-type { color: var(--accent-2); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; width: 74px; flex: none; font-weight: 700; }
.event-text { color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-empty { color: var(--muted); font-size: 12px; padding: 6px 0; }

/* ============ 徽标 ============ */
.pill {
  display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px;
  border: 1px solid var(--line-strong); border-radius: 999px; background: var(--surface);
  color: var(--text-2); font-size: 12px; font-weight: 600; box-shadow: var(--shadow-xs);
}
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.chip { font-size: 10.5px; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--line-strong); color: var(--muted); background: var(--surface); font-weight: 600; }
.badge-ok { color: var(--good); border-color: rgba(31, 156, 120, 0.3); background: rgba(31, 156, 120, 0.1); }
.badge-bad { color: var(--bad); border-color: rgba(216, 68, 111, 0.3); background: rgba(216, 68, 111, 0.1); }
.badge-warn { color: var(--warn); border-color: rgba(201, 130, 26, 0.32); background: rgba(201, 130, 26, 0.12); }

/* ============ 表单 ============ */
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 14px; }
.form-grid .full { grid-column: 1 / -1; }
.field { display: block; min-width: 0; }
.field > span { display: block; color: var(--muted); font-size: 11.5px; margin-bottom: 5px; font-weight: 600; }
.field input[type="text"], .field input[type="number"], .field select, .field textarea {
  width: 100%; border: 1px solid var(--line-strong); background: var(--input-bg);
  color: var(--text); border-radius: 11px; padding: 9px 11px; font-family: var(--mono); font-size: 12px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}
.field textarea { min-height: 96px; resize: vertical; line-height: 1.55; }
.field input:focus, .field select:focus, .field textarea:focus {
  outline: none; border-color: rgba(122, 92, 255, 0.5); box-shadow: 0 0 0 4px rgba(122, 92, 255, 0.1);
}
.check { display: flex; align-items: center; gap: 8px; padding-top: 20px; color: var(--text-2); font-size: 12px; }
.check input { accent-color: var(--accent); width: 15px; height: 15px; }
.section-tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 12px; }

/* ============ 编辑器行 ============ */
.editor-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.editor-row { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) 34px; gap: 8px; align-items: center; }
.editor-row.reverse { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) 90px 34px; }
.editor-row input {
  width: 100%; border: 1px solid var(--line-strong); background: var(--input-bg);
  color: var(--text); border-radius: 10px; padding: 8px 10px; font-family: var(--mono); font-size: 11px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}
.editor-row input:focus { outline: none; border-color: rgba(122, 92, 255, 0.5); box-shadow: 0 0 0 4px rgba(122, 92, 255, 0.1); }
.editor-row .del {
  border: 1px solid var(--line-strong); background: var(--surface); color: var(--muted);
  border-radius: 10px; height: 32px; cursor: pointer; font-size: 15px;
  transition: color 0.16s ease, border-color 0.16s ease;
}
.editor-row .del:hover { color: var(--bad); border-color: rgba(216, 68, 111, 0.4); }
.editor-labels {
  display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) 34px;
  gap: 8px; margin: 12px 0 2px; font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted);
}
.editor-labels span { padding-left: 2px; }
.editor-row input.invalid { border-color: rgba(216, 68, 111, 0.6); box-shadow: 0 0 0 4px rgba(216, 68, 111, 0.1); }
.actions-bar .status.dirty { color: var(--warn); font-weight: 700; }
/* 操作条是 sticky 的，给表单底部留出空间，避免盖住「添加」按钮。 */
#view-network { padding-bottom: 88px; }

/* ============ 底部操作条 ============ */
.actions-bar {
  position: sticky; bottom: 12px; z-index: 5; margin-top: 18px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 16px;
  background: var(--surface); backdrop-filter: blur(14px);
  box-shadow: var(--shadow-md);
  display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
}
.actions-bar .status { color: var(--muted); font-size: 11.5px; margin-left: auto; }

/* ============ 提示条 ============ */
.banner {
  padding: 11px 14px; border-radius: 14px; border: 1px solid var(--banner-border);
  background: var(--banner-bg); color: var(--banner-text); font-size: 12.5px; margin-bottom: 14px;
}
.banner a { color: var(--banner-text); text-decoration: underline; font-weight: 700; }

/* ============ 结果面板 ============ */
pre.result {
  margin: 10px 0 0; padding: 12px 14px; border-radius: 14px; background: var(--result-bg);
  border: 1px solid var(--line-strong); font-family: var(--mono); font-size: 11.5px; max-height: 220px; overflow: auto;
  white-space: pre-wrap; word-break: break-word; color: var(--text-2);
}

/* ============ 日志 ============ */
.logs-card { padding: 0; overflow: hidden; }
.logs-head { display: flex; align-items: center; gap: 8px; padding: 13px 16px; border-bottom: 1px solid var(--line); flex-wrap: wrap; background: var(--surface); }
.logs-head h3 { margin: 0; }
.logs-head .spacer { flex: 1; }
.logs-tools { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; }
.logs-tools select, .logs-tools input {
  border: 1px solid var(--line-strong); background: var(--input-bg); color: var(--text-2);
  border-radius: 999px; padding: 6px 11px; font-size: 11.5px;
}
.logs-tools input { width: 160px; }
.logs-tools input:focus, .logs-tools select:focus { outline: none; border-color: rgba(122, 92, 255, 0.5); box-shadow: 0 0 0 4px rgba(122, 92, 255, 0.1); }
.log-list {
  height: 500px; overflow: auto; padding: 12px 16px 16px;
  font-family: var(--mono); font-size: 11.5px; background: var(--log-bg); color: var(--log-text);
}
.log-line { display: flex; gap: 8px; padding: 1.5px 0; white-space: pre-wrap; word-break: break-all; }
.log-time { color: var(--log-time); flex: none; }
.log-level { flex: none; width: 44px; font-weight: 700; }
.log-scope { color: var(--log-scope); flex: none; }
.log-msg { color: var(--log-msg); }
.log-line.warn .log-level { color: var(--log-warn); }
.log-line.error .log-level { color: var(--log-error); }
.log-line.debug .log-level, .log-line.trace .log-level { color: var(--log-debug); }
.log-line.info .log-level { color: var(--log-info); }

/* ============ 关于 ============ */
.about-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; }
.kv { padding: 8px 0; border-bottom: 1px dashed var(--line-strong); }
.kv span { display: block; color: var(--muted); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; }
.kv strong { display: block; font-family: var(--mono); font-size: 12px; font-weight: 500; word-break: break-all; color: var(--text-2); }

/* ============ WebSocket 卡片 ============ */
.ws-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
.ws-toolbar h3 { margin: 0; }
.ws-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
.ws-card {
  border: 1px solid var(--line); border-radius: 18px; padding: 15px 16px;
  background: var(--ws-grad);
  box-shadow: var(--shadow-xs);
  display: flex; flex-direction: column; gap: 10px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}
.ws-card:hover { border-color: rgba(122, 92, 255, 0.34); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
.ws-card.off { opacity: 0.62; }
.ws-card-head { display: flex; align-items: center; gap: 10px; }
.ws-name { font-weight: 750; font-size: 14.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ws-card-head .spacer { flex: 1; }
.ws-meta { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 5px 8px; font-size: 12px; }
.ws-meta span { color: var(--muted); }
.ws-meta code { font-family: var(--mono); font-size: 11px; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ws-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.ws-actions .btn { padding: 5px 10px; font-size: 11px; }
.ws-empty { grid-column: 1 / -1; padding: 30px; text-align: center; border: 1px dashed var(--line-strong); border-radius: 18px; color: var(--muted); background: var(--surface); }

/* ============ 开关 ============ */
.switch { position: relative; width: 40px; height: 23px; flex: none; display: inline-block; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch span { position: absolute; inset: 0; border-radius: 999px; background: var(--switch-off); transition: 0.18s; cursor: pointer; }
.switch span::after {
  content: ""; position: absolute; width: 17px; height: 17px; left: 3px; top: 3px; border-radius: 50%;
  background: #fff; box-shadow: 0 2px 6px rgba(33, 26, 51, 0.18); transition: 0.18s;
}
.switch input:checked + span { background: var(--gradient); }
.switch input:checked + span::after { transform: translateX(17px); }

/* ============ 弹窗 ============ */
.modal-overlay {
  position: fixed; inset: 0; z-index: 55; display: grid; place-items: center; padding: 20px;
  background: var(--overlay); backdrop-filter: blur(10px);
}
.ws-form { width: min(560px, 100%); }
.ws-form .form-grid { margin: 12px 0; }
.ws-form .login-actions { margin-top: 6px; }
.login-box {
  width: min(400px, 100%); padding: 24px; border-radius: 22px; border: 1px solid var(--line-strong);
  background: var(--surface); box-shadow: var(--shadow-lg);
}
.login-box h3 { margin: 0 0 4px; font-size: 19px; font-weight: 800; letter-spacing: -0.02em; }
.login-box p { margin: 0 0 18px; color: var(--muted); font-size: 12.5px; }
.login-box input {
  width: 100%; margin-bottom: 10px; border: 1px solid var(--line-strong); background: var(--input-bg);
  color: var(--text); border-radius: 11px; padding: 11px 12px; font-family: var(--mono);
}
.login-box input:focus { outline: none; border-color: rgba(122, 92, 255, 0.5); box-shadow: 0 0 0 4px rgba(122, 92, 255, 0.1); }
.login-box .error { color: var(--bad); font-size: 12px; min-height: 18px; }
.login-actions { display: flex; gap: 8px; }

/* ============ Toast ============ */
.toast {
  position: fixed; right: 20px; bottom: 20px; z-index: 60; background: var(--toast-bg); border: 1px solid var(--line-strong);
  color: var(--toast-text); padding: 11px 15px; border-radius: 13px; box-shadow: var(--shadow-md);
  opacity: 0; transform: translateY(8px); transition: all 0.2s ease; pointer-events: none; max-width: 380px; font-size: 12.5px;
}
.toast.show { opacity: 1; transform: translateY(0); }
.footer-note { margin-top: 22px; color: var(--muted); font-size: 11.5px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }

/* ============ 响应式 ============ */
@media (max-width: 1000px) {
  .app { grid-template-columns: minmax(0, 1fr); }
  .ws-grid { grid-template-columns: minmax(0, 1fr); }
  .sidebar {
    position: relative; height: auto; flex-direction: row; align-items: center; gap: 14px;
    padding: 12px 16px; overflow-x: auto; border-right: none; border-bottom: 1px solid var(--line);
    -webkit-mask-image: linear-gradient(90deg, #000 86%, transparent 100%);
    mask-image: linear-gradient(90deg, #000 86%, transparent 100%);
  }
  .brand { min-width: 170px; }
  .brand h1 { font-size: 11px; }
  .nav { flex-direction: row; }
  .nav-item { white-space: nowrap; padding: 7px 11px; }
  .side-foot { margin: 0 0 0 auto; border: 0; padding: 0; }
  .main { padding: 20px 16px 44px; }
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid-two { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 620px) {
  .brand p, .brand h1 { display: none; }
  .brand { min-width: 0; }
  .nav-item { font-size: 12px; }
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .form-grid { grid-template-columns: minmax(0, 1fr); }
  .about-grid { grid-template-columns: minmax(0, 1fr); }
  .editor-labels { display: none; }
  .editor-row, .editor-row.reverse { grid-template-columns: minmax(0, 1fr) 34px; }
  .editor-row.reverse input:nth-child(3) { grid-column: 1 / -1; }
  .topbar h2 { font-size: 20px; }
  .stat-value { font-size: 22px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;

export const WEBUI_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Shadow Dream · OneBot 控制台</title>
  <script>
    // 在样式加载前定好主题，避免深色系统下闪一下浅色。
    (function () {
      try {
        var saved = localStorage.getItem('shadowdream.theme');
        var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (dark) document.documentElement.classList.add('dark');
      } catch (e) {}
    })();
  </script>
  <style>__CSS__</style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <div class="logo"></div>
        <div>
          <h1>SHADOW DREAM</h1>
          <p>影梦 · OneBot 11</p>
        </div>
      </div>
      <nav class="nav">
        <button class="nav-item active" data-view="overview">概览</button>
        <button class="nav-item" data-view="network">网络与推送</button>
        <button class="nav-item" data-view="ws">WebSocket</button>
        <button class="nav-item" data-view="account">账号</button>
        <button class="nav-item" data-view="debug">调试台</button>
        <button class="nav-item" data-view="logs">日志</button>
        <button class="nav-item" data-view="update">更新</button>
        <button class="nav-item" data-view="about">关于</button>
      </nav>
      <div class="side-foot">
        <span id="side-dot" class="dot"></span>
        <div><strong id="side-status">连接中</strong><small id="side-version">v0.3.0</small></div>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <h2 id="view-title">概览</h2>
          <p id="view-subtitle">运行状态与连接</p>
        </div>
        <div class="top-actions">
          <span class="pill"><span id="top-dot" class="dot"></span><span id="top-status">连接中</span></span>
          <button class="btn ghost sm theme-btn" id="theme-toggle" type="button" title="切换深浅主题" aria-label="切换深浅主题">
            <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></svg>
            <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M5.9 5.9 4.3 4.3M19.7 19.7l-1.6-1.6M18.1 5.9l1.6-1.6M4.3 19.7l1.6-1.6" /></svg>
          </button>
          <button class="btn ghost sm" id="logout-btn">退出</button>
          <button class="btn ghost sm" id="refresh-btn">刷新</button>
        </div>
      </header>

      <div id="banner" class="banner hidden"></div>

      <section id="view-overview" class="view active">
        <div class="card hero">
          <div class="avatar" id="ov-avatar">梦</div>
          <div>
            <div class="hero-name" id="ov-name">未登录</div>
            <div class="hero-sub" id="ov-sub">QQ - · mock</div>
          </div>
          <div class="hero-spacer"></div>
          <span class="chip" id="ov-online">离线</span>
        </div>

        <div class="stats">
          <div class="card"><div class="stat-label">运行时间</div><div class="stat-value" id="ov-uptime">-</div><div class="stat-sub" id="ov-started">-</div></div>
          <div class="card"><div class="stat-label">消息吞吐</div><div class="stat-value" id="ov-messages">0 / 0</div><div class="stat-sub">接收 / 发送</div></div>
          <div class="card"><div class="stat-label">连接</div><div class="stat-value" id="ov-connections">0</div><div class="stat-sub" id="ov-conn-sub">WS / 反连</div></div>
          <div class="card"><div class="stat-label">后端</div><div class="stat-value" id="ov-backend" style="font-size:18px">-</div><div class="stat-sub" id="ov-backend-ver">-</div></div>
        </div>

        <div class="grid-two">
          <div class="card">
            <h3>连接端点</h3>
            <p class="hint">供 OneBot SDK 连接；修改请到「网络与推送」。</p>
            <div class="endpoint"><span class="name">HTTP API</span><code id="ep-http">-</code><button class="copy" data-copy="ep-http">复制</button></div>
            <div class="endpoint"><span class="name">WebSocket</span><code id="ep-ws">-</code><button class="copy" data-copy="ep-ws">复制</button></div>
            <div class="endpoint"><span class="name">WebUI</span><code id="ep-webui">-</code><button class="copy" data-copy="ep-webui">复制</button></div>
            <div class="endpoint"><span class="name">HTTP POST</span><code id="ep-post">未配置</code></div>
            <div class="endpoint"><span class="name">反向 WS</span><code id="ep-reverse">未配置</code></div>
            <div class="chips" id="ep-caps"></div>
          </div>
          <div class="card">
            <h3>运行信息</h3>
            <p class="hint">账号登录由后端管理。</p>
            <div class="meta-line"><span>登录方式</span><span id="ov-login">-</span></div>
            <div class="meta-line"><span>配置自动重载</span><span id="ov-hot">-</span></div>
            <div class="meta-line"><span>配置文件</span><span id="ov-config">-</span></div>
            <div class="meta-line"><span>WebUI 版本</span><span id="ov-version">-</span></div>
            <div class="section-tools">
              <button class="btn sm" data-goto="network">网络与推送</button>
              <button class="btn ghost sm" data-goto="debug">打开调试台</button>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <h3>最近事件</h3>
          <p class="hint">最近收到的消息和通知；更多细节看「日志」。</p>
          <div class="event-list" id="event-list"><div class="event-empty">暂无事件</div></div>
        </div>
      </section>

      <section id="view-network" class="view">
        <div class="card">
          <h3>HTTP / WebUI</h3>
          <p class="hint">WebUI 没有独立监听地址，跟随这里的 host / port；改 host / port 会重启传输层。</p>
          <div class="form-grid">
            <label class="field"><span>监听地址</span><input id="net-http-host" type="text" placeholder="127.0.0.1" /></label>
            <label class="field"><span>端口</span><input id="net-http-port" type="number" min="0" max="65535" /></label>
            <label class="field"><span>access token</span><input id="net-http-token" type="text" placeholder="为空表示不鉴权" /></label>
            <label class="field"><span>WebUI 登录 token（20 位）</span><input id="net-webui-token" type="text" placeholder="留空则沿用 access token；都为空则免登录" /></label>
            <div class="field"><span>&nbsp;</span><button type="button" class="btn sm" id="gen-webui-token">随机生成 20 位 token</button></div>
            <label class="field"><span>CORS（逗号分隔）</span><input id="net-http-cors" type="text" placeholder="*" /></label>
            <label class="check"><input id="net-http-enabled" type="checkbox" /> 启用 HTTP API</label>
            <label class="check"><input id="net-http-webui" type="checkbox" /> 启用 WebUI</label>
          </div>
        </div>

        <div class="card">
          <h3>心跳与日志</h3>
          <div class="form-grid">
            <label class="field"><span>心跳间隔（ms）</span><input id="net-hb-interval" type="number" min="1000" max="3600000" /></label>
            <label class="field"><span>日志级别</span>
              <select id="net-log-level">
                <option value="trace">trace</option>
                <option value="debug">debug</option>
                <option value="info">info</option>
                <option value="warn">warn</option>
                <option value="error">error</option>
              </select>
            </label>
            <label class="check"><input id="net-hb-enabled" type="checkbox" /> 启用心跳</label>
          </div>
        </div>

        <div class="card">
          <h3>HTTP POST 事件上报</h3>
          <p class="hint">每个事件 POST 到这些地址；secret 用于 HMAC-SHA1 签名。留空的行会被忽略。</p>
          <div class="editor-labels">
            <span>上报地址（http/https）</span><span>secret（可选）</span><span></span>
          </div>
          <div id="net-post-list" class="editor-list"></div>
          <div class="section-tools"><button class="btn ghost sm" id="net-add-post">+ 添加 HTTP POST</button></div>
        </div>

        <div class="actions-bar">
          <button class="btn" id="net-save" disabled>保存并应用</button>
          <button class="btn ghost" id="net-reload">放弃修改并重载</button>
          <button class="btn ghost" id="net-restart">重启连接</button>
          <span class="status" id="net-status">读取配置中…</span>
        </div>
      </section>

      <section id="view-ws" class="view">
        <div class="card">
          <div class="ws-toolbar">
            <div>
              <h3>正向 WebSocket</h3>
              <p class="hint">每个端点独立监听、独立 token。启用开关、编辑、删除都会立即保存并热重启。</p>
            </div>
            <div class="section-tools">
              <button class="btn" id="ws-new">+ 新建正向 WS</button>
              <button class="btn ghost" id="ws-refresh">刷新</button>
            </div>
          </div>
          <div id="ws-list" class="ws-grid">
            <div class="event-empty">还没有正向 WebSocket 端点</div>
          </div>
          <p class="hint" id="ws-status" style="margin:14px 0 0">每个端点对应一个监听地址。</p>
        </div>

        <div class="card">
          <div class="ws-toolbar">
            <div>
              <h3>反向 WebSocket</h3>
              <p class="hint">Shadow Dream 主动连接业务端，推送事件并接收 action；断线会按间隔自动重连。</p>
            </div>
            <div class="section-tools">
              <button class="btn" id="reverse-new">+ 新建反向 WS</button>
            </div>
          </div>
          <div id="reverse-list" class="ws-grid">
            <div class="event-empty">还没有反向 WebSocket 端点</div>
          </div>
          <p class="hint" id="reverse-status" style="margin:14px 0 0">每个端点对应一条主动连接。</p>
        </div>
      </section>

      <section id="view-account" class="view">
        <div class="card hero">
          <div class="avatar" id="acc-avatar">梦</div>
          <div>
            <div class="hero-name" id="acc-name">未登录</div>
            <div class="hero-sub" id="acc-sub">QQ - · -</div>
          </div>
          <div class="hero-spacer"></div>
          <span class="chip" id="acc-online">离线</span>
        </div>
        <div class="grid-two">
          <div class="card">
            <h3>账号信息</h3>
            <div class="meta-line"><span>QQ</span><span id="acc-id">-</span></div>
            <div class="meta-line"><span>昵称</span><span id="acc-nick">-</span></div>
            <div class="meta-line"><span>后端</span><span id="acc-backend">-</span></div>
            <div class="meta-line"><span>登录模式</span><span id="acc-mode">-</span></div>
            <div class="meta-line"><span>配置文件</span><span id="acc-config">-</span></div>
            <div class="section-tools"><button class="btn ghost sm" id="acc-refresh">刷新账号</button></div>
          </div>
          <div class="card">
            <h3>登录说明</h3>
            <p class="hint" id="acc-note">-</p>
            <div class="chips" id="acc-caps"></div>
            <p class="hint" style="margin-top:14px">
              QQNT 插件复用 QQ 客户端已登录的 session；未登录时 Shadow Dream 登录页会直接显示
              QQ 官方二维码，也支持密码登录。密码只在内存中计算 MD5 后交给 QQ，不保存。
            </p>
          </div>
        </div>
      </section>

      <section id="view-debug" class="view">
        <div class="grid-two">
          <div class="card">
            <h3>动作调试</h3>
            <p class="hint">直接调用 OneBot action，结果会显示在下方。</p>
            <label class="field"><span>action</span><input id="action-name" type="text" list="action-list" value="get_status" /></label>
            <datalist id="action-list"></datalist>
            <label class="field"><span>params（JSON）</span><textarea id="action-params" spellcheck="false">{}</textarea></label>
            <div class="section-tools">
              <button class="btn" id="action-run">执行动作</button>
              <button class="btn ghost" id="action-fill">填入发送示例</button>
            </div>
            <pre class="result" id="action-result">等待执行…</pre>
          </div>
          <div class="card">
            <h3>模拟消息</h3>
            <p class="hint">仅 mock 后端；会生成真实格式的 message 事件。</p>
            <div class="form-grid">
              <label class="field"><span>类型</span><select id="sim-type"><option value="private">私聊</option><option value="group">群聊</option></select></label>
              <label class="field"><span>发送者 QQ</span><input id="sim-user" type="text" value="20001" /></label>
              <label class="field"><span>群号</span><input id="sim-group" type="text" value="30001" /></label>
            </div>
            <label class="field"><span>内容（支持 CQ 码）</span><textarea id="sim-message" spellcheck="false">你好，影梦！</textarea></label>
            <div class="section-tools"><button class="btn" id="sim-run">注入消息</button></div>
            <pre class="result" id="sim-result">模拟器会生成一条真实格式的 message 事件。</pre>
          </div>
        </div>
      </section>

      <section id="view-logs" class="view">
        <div class="card logs-card">
          <div class="logs-head">
            <h3>实时日志</h3>
            <span class="chip" id="log-count">0</span>
            <div class="spacer"></div>
            <div class="logs-tools">
              <select id="log-level">
                <option value="all">全部级别</option>
                <option value="debug">debug+</option>
                <option value="info">info+</option>
                <option value="warn">warn+</option>
                <option value="error">error</option>
              </select>
              <input id="log-search" type="text" placeholder="搜索日志…" />
              <button class="btn ghost sm" id="log-pause">暂停</button>
              <button class="btn ghost sm" id="log-clear">清空</button>
              <button class="btn ghost sm" id="log-download">下载</button>
            </div>
          </div>
          <div class="log-list" id="log-list"></div>
        </div>
      </section>

      <section id="view-update" class="view">
        <div class="grid-two">
          <div class="card">
            <h3>软件更新</h3>
            <p class="hint">从 GitHub Release 检查并安装更新。更新时 QQ 会退出并自动重启，配置和插件 data 会保留。</p>
            <div class="about-grid">
              <div class="kv"><span>当前版本</span><strong id="update-current">-</strong></div>
              <div class="kv"><span>最新版本</span><strong id="update-latest">-</strong></div>
              <div class="kv"><span>安装目录</span><strong id="update-root">-</strong></div>
              <div class="kv"><span>状态</span><strong id="update-status">未检查</strong></div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
              <button class="btn" id="update-check">检查更新</button>
              <button class="btn danger" id="update-apply" disabled>下载并安装</button>
            </div>
            <p class="hint" id="update-hint" style="margin-top:12px">更新会停止 QQ / Shadow Dream，完成后自动重启。</p>
            <pre id="update-log" style="display:none;margin:12px 0 0;padding:10px;border:1px solid var(--line);border-radius:8px;background:#0a1220;color:var(--muted);font-size:11px;white-space:pre-wrap;word-break:break-all"></pre>
          </div>
          <div class="card">
            <h3>更新说明</h3>
            <p class="hint">检查源是 <code>install-latest</code> Release 里的 <code>install-bundle.json</code>；下载的是同版本的精简安装包。</p>
            <p class="hint">如果刚推送代码，需要等 GitHub Actions 发布新清单后再检查，否则会显示“已经是最新版本”。</p>
            <p class="hint">更新过程中 WebUI 会断开；QQ 重启并重新登录后，回到这个页面刷新即可。</p>
            <p class="hint">Linux 安装支持一键更新；当前 Windows 原生安装请用安装脚本更新插件。</p>
          </div>
        </div>
      </section>

      <section id="view-about" class="view">
        <div class="grid-two">
          <div class="card">
            <h3>Shadow Dream</h3>
            <p class="hint">把 QQ 接进一场 OneBot 11 的影梦。</p>
            <div class="about-grid">
              <div class="kv"><span>版本</span><strong id="about-version">-</strong></div>
              <div class="kv"><span>协议</span><strong>OneBot 11</strong></div>
              <div class="kv"><span>后端</span><strong id="about-backend">-</strong></div>
              <div class="kv"><span>配置文件</span><strong id="about-config">-</strong></div>
              <div class="kv"><span>自动重载</span><strong id="about-hot">-</strong></div>
              <div class="kv"><span>构建目标</span><strong>Node.js 22+</strong></div>
            </div>
          </div>
          <div class="card">
            <h3>安全提示</h3>
            <p class="hint">
              默认只监听 127.0.0.1。改成 0.0.0.0 或放到公网前，务必设置
              <code>http.accessToken</code> / <code>ws.accessToken</code>，并配合防火墙或反向代理。
            </p>
            <p class="hint">
              账号登录使用 QQ 官方登录服务：未登录时 WebUI 显示二维码 / 密码登录，
              登录后只复用 session；密码不保存。
            </p>
            <p class="hint">
              插件后端仍是实验性。文本、表情、@、回复、图片、语音、视频、文件都已可发送：
              图片支持 PNG / JPEG / GIF / WebP / BMP，语音支持 silk / wav / mp3，
              视频支持 mp4 / mov，文件不限类型；来源可以是本地路径、
              <code>file://</code>、<code>http(s)://</code> 或 <code>base64://</code>。
            </p>
          </div>
        </div>
        <p class="footer-note"><span>Shadow Dream · 影梦</span><span>本地控制台 · 所有改动会写入配置文件</span></p>
      </section>
    </main>
  </div>

  <div class="modal-overlay hidden" id="ws-modal">
    <form class="login-box ws-form" id="ws-form">
      <h3 id="ws-modal-title">编辑 WebSocket</h3>
      <p>一个端点对应一个监听地址；与 HTTP 同 host/port 时会复用 HTTP server。</p>
      <div class="form-grid">
        <label class="field full"><span>名称</span><input id="ws-name" type="text" placeholder="WebSocket 1" /></label>
        <label class="field"><span>监听地址</span><input id="ws-host" type="text" placeholder="127.0.0.1" /></label>
        <label class="field"><span>端口</span><input id="ws-port" type="number" min="0" max="65535" /></label>
        <label class="field"><span>路径</span><input id="ws-path" type="text" placeholder="/" /></label>
        <label class="field"><span>access token</span><input id="ws-token" type="text" placeholder="为空表示不鉴权" /></label>
        <label class="check"><input id="ws-enabled" type="checkbox" /> 启用这个端点</label>
      </div>
      <div class="login-actions">
        <button type="submit" class="btn">保存并应用</button>
        <button type="button" class="btn ghost" id="ws-cancel">取消</button>
      </div>
    </form>
  </div>

  <div class="modal-overlay hidden" id="reverse-modal">
    <form class="login-box ws-form" id="reverse-form">
      <h3 id="reverse-modal-title">编辑反向 WebSocket</h3>
      <p>Shadow Dream 会主动连接这个地址；token 会作为 <code>access_token</code> 放进查询串。</p>
      <div class="form-grid">
        <label class="field full"><span>目标地址（ws / wss）</span><input id="reverse-url" type="text" placeholder="ws://127.0.0.1:8080/onebot" /></label>
        <label class="field"><span>access token（可选）</span><input id="reverse-token" type="text" placeholder="为空表示不鉴权" /></label>
        <label class="field"><span>重连间隔（ms）</span><input id="reverse-interval" type="number" min="500" max="600000" /></label>
      </div>
      <div class="login-actions">
        <button type="submit" class="btn">保存并应用</button>
        <button type="button" class="btn ghost" id="reverse-cancel">取消</button>
      </div>
    </form>
  </div>

  <div class="toast" id="toast"></div>
  <script>__JS__</script>
</body>
</html>`;

export const WEBUI_JS = `
(function () {
  'use strict';
  var TOKEN_KEY = 'shadowdream.token';
  var state = {
    token: localStorage.getItem(TOKEN_KEY) || '',
    overview: null,
    config: null,
    logs: [],
    lastLogSeq: 0,
    paused: false,
    view: 'overview',
    logLevel: 'all',
    logSearch: '',
    update: null,
    updateBusy: false,
    netDirty: false,
    wsEditing: null,
    reverseEditing: null
  };

  function $(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function setText(id, value) { var el = $(id); if (el) el.textContent = value == null ? '' : String(value); }
  function setValue(id, value) { var el = $(id); if (el) el.value = value == null ? '' : String(value); }
  function setChecked(id, value) { var el = $(id); if (el) el.checked = Boolean(value); }
  function showToast(message) {
    var el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }
  function showBanner(html) {
    var el = $('banner');
    el.innerHTML = html;
    el.classList.remove('hidden');
  }
  function hideBanner() { $('banner').classList.add('hidden'); }
  function fmtDuration(ms) {
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    if (d > 0) return d + '天 ' + h + '时';
    if (h > 0) return h + '时 ' + m + '分';
    return m + '分 ' + s + '秒';
  }
  function fmtTime(ts) { return new Date(ts).toLocaleString(); }
  function splitList(text) {
    return String(text || '').split(',').map(function (item) { return item.trim(); }).filter(Boolean);
  }

  function request(path, options) {
    var opts = options || {};
    opts.headers = Object.assign({}, opts.headers || {});
    if (opts.body && !opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
    if (state.token) opts.headers.Authorization = 'Bearer ' + state.token;
    return fetch(path, opts).then(function (res) {
      return res.text().then(function (text) {
        var data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { message: text }; }
        if (res.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          location.replace('/webui/');
          var unauthorized = new Error('需要 access token');
          unauthorized.unauthorized = true;
          throw unauthorized;
        }
        if (!res.ok) {
          var error = new Error(data.message || ('HTTP ' + res.status));
          error.data = data;
          throw error;
        }
        return data;
      });
    });
  }

  function fmtCommit(value) {
    if (!value) return '未知';
    var text = String(value);
    return text.length > 10 ? text.slice(0, 7) : text;
  }

  function loadUpdateInfo() {
    if (state.updateBusy) return;
    state.updateBusy = true;
    setText('update-status', '检查中…');
    setText('update-hint', '正在访问 GitHub Release 清单…');
    $('update-apply').disabled = true;
    request('/webui/api/update/check').then(function (payload) {
      var data = payload.data || {};
      state.update = data;
      setText('update-current', fmtCommit(data.current));
      setText('update-latest', fmtCommit(data.latest));
      setText('update-root', data.root || '未找到源码目录');
      if (!data.supported) {
        setText('update-status', '当前环境不支持一键更新');
        setText('update-hint', '需要 Linux 源码目录和 scripts/update-shadowdream.sh。');
        $('update-apply').disabled = true;
      } else if (data.error) {
        setText('update-status', '检查失败');
        setText('update-hint', data.error);
        $('update-apply').disabled = true;
      } else if (data.updateAvailable) {
        setText('update-status', '发现新版本');
        setText('update-hint', '可以下载并安装；安装过程中 QQ 会退出，完成后自动重启。');
        $('update-apply').disabled = false;
      } else {
        setText('update-status', '已经是最新版本');
        setText('update-hint', '当前版本和 install-latest 清单一致。');
        $('update-apply').disabled = true;
      }
    }).catch(function (error) {
      setText('update-status', '检查失败');
      setText('update-hint', error.message || String(error));
      $('update-apply').disabled = true;
    }).finally(function () {
      state.updateBusy = false;
    });
  }

  function waitForRestart() {
    var attempts = 0;
    var sawDown = false;
    var timer = setInterval(function () {
      attempts += 1;
      fetch('/webui/api/session', { cache: 'no-store' }).then(function (res) {
        if (res.ok && sawDown) {
          clearInterval(timer);
          location.reload();
        }
      }).catch(function () {
        sawDown = true;
      });
      if (attempts > 120) clearInterval(timer);
    }, 3000);
  }

  function applyUpdateUI() {
    if (state.updateBusy || !state.update || !state.update.updateAvailable) return;
    if (!window.confirm('更新会停止 QQ / Shadow Dream，安装完成后自动重启。继续？')) return;
    state.updateBusy = true;
    $('update-apply').disabled = true;
    $('update-check').disabled = true;
    setText('update-status', '正在启动更新…');
    request('/webui/api/update/apply', { method: 'POST' }).then(function (payload) {
      var data = payload.data || {};
      setText('update-status', '更新已开始');
      setText('update-hint', 'QQ 即将退出并自动重启；页面恢复后会刷新。');
      var log = $('update-log');
      if (data.logPath) {
        log.style.display = 'block';
        log.textContent = '更新日志：' + data.logPath;
      }
      showBanner('更新已开始，QQ / Shadow Dream 正在重启。请稍候…');
      waitForRestart();
    }).catch(function (error) {
      state.updateBusy = false;
      $('update-apply').disabled = false;
      $('update-check').disabled = false;
      setText('update-status', '启动更新失败');
      setText('update-hint', error.message || String(error));
    });
  }

  var viewMeta = {
    overview: ['概览', '运行状态与连接'],
    network: ['网络与推送', 'HTTP / WebUI、心跳与 HTTP POST'],
    ws: ['WebSocket', '正向 / 反向端点，改动立即保存并热重启'],
    account: ['账号', '当前登录账号与后端登录方式'],
    debug: ['调试台', '动作调用与模拟消息'],
    logs: ['日志', '实时日志与过滤器'],
    update: ['更新', '检查并安装 Shadow Dream 新版本'],
    about: ['关于', '版本、配置与安全提示']
  };
  function switchView(view) {
    if (state.netDirty && state.view === 'network' && view !== 'network') {
      if (!confirm('「网络与推送」有未保存的修改，离开会丢失。确定离开吗？')) return;
      setNetDirty(false);
    }
    state.view = view;
    document.querySelectorAll('.nav-item').forEach(function (item) {
      item.classList.toggle('active', item.dataset.view === view);
    });
    document.querySelectorAll('.view').forEach(function (section) {
      section.classList.toggle('active', section.id === 'view-' + view);
    });
    setText('view-title', viewMeta[view][0]);
    setText('view-subtitle', viewMeta[view][1]);
    if (location.hash !== '#' + view) {
      try { history.replaceState(null, '', '#' + view); } catch (e) {}
    }
    // 有未保存修改时重新拉配置会覆盖表单，所以只在干净状态下刷新。
    if (view === 'network' && !state.netDirty) loadConfig();
    if (view === 'ws') loadConfig();
    if (view === 'logs') refreshLogs();
    if (view === 'update') loadUpdateInfo();
    if (view === 'about' && state.overview) renderAbout(state.overview);
  }

  /** 网络与推送是整页表单：记录脏状态，保存前不静默丢失修改。 */
  function setNetDirty(dirty) {
    state.netDirty = Boolean(dirty);
    var save = $('net-save');
    if (save) save.disabled = !state.netDirty;
    var status = $('net-status');
    if (!status) return;
    status.classList.toggle('dirty', state.netDirty);
    if (state.netDirty) {
      setText('net-status', '有未保存的修改');
    } else if (state.configPath || (state.overview && state.overview.config.path)) {
      setText('net-status', '配置文件：' + (state.configPath || state.overview.config.path));
    }
  }

  function renderStatus(overview) {
    var online = Boolean(overview.backend && overview.backend.online);
    var dotClass = 'dot ' + (online ? 'online' : 'offline');
    $('side-dot').className = dotClass;
    $('top-dot').className = dotClass;
    setText('side-status', online ? '在线' : '离线');
    setText('top-status', online ? '在线' : '离线');
    setText('side-version', 'v' + overview.app.version);
  }

  function renderEvents(events) {
    var list = $('event-list');
    if (!list) return;
    if (!events || !events.length) {
      list.innerHTML = '<div class="event-empty">暂无事件</div>';
      return;
    }
    list.innerHTML = events.slice(0, 12).map(function (event) {
      var date = new Date((event.time || 0) * 1000);
      var time = isNaN(date.getTime()) ? '--:--:--' : date.toLocaleTimeString();
      return '<div class="event-row">'
        + '<span class="event-time">' + esc(time) + '</span>'
        + '<span class="event-type">' + esc(event.type) + '</span>'
        + '<span class="event-text">' + esc(event.summary || event.type) + '</span>'
        + '</div>';
    }).join('');
  }

  function renderOverview(data) {
    state.overview = data;
    renderStatus(data);
    var backend = data.backend;
    var account = data.account || {};
    var nickname = account.nickname || ('QQ ' + backend.selfId);
    setText('ov-avatar', nickname.slice(0, 1) || '梦');
    setText('ov-name', nickname);
    setText('ov-sub', 'QQ ' + backend.selfId + ' · ' + backend.name + ' ' + backend.version);
    setText('ov-online', account.online ? '在线' : '离线');
    $('ov-online').className = 'chip ' + (account.online ? 'badge-ok' : 'badge-bad');
    setText('ov-uptime', fmtDuration(data.app.uptimeMs));
    setText('ov-started', fmtTime(data.app.startedAt));
    setText('ov-messages', data.status.stat.message_received + ' / ' + data.status.stat.message_sent);
    setText('ov-connections', data.transports.wsClients + data.transports.reverseWsConnected);
    setText('ov-conn-sub', 'WS ' + data.transports.wsClients + ' / 反连 ' + data.transports.reverseWsConnected);
    setText('ov-backend', backend.name);
    setText('ov-backend-ver', backend.version);
    setText('ep-http', data.transports.http);
    var wsList = data.transports.wsServers || [];
    setText('ep-ws', wsList.length === 0
      ? '未启用'
      : (wsList.length === 1 ? wsList[0].url : wsList[0].url + ' 等 ' + wsList.length + ' 个'));
    setText('ep-webui', data.transports.webui);
    setText('ep-post', data.transports.httpPost.length ? data.transports.httpPost.join(' , ') : '未配置');
    setText('ep-reverse', data.transports.reverseWs.length ? data.transports.reverseWs.join(' , ') : '未配置');
    renderEvents(data.recentEvents);
    $('ep-caps').innerHTML = (backend.capabilities || []).map(function (cap) {
      return '<span class="chip">' + esc(cap) + '</span>';
    }).join('');
    setText('ov-login', account.loginMode === 'mock' ? '模拟账号（无需登录）' : 'QQ 客户端登录态');
    setText('ov-hot', data.config.hotReload ? '已开启' : '未开启');
    setText('ov-config', data.config.path || '未指定配置文件');
    setText('ov-version', 'v' + data.app.version);
    var list = $('action-list');
    if (list.childElementCount !== data.actions.length) {
      list.innerHTML = data.actions.map(function (name) { return '<option value="' + esc(name) + '"></option>'; }).join('');
    }
    $('sim-run').disabled = !data.simulator;
    renderAccount(data);
    if (state.view === 'about') renderAbout(data);
    if (state.view === 'ws') { renderWs(); renderReverseWs(); }
  }

  function renderAccount(data) {
    var backend = data.backend;
    var account = data.account || {};
    var nickname = account.nickname || ('QQ ' + backend.selfId);
    setText('acc-avatar', nickname.slice(0, 1) || '梦');
    setText('acc-name', nickname);
    setText('acc-sub', 'QQ ' + backend.selfId + ' · ' + backend.name);
    setText('acc-id', backend.selfId || '-');
    setText('acc-nick', nickname);
    setText('acc-backend', backend.name + ' ' + backend.version);
    setText('acc-mode', account.loginMode === 'mock' ? 'mock 模拟账号' : 'QQ 客户端登录态');
    setText('acc-config', data.config.path || '未指定');
    setText('acc-online', account.online ? '在线' : '离线');
    $('acc-online').className = 'chip ' + (account.online ? 'badge-ok' : 'badge-bad');
    $('acc-caps').innerHTML = (backend.capabilities || []).map(function (cap) {
      return '<span class="chip">' + esc(cap) + '</span>';
    }).join('');
    setText('acc-note', account.loginMode === 'mock'
      ? 'mock 后端使用内置模拟账号 10001，不需要登录。真实 QQ 请切换到 qqnt 插件后端。'
      : '登录由 QQ 客户端管理。请在 QQ 中扫码/切换账号，Shadow Dream 复用当前 session，不会保存密码。');
  }

  function renderAbout(data) {
    setText('about-version', 'v' + data.app.version);
    setText('about-backend', data.backend.name + ' ' + data.backend.version);
    setText('about-config', data.config.path || '未指定');
    setText('about-hot', data.config.hotReload ? '已开启（文件监听）' : '未开启');
  }

  function loadOverview() {
    return request('/webui/api/overview').then(function (data) {
      renderOverview(data);
    }).catch(function (error) {
      if (!error.unauthorized) {
        setText('top-status', '控制台离线');
        $('top-dot').className = 'dot offline';
      }
    });
  }

  function loadConfig() {
    setText('net-status', '读取配置中…');
    return request('/webui/api/config').then(function (data) {
      state.config = data.config;
      state.configPath = data.path;
      if (state.view === 'network') renderNetwork();
      if (state.view === 'ws') { renderWs(); renderReverseWs(); }
    }).catch(function (error) {
      setText('net-status', '读取失败：' + (error.message || error));
    });
  }

  function setFormValue(id, value) { setValue(id, value); }
  function renderNetwork() {
    var cfg = state.config;
    if (!cfg) return;
    setChecked('net-http-enabled', cfg.http.enabled);
    setFormValue('net-http-host', cfg.http.host);
    setFormValue('net-http-port', cfg.http.port);
    setFormValue('net-http-token', cfg.http.accessToken);
    setFormValue('net-webui-token', cfg.http.webuiToken);
    setFormValue('net-http-cors', (cfg.http.cors || []).join(', '));
    setChecked('net-http-webui', cfg.http.webui);
    setChecked('net-hb-enabled', cfg.heartbeat.enabled);
    setFormValue('net-hb-interval', cfg.heartbeat.intervalMs);
    setFormValue('net-log-level', cfg.logLevel);
    $('net-post-list').innerHTML = '';
    (cfg.httpPost || []).forEach(function (item) { addPostRow(item); });
    state.configPath = state.configPath || (state.overview ? state.overview.config.path : '');
    setNetDirty(false);
  }

  function addPostRow(item) {
    var row = document.createElement('div');
    row.className = 'editor-row post-row';
    row.innerHTML = '<input type="text" class="post-url" placeholder="https://example.com/onebot" />'
      + '<input type="text" class="post-secret" placeholder="secret（可选）" />'
      + '<button class="del" type="button" title="删除">×</button>';
    row.querySelector('.post-url').value = item && item.url ? item.url : '';
    row.querySelector('.post-secret').value = item && item.secret ? item.secret : '';
    row.querySelector('.del').addEventListener('click', function () {
      row.remove();
      setNetDirty(true);
    });
    $('net-post-list').appendChild(row);
  }

  function collectConfig() {
    var cfg = JSON.parse(JSON.stringify(state.config || {}));
    cfg.http = cfg.http || {};
    cfg.heartbeat = cfg.heartbeat || {};
    cfg.http.enabled = $('net-http-enabled').checked;
    cfg.http.host = $('net-http-host').value.trim() || '127.0.0.1';
    cfg.http.port = Number($('net-http-port').value) || 0;
    cfg.http.accessToken = $('net-http-token').value.trim();
    cfg.http.webuiToken = $('net-webui-token').value.trim();
    cfg.http.cors = splitList($('net-http-cors').value);
    cfg.http.webui = $('net-http-webui').checked;
    cfg.heartbeat.enabled = $('net-hb-enabled').checked;
    cfg.heartbeat.intervalMs = Number($('net-hb-interval').value) || 30000;
    cfg.logLevel = $('net-log-level').value;
    cfg.httpPost = Array.prototype.map.call(document.querySelectorAll('#net-post-list .post-row'), function (row) {
      var url = row.querySelector('.post-url').value.trim();
      if (!url) return null;
      var secret = row.querySelector('.post-secret').value.trim();
      return secret ? { url: url, secret: secret } : { url: url };
    }).filter(Boolean);
    return cfg;
  }

  function wsUrl(server) {
    var host = (server.host === '0.0.0.0' || server.host === '::')
      ? (window.location.hostname || '127.0.0.1')
      : server.host;
    var suffix = server.path && server.path !== '/' ? server.path : '';
    return 'ws://' + host + ':' + server.port + suffix;
  }

  function wsServersConfig() {
    if (!state.config) return [];
    if (!Array.isArray(state.config.wsServers)) {
      state.config.wsServers = state.config.ws
        ? [Object.assign({ name: 'WebSocket 1' }, state.config.ws)]
        : [];
    }
    return state.config.wsServers;
  }

  function mirrorWs(cfg) {
    cfg.ws = cfg.wsServers && cfg.wsServers.length
      ? Object.assign({}, cfg.wsServers[0])
      : Object.assign({}, cfg.ws || {}, { enabled: false });
    return cfg;
  }

  function renderWs() {
    var servers = wsServersConfig();
    var list = $('ws-list');
    if (!list) return;
    if (servers.length === 0) {
      list.innerHTML = '<div class="ws-empty">还没有正向端点，点右上角「新建正向 WS」。</div>';
      setText('ws-status', '0 个端点');
      return;
    }
    var statuses = (state.overview && state.overview.transports.wsServers) || [];
    list.innerHTML = servers.map(function (server, index) {
      var status = statuses[index] || {};
      var running = Boolean(status.running);
      var enabled = server.enabled !== false;
      var url = status.url || wsUrl(server);
      var badge = running ? 'badge-ok' : (enabled ? 'badge-warn' : 'badge-bad');
      var badgeText = running ? '运行中' : (enabled ? '启动失败' : '已停用');
      return '<div class="ws-card ' + (enabled ? '' : 'off') + '" data-index="' + index + '">'
        + '<div class="ws-card-head">'
        + '<label class="switch"><input class="ws-toggle" data-index="' + index + '" type="checkbox" ' + (enabled ? 'checked' : '') + ' /><span></span></label>'
        + '<div class="ws-name">' + esc(server.name || ('WebSocket ' + (index + 1))) + '</div>'
        + '<div class="spacer"></div>'
        + '<span class="chip ' + badge + '">' + badgeText + '</span>'
        + '</div>'
        + '<div class="ws-meta">'
        + '<span>类型</span><span>WebSocket 服务器</span>'
        + '<span>URL</span><code>' + esc(url) + '</code>'
        + '<span>客户端</span><span>' + (status.clients || 0) + '</span>'
        + '</div>'
        + '<div class="ws-actions">'
        + '<button class="btn ghost ws-edit" data-index="' + index + '">编辑</button>'
        + '<button class="btn ghost ws-test" data-index="' + index + '">测试</button>'
        + '<button class="btn danger ws-del" data-index="' + index + '">删除</button>'
        + '</div>'
        + '</div>';
    }).join('');
    setText('ws-status', servers.length + ' 个端点 · ' + servers.filter(function (s) { return s.enabled !== false; }).length + ' 个启用');
    list.querySelectorAll('.ws-toggle').forEach(function (input) {
      input.addEventListener('change', function () {
        setWsEnabled(Number(input.dataset.index), input.checked);
      });
    });
    list.querySelectorAll('.ws-edit').forEach(function (button) {
      button.addEventListener('click', function () { openWsModal(Number(button.dataset.index)); });
    });
    list.querySelectorAll('.ws-test').forEach(function (button) {
      button.addEventListener('click', function () { testWs(Number(button.dataset.index)); });
    });
    list.querySelectorAll('.ws-del').forEach(function (button) {
      button.addEventListener('click', function () { deleteWs(Number(button.dataset.index)); });
    });
  }

  /** 反向 WebSocket：主动连出去，与正向端点同一页、同样的卡片交互。 */
  function renderReverseWs() {
    var list = $('reverse-list');
    if (!list || !state.config) return;
    var targets = Array.isArray(state.config.reverseWs) ? state.config.reverseWs : [];
    if (targets.length === 0) {
      list.innerHTML = '<div class="ws-empty">还没有反向端点，点右上角「新建反向 WS」。</div>';
      setText('reverse-status', '0 个端点');
      return;
    }
    list.innerHTML = targets.map(function (item, index) {
      var interval = item.reconnectIntervalMs || 3000;
      return '<div class="ws-card" data-index="' + index + '">'
        + '<div class="ws-card-head">'
        + '<div class="ws-name">反向 WebSocket ' + (index + 1) + '</div>'
        + '<div class="spacer"></div>'
        + '<span class="chip badge-ok">已配置</span>'
        + '</div>'
        + '<div class="ws-meta">'
        + '<span>目标</span><code>' + esc(item.url || '') + '</code>'
        + '<span>重连</span><span>' + interval + ' ms</span>'
        + '<span>token</span><span>' + (item.accessToken ? '已设置' : '未设置') + '</span>'
        + '</div>'
        + '<div class="ws-actions">'
        + '<button class="btn ghost reverse-edit" data-index="' + index + '">编辑</button>'
        + '<button class="btn danger reverse-del" data-index="' + index + '">删除</button>'
        + '</div>'
        + '</div>';
    }).join('');
    setText('reverse-status', targets.length + ' 个端点');
    list.querySelectorAll('.reverse-edit').forEach(function (button) {
      button.addEventListener('click', function () { openReverseModal(Number(button.dataset.index)); });
    });
    list.querySelectorAll('.reverse-del').forEach(function (button) {
      button.addEventListener('click', function () { deleteReverse(Number(button.dataset.index)); });
    });
  }

  function persistWs(cfg, message) {
    request('/webui/api/config', {
      method: 'POST',
      body: JSON.stringify({ config: cfg, persist: true })
    }).then(function (data) {
      state.config = cfg;
      mirrorWs(state.config);
      renderWs();
      renderReverseWs();
      showToast(message || 'WebSocket 配置已保存');
      if (data.data && data.data.restartScheduled) {
        showBanner('WebSocket 配置已改变，传输层正在重启；如果 WebUI 断开，请稍后刷新。');
      }
      setTimeout(loadOverview, 800);
    }).catch(function (error) {
      showToast('保存失败：' + (error.message || error));
    });
  }

  function setWsEnabled(index, enabled) {
    var cfg = JSON.parse(JSON.stringify(state.config || {}));
    if (!cfg.wsServers || !cfg.wsServers[index]) return;
    cfg.wsServers[index].enabled = enabled;
    mirrorWs(cfg);
    persistWs(cfg, enabled ? '端点已启用' : '端点已停用');
  }

  function openWsModal(index) {
    var servers = wsServersConfig();
    state.wsEditing = typeof index === 'number' ? index : null;
    var server = state.wsEditing !== null ? servers[state.wsEditing] : null;
    setText('ws-modal-title', server ? '编辑 WebSocket' : '新建 WebSocket');
    setValue('ws-name', server ? (server.name || '') : ('WebSocket ' + (servers.length + 1)));
    setValue('ws-host', server ? server.host : '127.0.0.1');
    setValue('ws-port', server ? server.port : 3002);
    setValue('ws-path', server ? server.path : '/');
    setValue('ws-token', server ? server.accessToken : '');
    setChecked('ws-enabled', server ? server.enabled !== false : true);
    $('ws-modal').classList.remove('hidden');
  }

  function closeWsModal() {
    $('ws-modal').classList.add('hidden');
    state.wsEditing = null;
  }

  function saveWsForm(event) {
    event.preventDefault();
    var host = $('ws-host').value.trim() || '127.0.0.1';
    var port = Number($('ws-port').value);
    if (!Number.isFinite(port) || port < 0 || port > 65535) {
      showToast('端口必须是 0-65535');
      return;
    }
    var cfg = JSON.parse(JSON.stringify(state.config || {}));
    if (!Array.isArray(cfg.wsServers)) cfg.wsServers = [];
    var server = {
      name: $('ws-name').value.trim() || ('WebSocket ' + (cfg.wsServers.length + 1)),
      enabled: $('ws-enabled').checked,
      host: host,
      port: port,
      path: $('ws-path').value.trim() || '/',
      accessToken: $('ws-token').value.trim()
    };
    if (state.wsEditing !== null) cfg.wsServers[state.wsEditing] = server;
    else cfg.wsServers.push(server);
    mirrorWs(cfg);
    persistWs(cfg, 'WebSocket 端点已保存');
    closeWsModal();
  }

  function deleteWs(index) {
    var cfg = JSON.parse(JSON.stringify(state.config || {}));
    if (!cfg.wsServers || !cfg.wsServers[index]) return;
    var name = cfg.wsServers[index].name || ('WebSocket ' + (index + 1));
    if (!confirm('删除「' + name + '」？该端点会立即停止监听。')) return;
    cfg.wsServers.splice(index, 1);
    mirrorWs(cfg);
    persistWs(cfg, '端点已删除');
  }

  function openReverseModal(index) {
    var targets = Array.isArray(state.config && state.config.reverseWs) ? state.config.reverseWs : [];
    state.reverseEditing = typeof index === 'number' ? index : null;
    var item = state.reverseEditing !== null ? targets[state.reverseEditing] : null;
    setText('reverse-modal-title', item ? '编辑反向 WebSocket' : '新建反向 WebSocket');
    setValue('reverse-url', item ? item.url : '');
    setValue('reverse-token', item && item.accessToken ? item.accessToken : '');
    setValue('reverse-interval', item && item.reconnectIntervalMs ? item.reconnectIntervalMs : 3000);
    $('reverse-modal').classList.remove('hidden');
  }

  function closeReverseModal() {
    $('reverse-modal').classList.add('hidden');
    state.reverseEditing = null;
  }

  function saveReverseForm(event) {
    event.preventDefault();
    var url = $('reverse-url').value.trim();
    var interval = Number($('reverse-interval').value) || 3000;
    if (!/^wss?:\\/\\/[^\\s]+$/i.test(url)) {
      showToast('目标地址必须是 ws:// 或 wss://');
      return;
    }
    if (interval < 500 || interval > 600000) {
      showToast('重连间隔需要在 500 - 600000 ms 之间');
      return;
    }
    var cfg = JSON.parse(JSON.stringify(state.config || {}));
    if (!Array.isArray(cfg.reverseWs)) cfg.reverseWs = [];
    var item = { url: url };
    var token = $('reverse-token').value.trim();
    if (token) item.accessToken = token;
    item.reconnectIntervalMs = interval;
    if (state.reverseEditing !== null) cfg.reverseWs[state.reverseEditing] = item;
    else cfg.reverseWs.push(item);
    persistWs(cfg, state.reverseEditing !== null ? '反向端点已保存' : '反向端点已添加');
    closeReverseModal();
  }

  function deleteReverse(index) {
    var cfg = JSON.parse(JSON.stringify(state.config || {}));
    if (!Array.isArray(cfg.reverseWs) || !cfg.reverseWs[index]) return;
    var url = cfg.reverseWs[index].url || '';
    if (!confirm('删除反向端点「' + url + '」？')) return;
    cfg.reverseWs.splice(index, 1);
    persistWs(cfg, '反向端点已删除');
  }

  function testWs(index) {
    var servers = wsServersConfig();
    var server = servers[index];
    if (!server) return;
    var url = wsUrl(server);
    if (server.accessToken) url += '?access_token=' + encodeURIComponent(server.accessToken);
    setText('ws-status', '正在测试 ' + url + ' …');
    var finished = false;
    var socket;
    try {
      socket = new WebSocket(url);
    } catch (error) {
      setText('ws-status', '测试失败：' + error.message);
      return;
    }
    var timer = setTimeout(function () {
      if (finished) return;
      finished = true;
      try { socket.close(); } catch (e) {}
      setText('ws-status', '测试超时：' + url);
      showToast('WebSocket 测试超时');
    }, 3000);
    socket.onopen = function () {
      socket.send(JSON.stringify({ action: 'get_status', params: {}, echo: 'webui-test' }));
    };
    socket.onmessage = function (event) {
      if (finished) return;
      try {
        var data = JSON.parse(event.data);
        if (data.echo === 'webui-test') {
          finished = true;
          clearTimeout(timer);
          socket.close();
          setText('ws-status', '连接成功：' + url);
          showToast('WebSocket 连接成功');
        }
      } catch (e) {
        // ignore
      }
    };
    socket.onerror = function () {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      setText('ws-status', '连接失败：' + url);
      showToast('WebSocket 连接失败');
    };
  }

  function saveNetwork() {
    if (!state.config) return;
    var cfg = collectConfig();
    if (!validateNetwork(cfg)) return;
    $('net-save').disabled = true;
    setText('net-status', '保存中…');
    request('/webui/api/config', {
      method: 'POST',
      body: JSON.stringify({ config: cfg, persist: true })
    }).then(function (data) {
      state.config = cfg;
      state.configPath = data.data && data.data.configPath ? data.data.configPath : state.configPath;
      var result = data.data || {};
      setNetDirty(false);
      if (result.restartScheduled) {
        var host = (cfg.http.host === '0.0.0.0' || cfg.http.host === '::')
          ? (window.location.hostname || '127.0.0.1')
          : cfg.http.host;
        var url = 'http://' + host + ':' + cfg.http.port + '/webui/';
        showBanner('监听地址/端口已改变，传输层正在重启。如果 WebUI 断开，请打开新地址：<a href="' + esc(url) + '">' + esc(url) + '</a>');
        showToast('配置已保存，正在重启连接');
      } else {
        hideBanner();
        showToast('配置已保存并应用');
      }
      setTimeout(loadOverview, 700);
    }).catch(function (error) {
      setNetDirty(true);
      setText('net-status', '保存失败：' + (error.message || error));
      showToast('保存失败：' + (error.message || error));
    });
  }

  /** 保存前把明显的 URL 错误挑出来，避免“保存成功但连接一直失败”。 */
  function validateNetwork(cfg) {
    var invalid = 0;
    Array.prototype.forEach.call(document.querySelectorAll('#net-post-list .post-row'), function (row) {
      var input = row.querySelector('.post-url');
      var url = input.value.trim();
      var secret = row.querySelector('.post-secret').value.trim();
      var ok = url ? /^https?:\\/\\/[^\\s]+$/i.test(url) : !secret;
      input.classList.toggle('invalid', !ok);
      if (!ok) invalid++;
    });
    if (invalid > 0) {
      showToast('有 ' + invalid + ' 个地址格式不对，已标红');
      setText('net-status', '请先修正标红的地址');
      return false;
    }
    if (cfg.httpPost.length > 40 || cfg.reverseWs.length > 40) {
      showToast('HTTP POST / 反向 WS 各最多 40 个');
      return false;
    }
    return true;
  }

  function reloadConfig() {
    request('/webui/api/reload', { method: 'POST' }).then(function (data) {
      showToast('已从磁盘重载');
      return loadConfig().then(loadOverview);
    }).catch(function (error) {
      showToast('重载失败：' + (error.message || error));
    });
  }

  function restartConnections() {
    request('/webui/api/restart', { method: 'POST' }).then(function () {
      showToast('连接已重启');
      setTimeout(loadOverview, 700);
    }).catch(function (error) {
      showToast('重启失败：' + (error.message || error));
    });
  }

  function runAction() {
    var name = $('action-name').value.trim();
    var raw = $('action-params').value.trim() || '{}';
    var params;
    try { params = JSON.parse(raw); } catch (error) {
      $('action-result').textContent = '参数不是合法 JSON：' + error.message;
      return;
    }
    $('action-run').disabled = true;
    $('action-result').textContent = '执行中…';
    request('/webui/api/action', {
      method: 'POST',
      body: JSON.stringify({ action: name, params: params })
    }).then(function (data) {
      $('action-result').textContent = JSON.stringify(data, null, 2);
      showToast(name + ' → ' + (data.retcode === 0 ? 'ok' : 'failed'));
    }).catch(function (error) {
      $('action-result').textContent = String(error.message || error);
      showToast('执行失败');
    }).finally(function () { $('action-run').disabled = false; });
  }

  function simulate() {
    var type = $('sim-type').value;
    var payload = {
      message_type: type,
      user_id: Number($('sim-user').value) || 20001,
      group_id: type === 'group' ? (Number($('sim-group').value) || 30001) : undefined,
      message: $('sim-message').value
    };
    $('sim-run').disabled = true;
    request('/webui/api/simulate', { method: 'POST', body: JSON.stringify(payload) }).then(function (data) {
      $('sim-result').textContent = JSON.stringify(data, null, 2);
      showToast('消息已注入');
    }).catch(function (error) {
      $('sim-result').textContent = String(error.message || error);
      showToast('注入失败');
    }).finally(function () { $('sim-run').disabled = false; });
  }

  function refreshLogs() {
    if (state.paused) return;
    request('/webui/api/logs?since=' + state.lastLogSeq + '&limit=250').then(function (data) {
      var entries = data.entries || [];
      if (!entries.length && state.lastLogSeq === 0) return;
      if (state.lastLogSeq === 0) state.logs = entries;
      else state.logs = state.logs.concat(entries);
      if (entries.length) state.lastLogSeq = entries[entries.length - 1].seq;
      if (state.logs.length > 800) state.logs = state.logs.slice(-800);
      renderLogs();
    }).catch(function () {});
  }

  function renderLogs() {
    var level = state.logLevel;
    var search = state.logSearch.toLowerCase();
    var weights = { trace: 10, debug: 20, info: 30, warn: 40, error: 50 };
    var min = level === 'all' ? 0 : weights[level] || 0;
    var list = $('log-list');
    var rows = state.logs.filter(function (entry) {
      if (min && (weights[entry.level] || 0) < min) return false;
      if (search && String(entry.message).toLowerCase().indexOf(search) < 0
        && String(entry.scope).toLowerCase().indexOf(search) < 0) return false;
      return true;
    }).slice(-400);
    var atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 20;
    list.innerHTML = rows.map(function (entry) {
      return '<div class="log-line ' + esc(entry.level) + '">'
        + '<span class="log-time">' + new Date(entry.time).toLocaleTimeString() + '</span>'
        + '<span class="log-level">' + esc(entry.level.toUpperCase()) + '</span>'
        + '<span class="log-scope">' + esc(entry.scope) + '</span>'
        + '<span class="log-msg">' + esc(entry.message) + '</span>'
        + '</div>';
    }).join('');
    setText('log-count', rows.length + ' / ' + state.logs.length);
    if (atBottom) list.scrollTop = list.scrollHeight;
  }

  function downloadLogs() {
    var text = state.logs.map(function (entry) {
      return new Date(entry.time).toISOString() + ' [' + entry.level + '] [' + entry.scope + '] ' + entry.message;
    }).join('\\n');
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'shadowdream.log';
    link.click();
    URL.revokeObjectURL(url);
  }

  function loadAll() {
    loadOverview();
    // 有未保存的表单修改时不重新拉配置，避免刷新按钮把编辑内容冲掉。
    if (state.view === 'network' && state.netDirty) {
      showToast('已保留未保存的修改');
    } else if (state.view === 'network' || state.view === 'ws') {
      loadConfig();
    }
    if (state.view === 'logs') refreshLogs();
    if (state.view === 'update') loadUpdateInfo();
  }

  document.querySelectorAll('.nav-item').forEach(function (item) {
    item.addEventListener('click', function () { switchView(item.dataset.view); });
  });
  document.querySelectorAll('[data-goto]').forEach(function (item) {
    item.addEventListener('click', function () { switchView(item.dataset.goto); });
  });
  document.querySelectorAll('.copy').forEach(function (button) {
    button.addEventListener('click', function () {
      var target = $(button.dataset.copy);
      if (!target) return;
      navigator.clipboard.writeText(target.textContent || '').then(function () { showToast('已复制'); });
    });
  });

  $('gen-webui-token').addEventListener('click', function () {
    var bytes = new Uint8Array(15);
    crypto.getRandomValues(bytes);
    var token = btoa(String.fromCharCode.apply(null, bytes))
      .split('+').join('-').split('/').join('_').replace(/=+$/, '');
    $('net-webui-token').value = token;
    setNetDirty(true);
    showToast('已生成 20 位 token，保存后生效');
  });
  $('logout-btn').addEventListener('click', async function () {
    try { await fetch('/webui/api/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem(TOKEN_KEY);
    location.replace('/webui/');
  });
  $('refresh-btn').addEventListener('click', function () { loadAll(); showToast('已刷新'); });
  $('net-save').addEventListener('click', saveNetwork);
  $('net-reload').addEventListener('click', reloadConfig);
  $('net-restart').addEventListener('click', restartConnections);
  // 网络与推送是一张整页表单：任何输入都标记为“未保存”。
  $('view-network').addEventListener('input', function () { setNetDirty(true); });
  $('view-network').addEventListener('change', function () { setNetDirty(true); });
  $('net-add-post').addEventListener('click', function () {
    addPostRow({});
    setNetDirty(true);
  });
  $('ws-new').addEventListener('click', function () { openWsModal(); });
  $('ws-refresh').addEventListener('click', function () { loadConfig(); });
  $('ws-form').addEventListener('submit', saveWsForm);
  $('ws-cancel').addEventListener('click', closeWsModal);
  $('reverse-new').addEventListener('click', function () { openReverseModal(); });
  $('reverse-form').addEventListener('submit', saveReverseForm);
  $('reverse-cancel').addEventListener('click', closeReverseModal);
  $('action-run').addEventListener('click', runAction);
  $('action-fill').addEventListener('click', function () {
    $('action-name').value = 'send_group_msg';
    $('action-params').value = JSON.stringify({
      group_id: 30001,
      message: [
        { type: 'text', data: { text: '来自 Shadow Dream 控制台的问候 ' } },
        { type: 'at', data: { qq: '20001' } }
      ]
    }, null, 2);
  });
  $('sim-run').addEventListener('click', simulate);
  $('log-level').addEventListener('change', function (event) { state.logLevel = event.target.value; renderLogs(); });
  $('log-search').addEventListener('input', function (event) { state.logSearch = event.target.value; renderLogs(); });
  $('log-pause').addEventListener('click', function () {
    state.paused = !state.paused;
    $('log-pause').textContent = state.paused ? '继续' : '暂停';
  });
  $('log-clear').addEventListener('click', function () {
    state.logs = [];
    $('log-list').innerHTML = '';
    setText('log-count', '0');
  });
  $('log-download').addEventListener('click', downloadLogs);
  $('update-check').addEventListener('click', loadUpdateInfo);
  $('update-apply').addEventListener('click', applyUpdateUI);
  $('acc-refresh').addEventListener('click', function () { loadOverview().then(function () { showToast('账号状态已刷新'); }); });

  var initialView = location.hash.replace(/^#/, '');
  switchView(viewMeta[initialView] ? initialView : 'overview');
  loadOverview();

  // 深浅主题：首次跟随系统，手动切换后记住选择。
  $('theme-toggle').addEventListener('click', function () {
    var dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('shadowdream.theme', dark ? 'dark' : 'light'); } catch (e) {}
    showToast(dark ? '已切换到深色模式' : '已切换到浅色模式');
  });
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (event) {
      var saved = null;
      try { saved = localStorage.getItem('shadowdream.theme'); } catch (e) {}
      if (saved) return;
      document.documentElement.classList.toggle('dark', event.matches);
    });
  } catch (e) {}

  setInterval(function () { if (state.view !== 'logs') loadOverview(); }, 3000);
  setInterval(function () {
    if (state.view === 'logs') refreshLogs();
    else if (!state.paused) refreshLogs();
  }, 2000);
})();
`;
