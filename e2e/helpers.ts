// E2E 共通ヘルパー: Data Dragon のモック(design.md 11.2)とピック操作
import type { Page } from '@playwright/test';
import championDetails from './fixtures/champion-details.json' with { type: 'json' };
import championList from './fixtures/champion.json' with { type: 'json' };
import summoner from './fixtures/summoner.json' with { type: 'json' };
import versions from './fixtures/versions.json' with { type: 'json' };

/** 1x1 透明 PNG(アイコン画像のモック用) */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Data Dragon への全リクエストをフィクスチャで応答する。
 * テストを決定的・高速・オフライン実行可能にする。
 */
export async function mockDDragon(page: Page): Promise<void> {
  await page.route('https://ddragon.leagueoflegends.com/**', async (route) => {
    const url = route.request().url();
    if (url.endsWith('/api/versions.json')) {
      return route.fulfill({ json: versions });
    }
    if (url.includes('/data/ja_JP/champion.json')) {
      return route.fulfill({ json: championList });
    }
    if (url.includes('/data/ja_JP/summoner.json')) {
      return route.fulfill({ json: summoner });
    }
    const detailMatch = url.match(/\/data\/ja_JP\/champion\/(\w+)\.json$/);
    if (detailMatch) {
      const detail = (championDetails as Record<string, unknown>)[detailMatch[1]];
      if (detail) return route.fulfill({ json: detail });
      return route.fulfill({ status: 404, body: 'not found' });
    }
    if (url.includes('/img/')) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG });
    }
    return route.fulfill({ status: 404, body: '' });
  });
}

/** スロットをクリックしてからグリッドのチャンピオンをクリックする */
export async function pickChampion(
  page: Page,
  team: 'BLUE' | 'RED',
  role: 'TOP' | 'JG' | 'MID' | 'ADC' | 'SUP',
  championId: string,
): Promise<void> {
  await page.getByTestId(`slot-${team}-${role}`).click();
  await page.getByTestId(`champion-${championId}`).click();
}

/** モックを設定してトップページを開き、チャンピオン一覧の描画を待つ */
export async function openApp(page: Page): Promise<void> {
  await mockDDragon(page);
  await page.goto('/');
  await page.getByTestId('champion-Ahri').waitFor();
}
