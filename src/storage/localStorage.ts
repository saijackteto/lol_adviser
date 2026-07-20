// localStorage 読み書き + 破損時フォールバック(design.md 7 章)
// 読み込みは必ず検証し、壊れていたら null / デフォルトにフォールバックする。

import {
  RANKS,
  ROLES,
  TEAMS,
  type ChampionSummary,
  type MatchInput,
  type Rank,
  type Role,
  type SummonerSpell,
  type Team,
} from '../domain/types';

const CACHE_KEY = 'lol-adviser:ddragon-cache:v1';
const TEMPLATE_KEY = 'lol-adviser:template:v1';
const HISTORY_KEY = 'lol-adviser:history:v1';

export const HISTORY_LIMIT = 10;

export interface DDragonCache {
  version: string;
  fetchedAt: string;
  champions: ChampionSummary[];
  summonerSpells: SummonerSpell[];
}

// ---- 低レベルヘルパー ----

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // localStorage 無効環境(プライベートモード等)
  }
}

function readJson(key: string): unknown {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    getStorage()?.setItem(key, JSON.stringify(value));
  } catch {
    // 容量超過・無効環境は保存を諦める(致命的ではない)
  }
}

function remove(key: string): void {
  try {
    getStorage()?.removeItem(key);
  } catch {
    // 同上
  }
}

// ---- バリデーション ----

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function isChampionSummary(v: unknown): v is ChampionSummary {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    typeof v.key === 'string' &&
    typeof v.name === 'string' &&
    typeof v.title === 'string' &&
    isStringArray(v.tags)
  );
}

function isSummonerSpell(v: unknown): v is SummonerSpell {
  return isRecord(v) && typeof v.id === 'string' && typeof v.name === 'string';
}

function isDDragonCache(v: unknown): v is DDragonCache {
  return (
    isRecord(v) &&
    typeof v.version === 'string' &&
    typeof v.fetchedAt === 'string' &&
    Array.isArray(v.champions) &&
    v.champions.every(isChampionSummary) &&
    Array.isArray(v.summonerSpells) &&
    v.summonerSpells.every(isSummonerSpell)
  );
}

function isSpellPair(v: unknown): v is [string?, string?] {
  return Array.isArray(v) && v.length <= 2 && v.every((x) => x === undefined || x === null || typeof x === 'string');
}

function isPicks(v: unknown): v is MatchInput['picks'] {
  if (!isRecord(v)) return false;
  return TEAMS.every((team) => {
    const side = v[team];
    if (!isRecord(side)) return false;
    return Object.entries(side).every(
      ([role, champ]) => ROLES.includes(role as Role) && (champ === undefined || typeof champ === 'string'),
    );
  });
}

export function isMatchInput(v: unknown): v is MatchInput {
  return (
    isRecord(v) &&
    TEAMS.includes(v.selfTeam as Team) &&
    ROLES.includes(v.selfRole as Role) &&
    (v.rank === undefined || RANKS.includes(v.rank as Rank)) &&
    isPicks(v.picks) &&
    isSpellPair(v.selfSpells) &&
    isSpellPair(v.opponentSpells) &&
    isStringArray(v.bans)
  );
}

// ---- Data Dragon キャッシュ ----

export function loadDDragonCache(): DDragonCache | null {
  const parsed = readJson(CACHE_KEY);
  return isDDragonCache(parsed) ? parsed : null;
}

export function saveDDragonCache(cache: DDragonCache): void {
  writeJson(CACHE_KEY, cache);
}

// ---- プロンプトテンプレート ----

export function loadCustomTemplate(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(TEMPLATE_KEY);
    return typeof raw === 'string' && raw.trim() !== '' ? raw : null;
  } catch {
    return null;
  }
}

export function saveCustomTemplate(template: string): void {
  try {
    getStorage()?.setItem(TEMPLATE_KEY, template);
  } catch {
    // 保存失敗は無視
  }
}

export function clearCustomTemplate(): void {
  remove(TEMPLATE_KEY);
}

// ---- 入力履歴 ----

/** JSON 化で undefined が null になるため、読み込み時にスペル欄を undefined へ正規化する */
function normalizeSpellPair(pair: [string?, string?]): [string?, string?] {
  return [
    typeof pair[0] === 'string' ? pair[0] : undefined,
    typeof pair[1] === 'string' ? pair[1] : undefined,
  ];
}

function normalizeMatchInput(input: MatchInput): MatchInput {
  return {
    ...input,
    selfSpells: normalizeSpellPair(input.selfSpells),
    opponentSpells: normalizeSpellPair(input.opponentSpells),
  };
}

export function loadHistory(): MatchInput[] {
  const parsed = readJson(HISTORY_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isMatchInput).map(normalizeMatchInput).slice(0, HISTORY_LIMIT);
}

/** 履歴の先頭に追加して保存する。直前と同一内容ならば追加しない。保存後の履歴を返す。 */
export function addHistoryEntry(entry: MatchInput): MatchInput[] {
  const history = loadHistory();
  if (history.length > 0 && JSON.stringify(history[0]) === JSON.stringify(entry)) {
    return history;
  }
  const next = [entry, ...history].slice(0, HISTORY_LIMIT);
  writeJson(HISTORY_KEY, next);
  return next;
}
