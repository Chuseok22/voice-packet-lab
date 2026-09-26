import { packetLabContent } from '../../content/packetLab';
import type { NetworkSettings } from '../../engine/types';

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatMs(milliseconds: number): string {
  return `${Math.round(milliseconds)} ms`;
}

export function describeSettings(settings: NetworkSettings): string {
  const buffer = settings.bufferMs === 0 ? packetLabContent.bufferOff : `${settings.bufferMs}ms`;
  return `Loss ${settings.lossPercent}% · Delay ${settings.delayMs}ms · Jitter ${settings.jitterMs}ms · Buffer ${buffer}`;
}
