import { WebSocketServer } from 'ws';

const server = new WebSocketServer({ port: 3301, host: '127.0.0.1' });
let phase = 0;

server.on('connection', ws => {
  console.log('reverse client connected');
  ws.send(JSON.stringify({ action: 'get_login_info', params: {}, echo: 'rev-1' }));
  ws.on('message', async raw => {
    const data = JSON.parse(raw.toString());
    console.log('bot ->', data.echo ?? data.post_type ?? data.status);
    if (data.echo === 'rev-1') {
      if (data.retcode !== 0) throw new Error('reverse API failed');
      phase = 1;
      const response = await fetch('http://127.0.0.1:3300/webui/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_type: 'private',
          user_id: 20002,
          message: '反向 WS 事件测试',
        }),
      });
      console.log('simulate', response.status);
    } else if (phase === 1 && data.post_type === 'message') {
      console.log('event ok', data.message[0].data.text);
      ws.close();
      server.close();
      process.exit(0);
    }
  });
});

setTimeout(() => {
  console.error('timeout');
  process.exit(2);
}, 8000).unref();
