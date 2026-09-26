import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node22',
  platform: 'node',
  clean: true,
  noExternal: [/^@voice-packet-lab\//, 'ws'],
  external: ['bufferutil', 'utf-8-validate'],
});
