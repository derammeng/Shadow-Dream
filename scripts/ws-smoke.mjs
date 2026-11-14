import WebSocket from 'ws';

const ws = new WebSocket('ws://127.0.0.1:3101/', {
  headers: { 'X-Client-Role': 'universal' },
});

let step = 0;
const timer = setTimeout(() => {
  console.error('timeout');
  process.exit(2);
}, 8000);

ws.on('open', () => {
  console.log('open');
  ws.send(JSON.stringify({ action: 'get_login_info', params: {}, echo: 'login' }));
});

ws.on('message', async (raw) => {
  const data = JSON.parse(raw.toString());
  console.log('recv', JSON.stringify(data));
  if (data.echo === 'login') {
    step = 1;
    const response = await fetch('http://127.0.0.1:3100/webui/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_type: 'group',
        user_id: 20002,
        group_id: 30001,
        message: 'WebSocket 事件测试 ✅',
      }),
    });
    console.log('simulate', response.status, await response.text());
  } else if (data.post_type === 'message') {
    console.log('event-ok', data.message[0].data.text);
    clearTimeout(timer);
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (error) => {
  console.error('ws error', error.message);
  process.exit(1);
});
