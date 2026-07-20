import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createEmptyMatchInput, type MatchInput } from '../domain/types';
import {
  HISTORY_LIMIT,
  addHistoryEntry,
  clearCustomTemplate,
  isMatchInput,
  loadCustomTemplate,
  loadDDragonCache,
  loadHistory,
  saveCustomTemplate,
  saveDDragonCache,
  type DDragonCache,
} from './localStorage';

/** Node 環境用の localStorage モック */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

const globalWithStorage = globalThis as { localStorage?: Storage };

beforeEach(() => {
  globalWithStorage.localStorage = new MemoryStorage();
});

afterEach(() => {
  delete globalWithStorage.localStorage;
});

function sampleCache(): DDragonCache {
  return {
    version: '26.14.1',
    fetchedAt: '2026-07-20T00:00:00.000Z',
    champions: [{ id: 'Ahri', key: '103', name: 'アーリ', title: '九尾の狐', tags: ['Mage'] }],
    summonerSpells: [{ id: 'SummonerFlash', name: 'フラッシュ' }],
  };
}

describe('DDragon キャッシュ', () => {
  it('保存して読み込める', () => {
    saveDDragonCache(sampleCache());
    expect(loadDDragonCache()).toEqual(sampleCache());
  });

  it('未保存なら null', () => {
    expect(loadDDragonCache()).toBeNull();
  });

  it('壊れた JSON は null にフォールバックする', () => {
    globalWithStorage.localStorage!.setItem('lol-adviser:ddragon-cache:v1', '{broken json');
    expect(loadDDragonCache()).toBeNull();
  });

  it('形の違うデータは null にフォールバックする', () => {
    globalWithStorage.localStorage!.setItem(
      'lol-adviser:ddragon-cache:v1',
      JSON.stringify({ version: 1, champions: 'x' }),
    );
    expect(loadDDragonCache()).toBeNull();
  });

  it('localStorage が存在しない環境でも例外を出さない', () => {
    delete globalWithStorage.localStorage;
    expect(loadDDragonCache()).toBeNull();
    expect(() => saveDDragonCache(sampleCache())).not.toThrow();
  });
});

describe('カスタムテンプレート', () => {
  it('保存・読み込み・削除できる', () => {
    expect(loadCustomTemplate()).toBeNull();
    saveCustomTemplate('対面は {{opponentChampion}}');
    expect(loadCustomTemplate()).toBe('対面は {{opponentChampion}}');
    clearCustomTemplate();
    expect(loadCustomTemplate()).toBeNull();
  });

  it('空文字列は null 扱い(デフォルトに戻る)', () => {
    saveCustomTemplate('   ');
    expect(loadCustomTemplate()).toBeNull();
  });
});

describe('入力履歴', () => {
  function inputWithMid(championId: string): MatchInput {
    const input = createEmptyMatchInput();
    input.picks.BLUE.MID = championId;
    return input;
  }

  it('追加した履歴が先頭に来る', () => {
    addHistoryEntry(inputWithMid('Ahri'));
    const history = addHistoryEntry(inputWithMid('Zed'));
    expect(history).toHaveLength(2);
    expect(history[0].picks.BLUE.MID).toBe('Zed');
    expect(loadHistory()).toEqual(history);
  });

  it('直前と同一内容は重複追加しない', () => {
    addHistoryEntry(inputWithMid('Ahri'));
    const history = addHistoryEntry(inputWithMid('Ahri'));
    expect(history).toHaveLength(1);
  });

  it('上限件数を超えたら古いものから捨てる', () => {
    for (let i = 0; i < HISTORY_LIMIT + 3; i++) {
      addHistoryEntry(inputWithMid(`Champ${i}`));
    }
    const history = loadHistory();
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0].picks.BLUE.MID).toBe(`Champ${HISTORY_LIMIT + 2}`);
  });

  it('壊れたデータは空配列にフォールバックする', () => {
    globalWithStorage.localStorage!.setItem('lol-adviser:history:v1', 'not json');
    expect(loadHistory()).toEqual([]);
  });

  it('配列内の不正エントリは除外する', () => {
    const valid = createEmptyMatchInput();
    globalWithStorage.localStorage!.setItem(
      'lol-adviser:history:v1',
      JSON.stringify([valid, { selfTeam: 'GREEN' }, 42]),
    );
    const history = loadHistory();
    expect(history).toHaveLength(1);
    expect(isMatchInput(history[0])).toBe(true);
  });
});
