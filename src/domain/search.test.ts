import { describe, expect, it } from 'vitest';
import { normalizeSearchText, searchChampions } from './search';
import type { ChampionSummary } from './types';

function champion(id: string, name: string): ChampionSummary {
  return { id, key: '0', name, title: '', tags: [] };
}

const AHRI = champion('Ahri', 'アーリ');
const URGOT = champion('Urgot', 'アーゴット');
const RIVEN = champion('Riven', 'リヴェン');
const MISS_FORTUNE = champion('MissFortune', 'ミス・フォーチュン');
const KAISA = champion('Kaisa', 'カイ=サ');
const CHAMPIONS = [AHRI, URGOT, KAISA, MISS_FORTUNE, RIVEN];

describe('normalizeSearchText', () => {
  it('ひらがなをカタカナに変換する', () => {
    expect(normalizeSearchText('あー')).toBe('アー');
    expect(normalizeSearchText('みす')).toBe('ミス');
  });

  it('英字を大文字化し、全角英数を半角化する', () => {
    expect(normalizeSearchText('ahri')).toBe('AHRI');
    expect(normalizeSearchText('Ahri')).toBe('AHRI');
  });

  it('記号・スペース・中黒を除去する(長音「ー」は残す)', () => {
    expect(normalizeSearchText('ミス・フォーチュン')).toBe('ミスフォーチュン');
    expect(normalizeSearchText('カイ=サ')).toBe('カイサ');
    expect(normalizeSearchText('Dr. Mundo')).toBe('DRMUNDO');
    expect(normalizeSearchText('アーリ')).toBe('アーリ');
  });
});

describe('searchChampions', () => {
  it('「あー」でアーリ・アーゴットがヒットする', () => {
    const results = searchChampions(CHAMPIONS, 'あー');
    expect(results).toContain(AHRI);
    expect(results).toContain(URGOT);
    expect(results).not.toContain(RIVEN);
  });

  it('英語 ID でも検索できる', () => {
    expect(searchChampions(CHAMPIONS, 'ahri')).toEqual([AHRI]);
    expect(searchChampions(CHAMPIONS, 'missf')).toEqual([MISS_FORTUNE]);
  });

  it('記号を含む名前もひらがなクエリでヒットする', () => {
    expect(searchChampions(CHAMPIONS, 'みす')).toEqual([MISS_FORTUNE]);
    expect(searchChampions(CHAMPIONS, 'かいさ')).toEqual([KAISA]);
  });

  it('前方一致が部分一致より上位に来る', () => {
    // 「リ」: リヴェンが前方一致、アーリは部分一致
    const results = searchChampions(CHAMPIONS, 'り');
    expect(results[0]).toBe(RIVEN);
    expect(results).toContain(AHRI);
  });

  it('空クエリは全件を返す', () => {
    expect(searchChampions(CHAMPIONS, '')).toHaveLength(CHAMPIONS.length);
    expect(searchChampions(CHAMPIONS, '  ')).toHaveLength(CHAMPIONS.length);
  });

  it('ヒットなしは空配列を返す', () => {
    expect(searchChampions(CHAMPIONS, 'ぞぞぞ')).toEqual([]);
  });
});
