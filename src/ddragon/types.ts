// Data Dragon レスポンス型(design.md 3 章)。使用フィールドのみ定義する。

/** GET /cdn/{version}/data/ja_JP/champion.json */
export interface DDragonChampionListResponse {
  version: string;
  data: Record<string, DDragonChampionListEntry>;
}

export interface DDragonChampionListEntry {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
}

/** GET /cdn/{version}/data/ja_JP/champion/{championId}.json */
export interface DDragonChampionDetailResponse {
  data: Record<string, DDragonChampionDetail>;
}

export interface DDragonChampionDetail {
  id: string;
  name: string;
  title: string;
  tags: string[];
  passive: {
    name: string;
    /** HTML タグを含む。使用時は除去すること */
    description: string;
  };
  /** Q/W/E/R の順。description は HTML を含む。tooltip は未解決プレースホルダを含むため使わない */
  spells: DDragonSpell[];
}

export interface DDragonSpell {
  id: string;
  name: string;
  description: string;
  /** 例 "12/11/10/9/8"(文字列。cooldown 配列より表記が楽) */
  cooldownBurn: string;
  rangeBurn: string;
  costBurn: string;
}

/** GET /cdn/{version}/data/ja_JP/summoner.json */
export interface DDragonSummonerSpellsResponse {
  data: Record<string, DDragonSummonerSpellEntry>;
}

export interface DDragonSummonerSpellEntry {
  id: string;
  name: string;
  /** "CLASSIC" を含むものだけをサモナーズリフト用として使う */
  modes: string[];
}
