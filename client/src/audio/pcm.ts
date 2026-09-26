export function downmixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) {
    return new Float32Array(0);
  }
  const mono = new Float32Array(channels[0].length);
  for (const channel of channels) {
    for (let index = 0; index < mono.length; index += 1) {
      mono[index] += channel[index] / channels.length;
    }
  }
  return mono;
}

export function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (input.length === 0 || fromRate === toRate) {
    return new Float32Array(input);
  }
  const outputLength = Math.round((input.length * toRate) / fromRate);
  const output = new Float32Array(outputLength);
  const lastIndex = input.length - 1;
  for (let index = 0; index < outputLength; index += 1) {
    const position = (index * fromRate) / toRate;
    const lower = Math.min(Math.floor(position), lastIndex);
    const upper = Math.min(lower + 1, lastIndex);
    const fraction = position - lower;
    output[index] = input[lower] * (1 - fraction) + input[upper] * fraction;
  }
  return output;
}

export function truncateToSeconds(samples: Float32Array, sampleRate: number, maxSeconds: number): Float32Array {
  const maxSamples = Math.floor(sampleRate * maxSeconds);
  return samples.length > maxSamples ? samples.slice(0, maxSamples) : samples;
}
