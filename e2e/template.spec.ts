// フロー6: テンプレート編集 → 保存 → 反映 / デフォルトに戻す(design.md 11.2)
import { expect, test } from '@playwright/test';
import { openApp, pickChampion } from './helpers';

test('カスタムテンプレートが生成に反映され、リロード後も維持される', async ({ page }) => {
  await openApp(page);
  await pickChampion(page, 'RED', 'MID', 'Zed');

  await page.getByRole('button', { name: 'テンプレート編集' }).click();
  await page.getByTestId('template-editor').fill('対面は {{opponentChampion}} です');
  await page.getByTestId('template-save').click();

  await page.getByTestId('generate-button').click();
  await expect(page.getByTestId('prompt-text')).toHaveText('対面は ゼド です');

  // リロードしても localStorage から復元される
  await page.reload();
  await page.getByTestId('champion-Ahri').waitFor();
  await page.getByTestId('generate-button').click();
  await expect(page.getByTestId('prompt-text')).toHaveText('対面は 不明 です');
});

test('デフォルトに戻すとビルトインテンプレートで生成される', async ({ page }) => {
  await openApp(page);

  await page.getByRole('button', { name: 'テンプレート編集' }).click();
  await page.getByTestId('template-editor').fill('カスタム {{patchVersion}}');
  await page.getByTestId('template-save').click();

  await page.getByRole('button', { name: 'テンプレート編集' }).click();
  await page.getByTestId('template-reset').click();
  await expect(page.getByTestId('template-editor')).toHaveValue(/ハイレベルなコーチ/);
  await page.getByRole('button', { name: '閉じる' }).click();

  await page.getByTestId('generate-button').click();
  await expect(page.getByTestId('prompt-text')).toContainText(
    'あなたは League of Legends のハイレベルなコーチです',
  );
});
