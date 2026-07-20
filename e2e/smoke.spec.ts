// 実 CDN スモークテスト(design.md 11.2)。モックなしで Data Dragon に疎通する。
// 実行: npm run test:e2e:smoke(CI では継続可能エラー扱い)
import { expect, test } from '@playwright/test';

test('実 Data Dragon からバージョンとチャンピオン一覧を取得して描画できる @smoke', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('patch-version')).toContainText(/パッチ \d+\./, {
    timeout: 30_000,
  });
  const cells = page.getByTestId('champion-grid').getByRole('button');
  expect(await cells.count()).toBeGreaterThan(100);
});
