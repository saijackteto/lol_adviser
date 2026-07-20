// フロー5: ワンクリックコピー(design.md 11.2。クリップボード権限は playwright.config.ts で付与)
import { expect, test } from '@playwright/test';
import { openApp, pickChampion } from './helpers';

test('コピーボタンでプロンプト全文がクリップボードに入る', async ({ page }) => {
  await openApp(page);

  await pickChampion(page, 'BLUE', 'MID', 'Ahri');
  await page.getByTestId('generate-button').click();
  const promptText = await page.getByTestId('prompt-text').innerText();

  await page.getByTestId('copy-button').click();
  await expect(page.getByTestId('toast')).toHaveText('コピーしました');

  // innerText はレンダリング都合で行末空白の扱いが異なるため、行末を正規化して比較する
  const normalize = (text: string) =>
    text
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trimEnd();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(normalize(clipboard)).toBe(normalize(promptText));
  expect(clipboard).toContain('League of Legends');
  expect(clipboard).toContain('## 5. ビルド・ルーンの対面調整');
});
