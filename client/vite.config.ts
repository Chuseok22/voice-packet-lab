import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // .env 하나를 저장소 루트에 두고 클라이언트 빌드도 그 파일을 읽는다.
  envDir: '..',
  server: {
    proxy: { '/ws': { target: 'http://localhost:3000', ws: true } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
