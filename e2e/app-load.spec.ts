// フロー1: 起動 → チャンピオングリッド表示(design.md 11.2)
import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('起動するとパッチバージョンとチャンピオングリッドが表示される', async ({ page }) => {
  await openApp(page);

  await expect(page.getByTestId('patch-version')).toHaveText(/99\.1\.1/);
  const grid = page.getByTestId('champion-grid');
  await expect(grid.getByRole('button')).toHaveCount(10);
  await expect(page.getByTestId('champion-Ahri')).toContainText('アーリ');
});
