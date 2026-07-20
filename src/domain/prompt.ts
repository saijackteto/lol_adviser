// プロンプトテンプレート・変数置換・skillData 生成(design.md 6 章)

import type { DDragonChampionDetail } from '../ddragon/types';
import {
  RANK_LABELS,
  ROLE_LABELS,
  ROLES,
  enemyTeamOf,
  enemyJunglerId,
  opponentChampionId,
  selfChampionId,
  type MatchInput,
  type Team,
} from './types';

const UNKNOWN = '不明';

/** design.md 6.2 のデフォルトテンプレート全文 */
export const DEFAULT_TEMPLATE = `あなたは League of Legends のハイレベルなコーチです。以下の試合情報をもとに、私へのアドバイスを日本語で出力してください。

# 試合情報
- パッチバージョン: {{patchVersion}}
- 私のランク帯: {{rank}}
- 私のロール: {{selfRole}}
- 私のチャンピオン: {{selfChampion}}(サモナースペル: {{selfSpells}})
- 対面のチャンピオン: {{opponentChampion}}(サモナースペル: {{opponentSpells}})

## 味方チーム構成
{{allyTeam}}

## 敵チーム構成
{{enemyTeam}}

## BAN
{{bans}}

# 参考スキルデータ(パッチ {{patchVersion}} の公式データ。あなたの知識より優先すること)
{{skillData}}

# 出力してほしい内容
以下の構成(TL;DR + 5 項目)を、この順番・この見出しで出力してください。ランク帯({{rank}})のプレイヤーが実行可能な内容にしてください。

## TL;DR(今すぐ確認)
チャンピオンセレクト中の短時間でも読み切れるよう、以下を**必ず 3〜5 行の箇条書き**で出力してください。各行は 1 行で完結させ、固有名詞・数値(CD 秒数やタイミング等)を省略しないこと。詳細説明はここに書かず、下記の各項目に譲ってください。
- 対面の最重要警戒スキルと CD
- 敵ジャングラーのガンク警戒タイミング・警戒レベル
- 集団戦での自分の役割と最優先ターゲット
- 勝ち筋(一言で)

## 1. レーン戦
- 私と対面のパワースパイク(強いレベル・タイミング)の比較
- 対面の警戒すべきスキルとそのクールダウン、スキルを避けた/使わせた後のトレード方法
- ウェーブ管理の方針(プッシュ/フリーズの判断)

## 2. ガンク警戒
- 敵ジャングラー({{enemyJungler}})の初回ガンクが来やすいタイミングとガンクの怖さ(警戒レベル)
- ワードを置くべき位置とタイミング

## 3. 集団戦
- この構成における私の役割と立ち位置
- 仕掛けるべきタイミング、避けるべきタイミング
- 敵チームで最も警戒すべきスキル(CD の長いキースキル)

## 4. 勝利条件
- 私のチームがどう勝つべきか(スプリット/ポーク/エンゲージ/スケーリング等)
- 試合時間帯ごとの有利不利(序盤/中盤/終盤どちらの構成が強いか)

## 5. ビルド・ルーンの対面調整
- この対面・敵構成に合わせたビルドやルーンの調整案(あれば)

# 注意事項
- 未確定(「不明」)の情報については、その旨を踏まえた一般的なアドバイスにしてください。
- あなたの知識が古い可能性がある項目(最新パッチでの変更・新チャンピオン等)については、その旨を明記してください。上記の参考スキルデータは最新の公式データなので信頼して構いません。
`;

/** テンプレート編集画面のヘルプに表示する変数一覧 */
export const TEMPLATE_VARIABLES: ReadonlyArray<{ name: string; description: string }> = [
  { name: 'patchVersion', description: '現在のパッチバージョン' },
  { name: 'selfChampion', description: '自分のチャンピオン名' },
  { name: 'selfRole', description: '自分のロール' },
  { name: 'rank', description: 'ランク帯' },
  { name: 'opponentChampion', description: '対面レーナーのチャンピオン名' },
  { name: 'selfSpells', description: '自分のサモナースペル' },
  { name: 'opponentSpells', description: '対面のサモナースペル' },
  { name: 'blueTeam', description: 'ブルーサイドのピック一覧' },
  { name: 'redTeam', description: 'レッドサイドのピック一覧' },
  { name: 'allyTeam', description: '味方チームのピック一覧' },
  { name: 'enemyTeam', description: '敵チームのピック一覧' },
  { name: 'enemyJungler', description: '敵ジャングラーのチャンピオン名' },
  { name: 'bans', description: 'BAN 一覧' },
  { name: 'skillData', description: 'Data Dragon 由来の埋め込みスキルデータ' },
];

/** Data Dragon の説明文から HTML タグを除去する(tooltip ではなく description 前提) */
export function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** スキル説明の切り詰め上限(プロンプト肥大防止。CD・射程は削らない) */
const SKILL_DESCRIPTION_LIMIT = 200;

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

const SPELL_KEYS = ['Q', 'W', 'E', 'R'] as const;

/** design.md 6.3: 自分・対面・敵 JG のスキルデータを整形テキストにする */
export function formatSkillData(details: readonly DDragonChampionDetail[]): string {
  if (details.length === 0) return '(スキルデータなし)';
  return details
    .map((detail) => {
      const lines = [`### ${detail.name}${detail.title ? `(${detail.title})` : ''}`];
      lines.push(
        `- パッシブ: ${detail.passive.name} — ${truncate(stripHtml(detail.passive.description), SKILL_DESCRIPTION_LIMIT)}`,
      );
      detail.spells.slice(0, 4).forEach((spell, index) => {
        lines.push(
          `- ${SPELL_KEYS[index]}: ${spell.name} — CD ${spell.cooldownBurn}秒 / 射程 ${spell.rangeBurn} — ${truncate(stripHtml(spell.description), SKILL_DESCRIPTION_LIMIT)}`,
        );
      });
      return lines.join('\n');
    })
    .join('\n\n');
}

export interface PromptBuildContext {
  patchVersion: string;
  input: MatchInput;
  /** カスタムテンプレート。未指定なら DEFAULT_TEMPLATE */
  template?: string;
  /** championId → 日本語名。解決できなければ ID をそのまま表示する */
  championName: (championId: string) => string | undefined;
  /** サモナースペル ID → 日本語名 */
  spellName: (spellId: string) => string | undefined;
  /** 埋め込むスキルデータ(自分・対面・敵 JG。取得できた分だけ) */
  skillDetails: readonly DDragonChampionDetail[];
}

function championLabel(
  championId: string | undefined,
  championName: PromptBuildContext['championName'],
): string {
  if (!championId) return UNKNOWN;
  return championName(championId) ?? championId;
}

function spellsLabel(
  spells: readonly [string?, string?],
  spellName: PromptBuildContext['spellName'],
): string {
  const names = spells
    .filter((id): id is string => typeof id === 'string' && id !== '')
    .map((id) => spellName(id) ?? id);
  return names.length > 0 ? names.join(' / ') : UNKNOWN;
}

function teamLines(
  input: MatchInput,
  team: Team,
  championName: PromptBuildContext['championName'],
): string {
  return ROLES.map(
    (role) => `- ${ROLE_LABELS[role]}: ${championLabel(input.picks[team][role], championName)}`,
  ).join('\n');
}

export function buildPrompt(ctx: PromptBuildContext): string {
  const { input, championName, spellName } = ctx;
  const enemyTeam = enemyTeamOf(input.selfTeam);

  const variables: Record<string, string> = {
    patchVersion: ctx.patchVersion,
    selfChampion: championLabel(selfChampionId(input), championName),
    selfRole: ROLE_LABELS[input.selfRole],
    rank: input.rank ? RANK_LABELS[input.rank] : UNKNOWN,
    opponentChampion: championLabel(opponentChampionId(input), championName),
    selfSpells: spellsLabel(input.selfSpells, spellName),
    opponentSpells: spellsLabel(input.opponentSpells, spellName),
    blueTeam: teamLines(input, 'BLUE', championName),
    redTeam: teamLines(input, 'RED', championName),
    allyTeam: teamLines(input, input.selfTeam, championName),
    enemyTeam: teamLines(input, enemyTeam, championName),
    enemyJungler: championLabel(enemyJunglerId(input), championName),
    bans:
      input.bans.length > 0
        ? input.bans.map((id) => championName(id) ?? id).join(' / ')
        : 'なし / 不明',
    skillData: formatSkillData(ctx.skillDetails),
  };

  let result = ctx.template ?? DEFAULT_TEMPLATE;
  for (const [name, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${name}}}`, value);
  }
  return result;
}
