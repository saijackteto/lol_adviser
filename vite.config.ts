/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// カスタムドメイン (loladviser.saijack.com) のルートで配信するため base は '/'。
// github.io のパス配下 (/lol_adviser/) はカスタムドメインへ 301 されるため考慮不要
export default defineConfig({
  base: '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'], // e2e/ は Playwright 管轄(Vitest に拾わせない)
  },
});
