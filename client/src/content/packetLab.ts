import type { ScenarioId } from '../engine/settings';

const scenarioLabels: Record<ScenarioId, string> = {
  normal: '정상',
  loss: '패킷 손실',
  jitter: '심한 지터',
  'jitter-buffer': '지터 + 버퍼',
};

export const packetLabContent = {
  title: 'Voice Packet Lab',
  tagline: '네트워크 상태를 바꾸며, 같은 음성이 어떻게 달라지는지 직접 확인해 보세요',
  steps: [
    { title: '시나리오 선택', description: '버튼 하나로 대표 상황 적용' },
    { title: '슬라이더 조절', description: '손실·지연·지터·버퍼 변경' },
    { title: '▶ 눌러서 듣기', description: '정상 음성과 번갈아 비교' },
    { title: '패킷 눌러보기', description: 'RTP 정보를 확인' },
  ],
  cards: {
    scenario: '시나리오',
    conditions: '네트워크 조건',
    listen: '들어보기',
    lanes: '패킷은 어떻게 도착했나?',
    compare: '결과 비교',
  },
  hints: {
    listen: '같은 음성을 두 가지로 비교하세요',
    lanes: '패킷을 눌러보세요',
  },
  scenarios: scenarioLabels,
  sliders: {
    lossPercent: {
      label: 'Packet Loss',
      description: '도착하지 못하는 패킷 비율',
      effect: '소리가 끊깁니다',
    },
    delayMs: {
      label: 'Delay',
      description: '패킷이 오가는 기본 시간',
      effect: '대화가 늦어집니다',
    },
    jitterMs: {
      label: 'Jitter',
      description: '도착 간격의 흔들림',
      effect: '순서가 바뀌고 늦게 도착합니다',
    },
    bufferMs: {
      label: 'Jitter Buffer',
      description: '잠깐 모아 두었다 재생',
      effect: '안정적이지만 더 늦어집니다',
    },
  },
  bufferOff: 'OFF',
  play: {
    degraded: '현재 설정으로 듣기',
    original: '정상 음성 듣기',
    stop: '정지',
  },
  legend: {
    onTime: '정상 도착',
    late: '재생 마감 초과(지각)',
    lost: '손실 ✕',
    reordered: '↕ 순서 바뀜',
    lines: '기울어진 선 = 지연 · 선이 엇갈림 = 순서 바뀜',
  },
  lanes: {
    sender: '송신',
    senderCaption: '발표자',
    receiver: '수신',
    receiverCaption: '청중',
    timeAxis: '시간 →',
    regionLabel: '패킷 흐름 (좌우로 스크롤)',
    overviewLabel: '전체 패킷 개요',
    packetLabel: (sequence: number, state: string) => `패킷 ${sequence}번, ${state}`,
    reorderedSuffix: ', 순서 바뀜',
    states: { 'on-time': '정상 도착', late: '지각', lost: '손실' },
  },
  rtp: {
    empty: '패킷을 눌러 RTP 헤더 정보를 확인하세요',
    title: (sequence: number) => `RTP Packet #${sequence}`,
    sequence: 'Sequence Number',
    timestamp: 'Timestamp',
    ssrc: 'SSRC',
    travel: '도착까지',
    lostValue: '도착하지 않음',
  },
  explain: {
    lost: (sequence: number) =>
      `패킷 #${sequence}는 네트워크에서 사라져 도착하지 않았습니다. 수신 측은 Sequence Number ${sequence}번만 비어 있는 것을 보고 손실을 알아챕니다.`,
    late: (sequence: number, deadlineMs: number, overMs: number) =>
      `패킷 #${sequence}는 재생 마감(송신 후 ${deadlineMs}ms)을 ${overMs}ms 넘겨 도착해서 폐기되었습니다. 그 구간은 무음으로 재생됩니다.`,
    reorderedBufferOff: (sequence: number) =>
      `패킷 #${sequence}는 더 뒤 번호의 패킷보다 늦게 도착했습니다. 버퍼가 없어 도착한 순서대로 재생되므로 소리가 뒤섞입니다. Sequence Number 덕분에 순서가 뒤바뀐 것을 알 수 있습니다.`,
    reorderedBufferOn: (sequence: number) =>
      `패킷 #${sequence}는 더 뒤 번호의 패킷보다 늦게 도착했지만, Jitter Buffer가 Sequence Number 순서로 바로잡아 제 시간에 재생합니다.`,
    onTimeBufferOff: (sequence: number, travelMs: number) =>
      `패킷 #${sequence}는 송신 후 ${travelMs}ms 만에 도착해 도착 즉시 재생되었습니다.`,
    onTimeBufferOn: (sequence: number, travelMs: number, playoutMs: number) =>
      `패킷 #${sequence}는 송신 후 ${travelMs}ms 만에 도착해 버퍼에서 기다렸다가 송신 후 ${playoutMs}ms 시점에 재생되었습니다.`,
  },
  metrics: {
    loss: 'Packet Loss',
    latency: '평균 지연',
    late: '지각 폐기',
    reordered: '순서 뒤바뀜',
    notApplicable: '—',
  },
  wave: {
    summary: '파형 비교',
    original: '정상',
    degraded: '현재 설정 (점선은 끊긴 구간)',
  },
  notice:
    '본 실습은 RTP/UDP 기반 실시간 음성 전송의 Packet Loss, Delay, Jitter를 이해하기 위한 시뮬레이션입니다. 실제 Discord 음성 패킷을 송수신하지 않으며, 실제 Discord는 PCM이 아닌 Opus를 사용합니다.',
  sourceLabels: {
    bundled: '기본 음원',
    recorded: '내 녹음',
    uploaded: '업로드한 파일',
  },
  loading: '음원을 불러오는 중입니다…',
  errors: {
    sampleLoad: '기본 음원을 불러오지 못했습니다. 페이지를 새로고침해 주세요.',
    clipTooShort: '음성이 너무 짧습니다(20ms 미만). 조금 더 길게 녹음하거나 다른 파일을 선택해 주세요.',
    playback: '소리를 재생할 수 없습니다. 화면을 한 번 터치한 뒤 다시 시도해 주세요.',
  },
} as const;
