// フロー7: 生成 → リロード → 履歴から復元(design.md 11.2)
import { expect, test } from '@playwright/test';
import { openApp, pickChampion } from './helpers';

test('生成した入力が履歴に残り、リロード後に復元できる', async ({ page }) => {
  await openApp(page);

  await pickChampion(page, 'BLUE', 'MID', 'Ahri');
  await pickChampion(page, 'RED', 'MID', 'Zed');
  await page.getByTestId('generate-button').click();
  await page.getByTestId('prompt-text').waitFor();

  await page.reload();
  await page.getByTestId('champion-Ahri').waitFor();
  await expect(page.getByTestId('slot-BLUE-MID')).toContainText('未選択');

  await page.getByRole('button', { name: '履歴' }).click();
  const firstEntry = page.getByTestId('history-list').getByRole('button').first();
  await expect(firstEntry).toContainText('アーリ(ミッド) vs ゼド');
  await firstEntry.click();

  await expect(page.getByTestId('slot-BLUE-MID')).toContainText('アーリ');
  await expect(page.getByTestId('slot-RED-MID')).toContainText('ゼド');
  await expect(page.getByTestId('toast')).toHaveText('履歴を復元しました');
});
