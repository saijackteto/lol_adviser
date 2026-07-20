// フロー2〜4: かな検索 + Enter 選択 / 全入力での生成 / 部分入力での生成(design.md 11.2)
import { expect, test } from '@playwright/test';
import { openApp, pickChampion } from './helpers';

test('「あーり」検索 + Enter で選択中スロットに反映され、次の空スロットへ移動する', async ({
  page,
}) => {
  await openApp(page);

  const search = page.getByLabel('チャンピオン検索');
  await search.fill('あーり');
  await expect(page.getByTestId('champion-grid').getByRole('button')).toHaveCount(1);
  await search.press('Enter');

  await expect(page.getByTestId('slot-BLUE-TOP')).toContainText('アーリ');
  await expect(search).toHaveValue('');
  await expect(page.getByTestId('pick-target')).toContainText('ブルーサイド ジャングル');
});

test('英語 ID でも検索できる', async ({ page }) => {
  await openApp(page);

  await page.getByLabel('チャンピオン検索').fill('zed');
  const grid = page.getByTestId('champion-grid');
  await expect(grid.getByRole('button')).toHaveCount(1);
  await expect(grid.getByTestId('champion-Zed')).toBeVisible();
});

test('全情報入力で生成するとスキルデータ入りプロンプトが出力される', async ({ page }) => {
  await openApp(page);

  await pickChampion(page, 'BLUE', 'MID', 'Ahri');
  await pickChampion(page, 'RED', 'MID', 'Zed');
  await pickChampion(page, 'RED', 'JG', 'LeeSin');
  await page.getByTestId('rank').selectOption('GOLD');
  await page.getByTestId('self-spell-1').selectOption('SummonerFlash');
  await page.getByTestId('self-spell-2').selectOption('SummonerDot');
  await page.getByTestId('opponent-spell-1').selectOption('SummonerFlash');

  await page.getByTestId('generate-button').click();

  const prompt = page.getByTestId('prompt-text');
  await expect(prompt).toContainText('パッチバージョン: 99.1.1');
  await expect(prompt).toContainText('私のランク帯: ゴールド');
  await expect(prompt).toContainText(
    '私のチャンピオン: アーリ(サモナースペル: フラッシュ / イグナイト)',
  );
  await expect(prompt).toContainText('対面のチャンピオン: ゼド(サモナースペル: フラッシュ)');
  await expect(prompt).toContainText('敵ジャングラー(リー・シン)');
  // スキルデータ: フィクスチャの cooldownBurn / rangeBurn がそのまま埋め込まれる
  await expect(prompt).toContainText('R: 死の刻印 — CD 120/100/80秒 / 射程 625');
  await expect(prompt).toContainText('R: スピリットラッシュ — CD 130/105/80秒 / 射程 450');
  // HTML タグは除去される
  await expect(prompt).not.toContainText('<font');
  await expect(prompt).not.toContainText('<br>');
});

test('部分入力(自分のみ)でも生成でき、未確定は「不明」になる', async ({ page }) => {
  await openApp(page);

  await pickChampion(page, 'BLUE', 'MID', 'Ahri');
  await page.getByTestId('generate-button').click();

  const prompt = page.getByTestId('prompt-text');
  await expect(prompt).toContainText('対面のチャンピオン: 不明');
  await expect(prompt).toContainText('私のランク帯: 不明');
  await expect(prompt).toContainText('- トップ: 不明');
  await expect(prompt).toContainText('敵ジャングラー(不明)');
  // 自分(アーリ)のスキルデータは埋め込まれる
  await expect(prompt).toContainText('### アーリ(九尾の狐)');
});
