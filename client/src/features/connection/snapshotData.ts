import type { ConnectionSnapshot } from './snapshotTypes';

// 이 파일은 server/scripts/capture-snapshot.mjs 가 실제 서버 응답으로 생성합니다. 직접 수정하지 마세요.
export const snapshotData: ConnectionSnapshot = {
  "request": "GET /ws/voice-gateway?v=8 HTTP/1.1\nOrigin: http://127.0.0.1:3100\nSec-WebSocket-Version: 13\nSec-WebSocket-Key: XF07vjTZxRS1U3yMUfvYjg==\nConnection: Upgrade\nUpgrade: websocket\nSec-WebSocket-Extensions: permessage-deflate; client_max_window_bits\nHost: 127.0.0.1:3100",
  "response": "HTTP/1.1 101 Switching Protocols\nUpgrade: websocket\nConnection: Upgrade\nSec-WebSocket-Accept: ekALeWriIELYzXEd4ARfv6oufRc=",
  "hello": {
    "op": 8,
    "d": {
      "heartbeat_interval": 5000
    }
  },
  "ready": {
    "op": 2,
    "d": {
      "ssrc": 1234567,
      "ip": "203.0.113.10",
      "port": 50000,
      "modes": [
        "example_mode_a",
        "example_mode_b"
      ]
    }
  },
  "heartbeat": {
    "sent": {
      "op": 3,
      "d": {
        "t": 1790422837097,
        "seq_ack": 0
      }
    },
    "ack": {
      "op": 6,
      "d": {
        "t": 1790422837097
      }
    },
    "rttMs": 1
  }
};
