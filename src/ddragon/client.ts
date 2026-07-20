// Data Dragon クライアント(fetch + キャッシュ。design.md 3 章)

import type { ChampionSummary, SummonerSpell } from '../domain/types';
import { loadDDragonCache, saveDDragonCache } from '../storage/localStorage';
import type {
  DDragonChampionDetail,
  DDragonChampionDetailResponse,
  DDragonChampionListResponse,
  DDragonSummonerSpellsResponse,
} from './types';

const BASE = 'https://ddragon.leagueoflegends.com';
const LANG = 'ja_JP';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Data Dragon の取得に失敗しました (${res.status}): ${url}`);
  }
  return (await res.json()) as T;
}

export async function fetchLatestVersion(): Promise<string> {
  const versions = await fetchJson<string[]>(`${BASE}/api/versions.json`);
  const latest = versions[0];
  if (typeof latest !== 'string' || latest === '') {
    throw new Error('Data Dragon のバージョン一覧が空です');
  }
  return latest;
}

export async function fetchChampionList(version: string): Promise<ChampionSummary[]> {
  const res = await fetchJson<DDragonChampionListResponse>(
    `${BASE}/cdn/${version}/data/${LANG}/champion.json`,
  );
  return Object.values(res.data)
    .map(({ id, key, name, title, tags }) => ({ id, key, name, title, tags }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

export async function fetchSummonerSpells(version: string): Promise<SummonerSpell[]> {
  const res = await fetchJson<DDragonSummonerSpellsResponse>(
    `${BASE}/cdn/${version}/data/${LANG}/summoner.json`,
  );
  return Object.values(res.data)
    .filter((spell) => spell.modes.includes('CLASSIC'))
    .map(({ id, name }) => ({ id, name }));
}

/** チャンピオン詳細はプロンプト生成時に必要な分だけオンデマンド取得し、メモリキャッシュする */
const detailCache = new Map<string, DDragonChampionDetail>();

export async function fetchChampionDetail(
  version: string,
  championId: string,
): Promise<DDragonChampionDetail> {
  const cacheKey = `${version}:${championId}`;
  const cached = detailCache.get(cacheKey);
  if (cached) return cached;

  const res = await fetchJson<DDragonChampionDetailResponse>(
    `${BASE}/cdn/${version}/data/${LANG}/champion/${championId}.json`,
  );
  const detail = res.data[championId];
  if (!detail) {
    throw new Error(`チャンピオン詳細が見つかりません: ${championId}`);
  }
  detailCache.set(cacheKey, detail);
  return detail;
}

export function championIconUrl(version: string, championId: string): string {
  return `${BASE}/cdn/${version}/img/champion/${championId}.png`;
}

export function spellIconUrl(version: string, spellId: string): string {
  return `${BASE}/cdn/${version}/img/spell/${spellId}.png`;
}

export interface StaticData {
  version: string;
  champions: ChampionSummary[];
  summonerSpells: SummonerSpell[];
  /** true = 通信失敗により古いキャッシュで動作中(UI で警告表示する) */
  stale: boolean;
}

/**
 * 起動時ロード(design.md 3.2):
 * 最新バージョン取得 → 同一バージョンの localStorage キャッシュがあればそれを使用、
 * なければ一覧を取得してキャッシュ。通信失敗時はキャッシュがあれば stale 付きで継続。
 */
export async function loadStaticData(): Promise<StaticData> {
  try {
    const version = await fetchLatestVersion();
    const cached = loadDDragonCache();
    if (cached && cached.version === version) {
      return {
        version,
        champions: cached.champions,
        summonerSpells: cached.summonerSpells,
        stale: false,
      };
    }
    const [champions, summonerSpells] = await Promise.all([
      fetchChampionList(version),
      fetchSummonerSpells(version),
    ]);
    saveDDragonCache({
      version,
      fetchedAt: new Date().toISOString(),
      champions,
      summonerSpells,
    });
    return { version, champions, summonerSpells, stale: false };
  } catch (error) {
    const cached = loadDDragonCache();
    if (cached) {
      return {
        version: cached.version,
        champions: cached.champions,
        summonerSpells: cached.summonerSpells,
        stale: true,
      };
    }
    throw error;
  }
}
