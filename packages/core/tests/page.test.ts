import test from 'node:test';
import assert from 'node:assert/strict';
import { WEBUI_CSS, WEBUI_HTML, WEBUI_JS } from '../src/webui/page.js';

test('WebUI 内联脚本语法合法', () => {
  assert.doesNotThrow(() => new Function(WEBUI_JS));
  assert.match(WEBUI_JS, /webui\/api\/overview/);
  assert.match(WEBUI_JS, /webui\/api\/action/);
});

test('WebUI HTML 与样式的关键结构', () => {
  assert.match(WEBUI_HTML, /SHADOW DREAM/);
  assert.match(WEBUI_HTML, /id="log-list"/);
  assert.match(WEBUI_HTML, /__CSS__/);
  assert.match(WEBUI_HTML, /__JS__/);
  assert.match(WEBUI_CSS, /--accent/);
  assert.match(WEBUI_CSS, /grid-template-columns/);
});
