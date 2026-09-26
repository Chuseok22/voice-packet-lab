const SEQUENCE_MIX = 0x9e3779b1;
const CHANNEL_MIX = 0x85ebca6b;
const FINAL_MIX_A = 0x85ebca6b;
const FINAL_MIX_B = 0xc2b2ae35;
const UINT32_RANGE = 4294967296;

export function unitHash(seed: number, sequenceNumber: number, channel: number): number {
  let hash =
    (Math.trunc(seed) ^
      Math.imul(sequenceNumber, SEQUENCE_MIX) ^
      Math.imul(channel + 1, CHANNEL_MIX)) >>>
    0;
  hash = Math.imul(hash ^ (hash >>> 16), FINAL_MIX_A) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 13), FINAL_MIX_B) >>> 0;
  hash = (hash ^ (hash >>> 16)) >>> 0;
  return hash / UINT32_RANGE;
}
