/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 公開時は base を '/<リポジトリ名>/' に設定する(implementation-plan 5-1)
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'], // e2e/ は Playwright 管轄(Vitest に拾わせない)
  },
});
