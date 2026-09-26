export type StepId =
  | 'tcp'
  | 'tls'
  | 'upgrade-request'
  | 'upgrade-response'
  | 'hello'
  | 'identify'
  | 'ready'
  | 'heartbeat'
  | 'select-protocol'
  | 'udp';

export type StepLayer = 'transport' | 'security' | 'application';
export type StepKind = 'live' | 'explain';

export interface ConnectionStepContent {
  id: StepId;
  layer: StepLayer;
  kind: StepKind;
  title: string;
  summary: string;
  detail: string;
  source: string;
}

const DISCORD_DOCS = 'Discord Developer Docs — Voice Connections';

export const CONNECTION_STEPS: readonly ConnectionStepContent[] = [
  {
    id: 'tcp',
    layer: 'transport',
    kind: 'explain',
    title: 'TCP 3-way handshake',
    summary: '클라이언트와 서버가 먼저 TCP 연결을 만듭니다.',
    detail:
      'SYN → SYN/ACK → ACK 세 번의 교환으로 연결이 열립니다. 브라우저 JavaScript는 이 과정을 볼 수 없어서 이 화면에서는 설명만 합니다.',
    source: 'RFC 9293 (TCP)',
  },
  {
    id: 'tls',
    layer: 'security',
    kind: 'explain',
    title: 'TLS 핸드셰이크 (wss)',
    summary: 'wss:// 주소는 TCP 위에서 먼저 TLS로 통신을 암호화합니다.',
    detail:
      '암호화 방식과 키를 합의한 뒤에야 HTTP 요청이 오갑니다. 이 과정도 브라우저 JavaScript에서는 관찰할 수 없어 설명만 합니다.',
    source: 'RFC 8446 (TLS 1.3)',
  },
  {
    id: 'upgrade-request',
    layer: 'application',
    kind: 'live',
    title: 'HTTP 업그레이드 요청',
    summary: 'HTTP GET 요청으로 "WebSocket으로 바꿔 달라"고 요청합니다.',
    detail:
      '`Upgrade: websocket`, `Connection: Upgrade` 헤더와 임의 값 `Sec-WebSocket-Key`를 보냅니다. 여기까지는 평범한 HTTP 요청입니다.',
    source: 'RFC 6455 §1.3, §4.1',
  },
  {
    id: 'upgrade-response',
    layer: 'application',
    kind: 'live',
    title: '101 Switching Protocols',
    summary: 'HTTP로 시작했지만 이 연결은 이제 WebSocket입니다.',
    detail:
      '서버가 `101` 상태 코드와 `Sec-WebSocket-Accept`(요청의 Key로 계산한 값)를 돌려주면, 이 TCP 연결은 HTTP를 그만두고 WebSocket 프레임을 주고받습니다.',
    source: 'RFC 6455 §1.3, §4.2.2',
  },
  {
    id: 'hello',
    layer: 'application',
    kind: 'live',
    title: 'Hello 수신 (op 8)',
    summary: 'Voice Gateway가 Heartbeat를 보낼 주기를 알려 줍니다.',
    detail:
      '`heartbeat_interval`은 클라이언트가 Heartbeat를 보내야 하는 간격(ms)입니다. 이 학습용 서버는 화면에서 잘 보이도록 짧은 값(5초)을 씁니다.',
    source: DISCORD_DOCS,
  },
  {
    id: 'identify',
    layer: 'application',
    kind: 'live',
    title: 'Identify 전송 (op 0)',
    summary: '누구이고 어떤 세션인지 서버에 알립니다.',
    detail:
      '`server_id`, `user_id`, `session_id`, `token`을 담아 보냅니다. 실제 Discord에서는 앞서 Discord Gateway로 받은 값을 쓰고, 이 화면은 더미 값을 보냅니다.',
    source: DISCORD_DOCS,
  },
  {
    id: 'ready',
    layer: 'application',
    kind: 'live',
    title: 'Ready 수신 (op 2)',
    summary: '서버가 음성 UDP 연결에 쓸 정보를 알려 줍니다.',
    detail:
      '`ssrc`, UDP `ip`와 `port`, 사용할 수 있는 암호화 `modes`가 들어 있습니다. 이 화면의 값은 모두 예시입니다.',
    source: DISCORD_DOCS,
  },
  {
    id: 'heartbeat',
    layer: 'application',
    kind: 'live',
    title: 'Heartbeat ↔ ACK (op 3 / op 6)',
    summary: '연결이 살아 있는지 주기적으로 확인합니다.',
    detail: 'Heartbeat에 넣은 `t`가 ACK로 그대로 돌아옵니다. 그래서 왕복 시간(RTT)을 잴 수 있습니다.',
    source: DISCORD_DOCS,
  },
  {
    id: 'select-protocol',
    layer: 'application',
    kind: 'explain',
    title: 'Select Protocol · Session Description (op 1 / op 4)',
    summary: '사용할 UDP 방식을 고르고 최종 설정을 받습니다.',
    detail:
      '이 학습용 서버는 이 단계를 구현하지 않습니다. 실제로는 IP Discovery로 알아낸 외부 IP와 Port, 암호화 방식을 서버에 알리고, 서버가 Session Description으로 최종 설정을 돌려줍니다.',
    source: DISCORD_DOCS,
  },
  {
    id: 'udp',
    layer: 'transport',
    kind: 'explain',
    title: '이제 음성은 UDP로 흐릅니다',
    summary: '제어는 WebSocket, 음성은 RTP over UDP입니다.',
    detail:
      '여기서부터는 Opus로 인코딩된 음성이 RTP 패킷에 담겨 UDP로 전송됩니다. 그 과정에서 생기는 손실, 지연, 지터를 패킷 랩에서 직접 체험해 보세요.',
    source: 'RFC 3550 (RTP)',
  },
];

export const HEADER_HINTS: Readonly<Record<string, string>> = {
  host: '요청을 받는 서버의 이름입니다.',
  connection: '`Upgrade`는 이 연결의 프로토콜을 바꾸고 싶다는 뜻입니다.',
  upgrade: '`websocket`으로 바꿔 달라는 요청입니다. 서버도 같은 값으로 승인합니다.',
  'sec-websocket-key': '클라이언트가 만든 임의의 값입니다. 서버는 이 값으로 `Sec-WebSocket-Accept`를 계산합니다.',
  'sec-websocket-version': '사용할 WebSocket 프로토콜 버전입니다(13).',
  'sec-websocket-extensions': '압축 같은 확장 기능을 협상하는 헤더입니다.',
  origin: '요청을 보낸 웹 페이지의 출처입니다. 서버는 이 값으로 접속을 허용할지 판단합니다.',
  'sec-websocket-accept':
    '서버가 요청의 Key로 계산해 돌려준 값입니다. 이 값이 맞아야 클라이언트가 업그레이드를 받아들입니다.',
  'sec-websocket-protocol': '협상된 하위 프로토콜입니다.',
};

export const REQUEST_LINE_HINT =
  'HTTP 요청의 첫 줄입니다. 메서드(GET), 경로, HTTP 버전이 들어 있고, ?v=8은 Voice Gateway 버전입니다.';
export const STATUS_LINE_HINT = '`101 Switching Protocols`는 "요청대로 프로토콜을 바꿨다"는 뜻입니다.';
export const OTHER_STATUS_LINE_HINT = 'HTTP 응답의 첫 줄입니다. 상태 코드가 결과를 알려 줍니다.';

export const connectionContent = {
  title: '연결 과정',
  tagline: '음성 채널에 들어가면 음성을 보내기 전에 어떤 통신이 오갈까요?',
  notice: '학습용 mock 서버 · Discord가 아님 · 메시지 값은 예시 · 표시되는 요청은 앱 서버가 받은 것',
  actions: {
    connect: '연결하기',
    reconnect: '다시 연결하기',
    sendIdentify: 'Identify 보내기',
    toPacketLab: '패킷 랩으로 이동',
  },
  status: {
    idle: '아래 버튼을 눌러 실제 서버에 연결해 보세요.',
    connecting: '서버에 연결하는 중…',
    live: '실제 서버와 연결되었습니다.',
    snapshot: '예시 (서버 미연결) — 미리 저장해 둔 실제 응답을 보여 줍니다.',
  },
  panel: {
    request: 'HTTP 업그레이드 요청',
    response: 'HTTP 응답',
    waiting: '연결하면 여기에 표시됩니다.',
    hint: '줄을 눌러 각 헤더의 뜻을 확인하세요.',
    noHint: '이 줄에 대한 설명은 준비되어 있지 않습니다.',
  },
  log: {
    title: '주고받은 메시지',
    empty: '아직 주고받은 메시지가 없습니다.',
    sent: '보냄',
    received: '받음',
  },
  timeline: {
    title: '연결 단계',
    layers: { transport: '전송 계층', security: '보안(TLS)', application: '응용 계층' },
    kinds: { live: '실제', explain: '설명 전용' },
    source: '출처',
    more: '자세히',
  },
  heartbeat: (count: number, rttMs: number | null) =>
    rttMs === null ? `Heartbeat ${count}회` : `Heartbeat ${count}회 · 마지막 RTT ${Math.round(rttMs)}ms`,
  errors: {
    unreachable: '서버에 연결하지 못했습니다.',
    timeout: '서버 응답이 없어 연결하지 못했습니다.',
    dropped: '서버와의 연결이 끊어졌습니다.',
    identifyTimeout:
      '10초 안에 Identify를 보내지 않아 서버가 연결을 끝냈습니다(4009). 다시 연결한 뒤 바로 Identify를 눌러 주세요.',
    badFrame: '서버가 알 수 없는 메시지를 보냈습니다.',
  },
} as const;
