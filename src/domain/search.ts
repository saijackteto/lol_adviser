// チャンピオン検索の正規化・照合(design.md 5 章)

import type { ChampionSummary } from './types';

/**
 * 検索用正規化:
 * - ひらがな → カタカナ(「あー」→「アー」でアーリにヒットさせる)
 * - 全角英数記号 → 半角
 * - 大文字化
 * - 記号・スペース・「・」等の除去(文字・数字のみ残す。長音「ー」は文字扱いで残る)
 */
export function normalizeSearchText(text: string): string {
  return text
    .replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * インクリメンタル検索。日本語名と英語 ID の両方を照合し、
 * 前方一致を部分一致より上位に返す。空クエリは全件を返す。
 */
export function searchChampions(
  champions: readonly ChampionSummary[],
  query: string,
): ChampionSummary[] {
  const q = normalizeSearchText(query);
  if (q === '') return [...champions];

  const prefixMatches: ChampionSummary[] = [];
  const partialMatches: ChampionSummary[] = [];

  for (const champion of champions) {
    const name = normalizeSearchText(champion.name);
    const id = normalizeSearchText(champion.id);
    if (name.startsWith(q) || id.startsWith(q)) {
      prefixMatches.push(champion);
    } else if (name.includes(q) || id.includes(q)) {
      partialMatches.push(champion);
    }
  }

  return [...prefixMatches, ...partialMatches];
}
