import { describe, expect, it } from 'vitest';
import { buildLolalyticsUrl, championLolalyticsSlug } from './lolalytics';
import { createEmptyMatchInput, type MatchInput } from './types';

describe('championLolalyticsSlug', () => {
  it('通常のチャンピオンは id を小文字化するだけで一致する', () => {
    expect(championLolalyticsSlug('Ahri')).toBe('ahri');
    expect(championLolalyticsSlug('Trundle')).toBe('trundle');
    expect(championLolalyticsSlug('KSante')).toBe('ksante');
    expect(championLolalyticsSlug('RekSai')).toBe('reksai');
  });

  it('Wukong は Data Dragon の id (MonkeyKing) を例外的に wukong へ変換する', () => {
    expect(championLolalyticsSlug('MonkeyKing')).toBe('wukong');
  });
});

describe('buildLolalyticsUrl', () => {
  function inputWith(overrides: Partial<MatchInput>): MatchInput {
    return { ...createEmptyMatchInput(), ...overrides };
  }

  it('自分と対面(敵チームの同ロール)が揃っていれば lane・vslane 付きの URL を生成する(JG 同士の例)', () => {
    const input = inputWith({
      selfTeam: 'BLUE',
      selfRole: 'JG',
      picks: {
        BLUE: { JG: 'Rammus' },
        RED: { JG: 'Trundle' },
      },
    });
    expect(buildLolalyticsUrl(input)).toBe(
      'https://lolalytics.com/ja/lol/rammus/vs/trundle/build/?lane=jungle&vslane=jungle',
    );
  });

  it('Wukong は Data Dragon の id (MonkeyKing) を例外的に wukong へ変換する', () => {
    const input = inputWith({
      selfTeam: 'BLUE',
      selfRole: 'JG',
      picks: {
        BLUE: { JG: 'MonkeyKing' },
        RED: { JG: 'Trundle' },
      },
    });
    expect(buildLolalyticsUrl(input)).toBe(
      'https://lolalytics.com/ja/lol/wukong/vs/trundle/build/?lane=jungle&vslane=jungle',
    );
  });

  it('対面が未入力なら自チャンピオン単体のビルドページを lane 付きで返す', () => {
    const onlySelf = inputWith({
      selfTeam: 'BLUE',
      selfRole: 'MID',
      picks: { BLUE: { MID: 'Ahri' }, RED: {} },
    });
    expect(buildLolalyticsUrl(onlySelf)).toBe(
      'https://lolalytics.com/ja/lol/ahri/build/?lane=middle',
    );
  });

  it('自チャンピオンが未入力なら undefined を返す', () => {
    const neither = inputWith({ selfRole: 'TOP' });
    expect(buildLolalyticsUrl(neither)).toBeUndefined();
  });

  it('ロールに応じて lane・vslane が変わる', () => {
    const input = inputWith({
      selfTeam: 'RED',
      selfRole: 'SUP',
      picks: {
        BLUE: { SUP: 'Nautilus' },
        RED: { SUP: 'Lulu' },
      },
    });
    expect(buildLolalyticsUrl(input)).toBe(
      'https://lolalytics.com/ja/lol/lulu/vs/nautilus/build/?lane=support&vslane=support',
    );
  });
});
