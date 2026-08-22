// 自分 vs 対面の lolalytics ビルドページへのリンク生成(design.md 6.5)

import { opponentChampionId, selfChampionId, type MatchInput, type Role } from './types';

const BASE = 'https://lolalytics.com/ja/lol';

/** Data Dragon championId → lolalytics のスラッグ(基本は小文字化。ズレるのは Wukong のみ実地確認済み) */
const CHAMPION_ID_OVERRIDES: Record<string, string> = {
  MonkeyKing: 'wukong',
};

const LANE_WORD_BY_ROLE: Record<Role, string> = {
  TOP: 'top',
  JG: 'jungle',
  MID: 'middle',
  ADC: 'bottom',
  SUP: 'support',
};

export function championLolalyticsSlug(championId: string): string {
  return CHAMPION_ID_OVERRIDES[championId] ?? championId.toLowerCase();
}

/**
 * 自チャンピオン未確定なら undefined。
 * 対面(同ロールの相手)が未確定な場合は自チャンピオン単体のビルドページを返す。
 * lane は自分のロールをオフロールでピックした場合に主要ロールへフォールバックされないよう常に指定する。
 */
export function buildLolalyticsUrl(input: MatchInput): string | undefined {
  const selfId = selfChampionId(input);
  if (!selfId) return undefined;

  const selfSlug = championLolalyticsSlug(selfId);
  const lane = LANE_WORD_BY_ROLE[input.selfRole];
  const opponentId = opponentChampionId(input);
  if (!opponentId) {
    return `${BASE}/${selfSlug}/build/?lane=${lane}`;
  }

  const opponentSlug = championLolalyticsSlug(opponentId);
  return `${BASE}/${selfSlug}/vs/${opponentSlug}/build/?lane=${lane}&vslane=${lane}`;
}
