/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages はリポジトリ名配下で配信されるため、本番ビルドのみ base を設定する。
// dev サーバー / E2E は '/' のまま(implementation-plan 5-1)
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/lol-adviser/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'], // e2e/ は Playwright 管轄(Vitest に拾わせない)
  },
}));
