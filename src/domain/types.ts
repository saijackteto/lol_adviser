// ドメイン型定義(design.md 4 章)

export type Role = 'TOP' | 'JG' | 'MID' | 'ADC' | 'SUP';
export type Team = 'BLUE' | 'RED';
export type Rank =
  | 'IRON'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'EMERALD'
  | 'DIAMOND'
  | 'MASTER'
  | 'GRANDMASTER'
  | 'CHALLENGER';

export const ROLES: readonly Role[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP'];
export const TEAMS: readonly Team[] = ['BLUE', 'RED'];
export const RANKS: readonly Rank[] = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
];

export const ROLE_LABELS: Record<Role, string> = {
  TOP: 'トップ',
  JG: 'ジャングル',
  MID: 'ミッド',
  ADC: 'ADC',
  SUP: 'サポート',
};

export const TEAM_LABELS: Record<Team, string> = {
  BLUE: 'ブルーサイド',
  RED: 'レッドサイド',
};

export const RANK_LABELS: Record<Rank, string> = {
  IRON: 'アイアン',
  BRONZE: 'ブロンズ',
  SILVER: 'シルバー',
  GOLD: 'ゴールド',
  PLATINUM: 'プラチナ',
  EMERALD: 'エメラルド',
  DIAMOND: 'ダイヤモンド',
  MASTER: 'マスター',
  GRANDMASTER: 'グランドマスター',
  CHALLENGER: 'チャレンジャー',
};

/** champion.json 由来のチャンピオン概要 */
export interface ChampionSummary {
  /** 英語 ID(例 "Ahri"。詳細取得やアイコン URL に使う) */
  id: string;
  /** 数値キー(例 "103") */
  key: string;
  /** 日本語名(例 "アーリ") */
  name: string;
  title: string;
  tags: string[];
}

export interface SummonerSpell {
  /** 例 "SummonerFlash" */
  id: string;
  /** 日本語名(例 "フラッシュ") */
  name: string;
}

/** ユーザーが入力する試合情報一式 */
export interface MatchInput {
  /** 値は championId。未定スロットは undefined */
  picks: Record<Team, Partial<Record<Role, string>>>;
  selfTeam: Team;
  selfRole: Role;
  rank?: Rank;
  selfSpells: [string?, string?];
  opponentSpells: [string?, string?];
  /** championId 最大 10 */
  bans: string[];
}

export function createEmptyMatchInput(): MatchInput {
  return {
    picks: { BLUE: {}, RED: {} },
    selfTeam: 'BLUE',
    selfRole: 'MID',
    selfSpells: [undefined, undefined],
    opponentSpells: [undefined, undefined],
    bans: [],
  };
}

export function enemyTeamOf(team: Team): Team {
  return team === 'BLUE' ? 'RED' : 'BLUE';
}

export function selfChampionId(input: MatchInput): string | undefined {
  return input.picks[input.selfTeam][input.selfRole];
}

export function opponentChampionId(input: MatchInput): string | undefined {
  return input.picks[enemyTeamOf(input.selfTeam)][input.selfRole];
}

export function enemyJunglerId(input: MatchInput): string | undefined {
  return input.picks[enemyTeamOf(input.selfTeam)].JG;
}
