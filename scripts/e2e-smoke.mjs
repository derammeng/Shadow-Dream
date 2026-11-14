import WebSocket from 'ws';

const HTTP = process.env.FD_HTTP ?? 'http://127.0.0.1:3200';
const WS = process.env.FD_WS ?? 'ws://127.0.0.1:3201';

async function call(action, params = {}, echo = action) {
  const response = await fetch(`${HTTP}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params, echo }),
  });
  const body = await response.json();
  if (body.retcode !== 0) throw new Error(`${action} failed: ${JSON.stringify(body)}`);
  return body;
}

async function simulate(payload) {
  const response = await fetch(`${HTTP}/webui/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (body.retcode !== 0) throw new Error(`simulate failed: ${JSON.stringify(body)}`);
  return body;
}

const ws = new WebSocket(WS, { headers: { 'X-Client-Role': 'universal' } });
const events = [];
ws.on('message', raw => {
  const data = JSON.parse(raw.toString());
  events.push(data);
  if (data.post_type === 'message') {
    console.log('  <- message', data.message_type, data.group_id ?? data.user_id, data.message.map(s => s.type).join('+'));
  }
  if (data.post_type === 'notice') {
    console.log('  <- notice', data.notice_type);
  }
});

await new Promise((resolve, reject) => {
  ws.once('open', resolve);
  ws.once('error', reject);
});
console.log('WS connected');

const status = await call('get_status');
console.log('status', status.data.online, status.data.stat.message_received);

const simulated = await simulate({
  message_type: 'group',
  group_id: 30001,
  user_id: 20001,
  message: '端到端测试：你好，影梦 [CQ:face,id=14]',
});
console.log('simulated', simulated.data.message_id);

await new Promise(resolve => setTimeout(resolve, 250));
const message = await call('get_msg', { message_id: simulated.data.message_id });
console.log('get_msg', message.data.raw_message);

const sent = await call('send_group_msg', {
  group_id: 30001,
  message: [
    { type: 'reply', data: { id: String(simulated.data.message_id) } },
    { type: 'text', data: { text: '收到，这是回复 ' } },
    { type: 'at', data: { qq: '20001' } },
  ],
});
console.log('sent', sent.data.message_id);

const members = await call('get_group_member_list', { group_id: 30001 });
console.log('members', members.data.length);
const friends = await call('get_friend_list');
console.log('friends', friends.data.length);

const overview = await (await fetch(`${HTTP}/webui/api/overview`)).json();
console.log('overview', overview.backend.name, overview.status.stat.message_received, overview.status.stat.message_sent);

await call('delete_msg', { message_id: simulated.data.message_id });
await new Promise(resolve => setTimeout(resolve, 250));

const hasMessage = events.some(event => event.post_type === 'message' && event.group_id === 30001);
const hasReplyRecall = events.some(event => event.post_type === 'notice' && event.notice_type === 'group_recall');
if (!hasMessage) throw new Error('没有收到 message 事件');
if (!hasReplyRecall) throw new Error('没有收到 group_recall 通知');
console.log('events', events.length, 'ok');
ws.close();
