# Voice Packet Lab

컴퓨터네트워크 과제1(Discord Voice) 팀 발표용 실습 웹 앱이다. 청중이 QR로 접속해서 조작한다.

- **패킷 랩** (`/`): Packet Loss, Delay, Jitter, Jitter Buffer를 바꾸며 같은 음성이 어떻게 달라지는지 듣고, 송신/수신 레인과 RTP 헤더(Sequence Number, Timestamp, SSRC)를 눌러 본다.
- **연결 과정** (`/connect`): HTTP Upgrade(`101 Switching Protocols`)와 Voice Gateway 메시지(Hello, Identify, Ready, Heartbeat)를 학습용 mock 서버와 실제로 주고받는다. 서버에 닿지 못하면 미리 캡처해 둔 응답("예시")으로 자동 전환된다.
- **발표자 모드** (`/presenter`): 비밀번호를 입력하면 내 목소리 녹음/파일 업로드로 실습한다. 녹음은 브라우저 메모리에만 있고 전송되지 않는다.

> 본 실습은 RTP/UDP 기반 실시간 음성 전송의 Packet Loss, Delay, Jitter를 이해하기 위한 시뮬레이션이다. 실제 Discord 음성 패킷을 송수신하지 않으며, 실제 Discord는 PCM이 아닌 Opus를 사용한다. 연결 과정 화면의 서버는 Discord가 아닌 학습용 mock이고 메시지 값은 예시다.

## 요구사항

Node 22, pnpm (`corepack enable` 후 `package.json`의 `packageManager` 버전 사용)

## 개발

```bash
pnpm install
pnpm dev          # client(5173) + server(3000). /ws 는 Vite가 서버로 프록시한다
pnpm test         # 전체 단위/통합 테스트
pnpm typecheck
pnpm build        # client/dist + server/dist/index.cjs
pnpm start
```

## 환경변수

| 이름 | 시점 | 설명 |
|---|---|---|
| `VITE_PRESENTER_PASSWORD` | 빌드 | 발표자 비밀번호(평문). 저장소 루트 `.env`에 둔다 |

서버 포트(3000), 동시 연결 상한(200), 정적 파일 위치(`client/dist`)는 코드에 고정되어 있고 환경변수로 바꾸지 않는다. WebSocket은 same-origin만 허용한다.

`.env.example`을 `.env`로 복사해 값을 채운다. `.env`는 git에 올라가지 않으며, 배포에서는 이 파일 내용을 GitHub Secret으로 등록해 CI가 빌드 전에 `.env`로 써 넣는다.

WebSocket의 Origin 검사는 브라우저가 항상 보내는 `Origin`을 대상으로 한다. `Origin`이 없는 요청(curl, 테스트 클라이언트)은 허용한다.

mock 서버는 실제 Discord 음성 게이트웨이처럼 Identify보다 먼저 Heartbeat를 받는다(클라이언트는 Hello 직후 Heartbeat를 보낸다). Identify 전에 그 밖의 opcode를 보내면 4003으로 닫고, 연결 후 10초 안에 Identify를 보내지 않으면 4009로 소켓을 닫는다.

발표자 게이트는 실수 방지용 스위치다. 비밀번호가 평문으로 번들에 들어가므로 진짜 보안이 아니다(다른 곳에 쓰는 비밀번호를 쓰지 않는다)(지킬 비밀이 없다: 녹음/업로드는 그 브라우저 메모리에만 남는다).

## Docker

```bash
docker build -t voice-packet-lab .   # 루트 .env를 빌드에 사용한다
docker run --rm -p 3000:3000 voice-packet-lab
```

이미지는 단일 Node 컨테이너이며 `/healthz`로 헬스체크한다. 배포는 `.github/workflows/voice-packet-lab-cicd.yaml`이 담당한다(main push 시 테스트 → DockerHub 이미지 빌드/푸시 → SSH 배포, 호스트 포트 8089). 필요한 GitHub Secrets: `ENV_FILE`(`.env` 전체 내용), `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `SERVER_HOST`, `SERVER_USER`, `SERVER_PASSWORD`, `SERVER_PORT`.

## 리버스 프록시 요구사항

- HTTPS로 서비스해야 한다(마이크 녹음과 `wss://`에 필요).
- `Upgrade`/`Connection` 헤더를 통과시켜야 한다. nginx 예:

```nginx
location /ws/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $http_host;
    proxy_read_timeout 120s;
}
```

- `Host` 헤더를 보존해야 서버의 same-origin 검사가 통과한다. (다른 Origin으로 서비스하는 구성은 지원하지 않는다.)

## 발표 전 준비

1. 기본 음원 교체: `client/public/audio/sample.wav`를 직접 녹음한 48kHz 모노 WAV로 바꾼다(임시본은 `bash scripts/make-sample-audio.sh`, macOS 전용).
2. 스냅샷 재생성(서버를 띄운 뒤): `node server/scripts/capture-snapshot.mjs ws://127.0.0.1:3000/ws/voice-gateway?v=8`
3. 실기기에서 직접 확인한다: 이어폰으로 정상·손실·지터·버퍼 소리 비교, iOS Safari와 Android Chrome 재생, QR 접속, 프록시 뒤 wss/101 핸드셰이크와 "예시 (서버 미연결)" 폴백, 발표자 녹음. (더 긴 점검표는 git에 올라가지 않는 로컬 `docs/manual-checklist.md`에 있을 수 있다.)

## 검증

```bash
pnpm exec playwright install chromium
pnpm e2e          # 빌드 후 서버를 띄워 E2E, 반응형, 접근성 검사
```

## 출처

- Discord Developer Docs — Voice Connections: https://docs.discord.com/developers/topics/voice-connections
- RFC 6455 (WebSocket), RFC 3550 (RTP), RFC 9293 (TCP), RFC 8446 (TLS 1.3)

---

<!-- AUTO-VERSION-SECTION: DO NOT EDIT MANUALLY -->
## 최신 버전 : v0.2.0 (2026-09-29)

[전체 버전 기록 보기](CHANGELOG.md)
