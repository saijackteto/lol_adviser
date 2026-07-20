import { describe, expect, it } from 'vitest';
import type { DDragonChampionDetail } from '../ddragon/types';
import {
  DEFAULT_TEMPLATE,
  TEMPLATE_VARIABLES,
  buildPrompt,
  formatSkillData,
  stripHtml,
  type PromptBuildContext,
} from './prompt';
import { createEmptyMatchInput, type MatchInput } from './types';

const CHAMPION_NAMES: Record<string, string> = {
  Ahri: 'アーリ',
  Zed: 'ゼド',
  LeeSin: 'リー・シン',
  Garen: 'ガレン',
  Jinx: 'ジンクス',
};

const SPELL_NAMES: Record<string, string> = {
  SummonerFlash: 'フラッシュ',
  SummonerDot: 'イグナイト',
  SummonerTeleport: 'テレポート',
};

function detail(overrides: Partial<DDragonChampionDetail> = {}): DDragonChampionDetail {
  return {
    id: 'Zed',
    name: 'ゼド',
    title: '影の主',
    tags: ['Assassin'],
    passive: { name: '影の斬撃', description: '体力が低い敵に<font color="#FF0000">追加ダメージ</font>を与える。' },
    spells: [
      { id: 'ZedQ', name: '手裏剣', description: '手裏剣を投げる。<br>貫通する。', cooldownBurn: '6/5.5/5/4.5/4', rangeBurn: '900', costBurn: '75/70/65/60/55' },
      { id: 'ZedW', name: '影分身', description: '影を作り出す。', cooldownBurn: '20/18.5/17/15.5/14', rangeBurn: '650', costBurn: '40/35/30/25/20' },
      { id: 'ZedE', name: '影薙ぎ', description: '周囲を斬りつける。', cooldownBurn: '5', rangeBurn: '290', costBurn: '50' },
      { id: 'ZedR', name: '死の刻印', description: '対象に刻印を付ける。', cooldownBurn: '120/100/80', rangeBurn: '625', costBurn: '0' },
    ],
    ...overrides,
  };
}

function fullInput(): MatchInput {
  return {
    picks: {
      BLUE: { TOP: 'Garen', JG: 'LeeSin', MID: 'Ahri', ADC: 'Jinx', SUP: 'Jinx2' },
      RED: { TOP: 'Garen2', JG: 'LeeSin', MID: 'Zed', ADC: 'Jinx3', SUP: 'Jinx4' },
    },
    selfTeam: 'BLUE',
    selfRole: 'MID',
    rank: 'GOLD',
    selfSpells: ['SummonerFlash', 'SummonerDot'],
    opponentSpells: ['SummonerFlash', undefined],
    bans: ['Ahri2'],
  };
}

function context(input: MatchInput, overrides: Partial<PromptBuildContext> = {}): PromptBuildContext {
  return {
    patchVersion: '26.14.1',
    input,
    championName: (id) => CHAMPION_NAMES[id],
    spellName: (id) => SPELL_NAMES[id],
    skillDetails: [detail()],
    ...overrides,
  };
}

describe('stripHtml', () => {
  it('HTML タグを除去し空白を整える', () => {
    expect(stripHtml('体力が低い敵に<font color="#FF0000">追加ダメージ</font>を与える。')).toBe(
      '体力が低い敵に追加ダメージを与える。',
    );
    expect(stripHtml('一行目<br>二行目<br />三行目')).toBe('一行目 二行目 三行目');
  });
});

describe('formatSkillData', () => {
  it('パッシブと Q/W/E/R を CD・射程付きで整形する', () => {
    const text = formatSkillData([detail()]);
    expect(text).toContain('### ゼド(影の主)');
    expect(text).toContain('- パッシブ: 影の斬撃 — 体力が低い敵に追加ダメージを与える。');
    expect(text).toContain('- Q: 手裏剣 — CD 6/5.5/5/4.5/4秒 / 射程 900 — 手裏剣を投げる。 貫通する。');
    expect(text).toContain('- R: 死の刻印 — CD 120/100/80秒 / 射程 625 —');
  });

  it('長い説明文は切り詰めるが CD・射程は残る', () => {
    const longDescription = 'あ'.repeat(500);
    const text = formatSkillData([
      detail({ spells: [{ id: 'Q', name: 'スキル', description: longDescription, cooldownBurn: '10', rangeBurn: '500', costBurn: '0' }] }),
    ]);
    expect(text).toContain('CD 10秒 / 射程 500');
    expect(text).toContain('…');
    expect(text).not.toContain(longDescription);
  });

  it('空配列はプレースホルダ文言を返す', () => {
    expect(formatSkillData([])).toBe('(スキルデータなし)');
  });
});

describe('buildPrompt', () => {
  it('全変数が置換され、未置換のプレースホルダが残らない', () => {
    const prompt = buildPrompt(context(fullInput()));
    for (const variable of TEMPLATE_VARIABLES) {
      expect(prompt).not.toContain(`{{${variable.name}}}`);
    }
    expect(prompt).toContain('パッチバージョン: 26.14.1');
    expect(prompt).toContain('私のチャンピオン: アーリ(サモナースペル: フラッシュ / イグナイト)');
    expect(prompt).toContain('対面のチャンピオン: ゼド(サモナースペル: フラッシュ)');
    expect(prompt).toContain('私のランク帯: ゴールド');
    expect(prompt).toContain('私のロール: ミッド');
    expect(prompt).toContain('敵ジャングラー(リー・シン)');
  });

  it('名前解決できないチャンピオン ID はそのまま表示する', () => {
    const prompt = buildPrompt(context(fullInput()));
    expect(prompt).toContain('- サポート: Jinx4'); // 敵チーム構成
    expect(prompt).toContain('Ahri2'); // BAN
  });

  it('部分入力では未確定箇所が「不明」になる', () => {
    const input = createEmptyMatchInput();
    input.picks.BLUE.MID = 'Ahri'; // 自分のみ確定
    const prompt = buildPrompt(context(input, { skillDetails: [] }));
    expect(prompt).toContain('私のチャンピオン: アーリ(サモナースペル: 不明)');
    expect(prompt).toContain('対面のチャンピオン: 不明');
    expect(prompt).toContain('私のランク帯: 不明');
    expect(prompt).toContain('敵ジャングラー(不明)');
    expect(prompt).toContain('- トップ: 不明');
    expect(prompt).toContain('なし / 不明'); // BAN
    expect(prompt).toContain('(スキルデータなし)');
  });

  it('レッドサイド選択時は味方/敵チームが入れ替わる', () => {
    const input = fullInput();
    input.selfTeam = 'RED';
    const prompt = buildPrompt(context(input));
    const allySection = prompt.slice(prompt.indexOf('## 味方チーム構成'), prompt.indexOf('## 敵チーム構成'));
    expect(allySection).toContain('- ミッド: ゼド');
  });

  it('カスタムテンプレートを使用できる', () => {
    const prompt = buildPrompt(context(fullInput(), { template: '対面は {{opponentChampion}} です' }));
    expect(prompt).toBe('対面は ゼド です');
  });

  it('デフォルトテンプレートに要求 5 項目の見出しが含まれる', () => {
    for (const heading of ['## 1. レーン戦', '## 2. ガンク警戒', '## 3. 集団戦', '## 4. 勝利条件', '## 5. ビルド・ルーンの対面調整']) {
      expect(DEFAULT_TEMPLATE).toContain(heading);
    }
  });
});
