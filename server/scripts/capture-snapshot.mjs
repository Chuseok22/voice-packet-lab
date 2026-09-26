// 실행 중인 서버에 실제로 연결해서 연결 과정 화면의 "서버 미연결" 스냅샷을 다시 만든다.
// 사용: pnpm build && pnpm start & 후
//       node server/scripts/capture-snapshot.mjs ws://127.0.0.1:3000/ws/voice-gateway?v=8
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const target = process.argv[2] ?? 'ws://127.0.0.1:3000/ws/voice-gateway?v=8';
const { host } = new URL(target);
const outputPath = fileURLToPath(new URL('../../client/src/features/connection/snapshotData.ts', import.meta.url));

const identify = {
  op: 0,
  d: { server_id: '111111111111111111', user_id: '222222222222222222', session_id: 'demo-session', token: 'demo-token' },
};

// 서버가 handshake와 Hello를 연달아 보내므로, 리스너를 그때그때 붙이면 두 번째 프레임을 놓친다. 연결 직후부터 큐에 쌓는다.
function createFrameReader(socket) {
  const frames = [];
  const waiters = [];
  socket.on('message', (data) => {
    const frame = JSON.parse(data.toString());
    const waiter = waiters.shift();
    if (waiter) waiter.resolve(frame);
    else frames.push(frame);
  });
  socket.on('close', () => {
    waiters.splice(0).forEach((waiter) => waiter.reject(new Error('서버가 연결을 닫았습니다.')));
  });
  return () =>
    new Promise((resolve, reject) => {
      if (frames.length > 0) resolve(frames.shift());
      else waiters.push({ resolve, reject });
    });
}

const socket = new WebSocket(target, { headers: { Origin: `http://${host}` } });
const nextFrame = createFrameReader(socket);
await new Promise((resolve, reject) => {
  socket.once('open', resolve);
  socket.once('error', reject);
});

const handshake = await nextFrame();
const hello = await nextFrame();
socket.send(JSON.stringify(identify));
const ready = await nextFrame();

const sentAt = Date.now();
const heartbeat = { op: 3, d: { t: sentAt, seq_ack: 0 } };
socket.send(JSON.stringify(heartbeat));
const ack = await nextFrame();
const rttMs = Math.max(1, Date.now() - sentAt);
socket.close();

if (handshake.type !== 'handshake' || hello.op !== 8 || ready.op !== 2 || ack.op !== 6) {
  throw new Error('예상하지 못한 응답 순서입니다. 서버 버전을 확인하세요.');
}

const source = `import type { ConnectionSnapshot } from './snapshotTypes';

// 이 파일은 server/scripts/capture-snapshot.mjs 가 실제 서버 응답으로 생성합니다. 직접 수정하지 마세요.
export const snapshotData: ConnectionSnapshot = ${JSON.stringify(
  { request: handshake.request, response: handshake.response, hello, ready, heartbeat: { sent: heartbeat, ack, rttMs } },
  null,
  2,
)};
`;

await writeFile(outputPath, source, 'utf8');
process.stdout.write(`스냅샷을 저장했습니다: ${outputPath}\n`);
