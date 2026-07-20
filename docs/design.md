# 設計書 — LoL アドバイスプロンプト生成サービス

最終更新: 2026-07-20
前提: [requirements.md](./requirements.md) の要件を実装するための技術設計。

## 1. 技術スタック

| 領域 | 選定 | 理由 |
|---|---|---|
| ビルド | Vite | 静的 SPA のデファクト。GitHub Pages 向けビルドが容易 |
| UI | React 18 + TypeScript | コンポーネント分割と型安全。Data Dragon のレスポンス型を定義して安全に扱う |
| 状態管理 | React 標準(useState / useReducer + Context) | 外部ライブラリ不要の規模。追加依存は最小にする |
| スタイル | 素の CSS(CSS Modules) | 依存を増やさない。ダークトーン基調(ゲーマー向け) |
| テスト | Vitest | Vite 標準。ロジック(検索正規化・プロンプト生成)を優先的にテスト |
| ホスティング | GitHub Pages + GitHub Actions | 無料・自動デプロイ |

ランタイム依存は React / React-DOM のみとする。UI ライブラリ・fetch ラッパー・状態管理ライブラリは追加しない。

## 2. アーキテクチャ概要

```text
[ブラウザ (SPA)]
   ├── UI (React)
   ├── ドメインロジック (純粋関数: 検索正規化 / プロンプト生成)
   ├── Data Dragon クライアント (fetch + キャッシュ)
   └── localStorage (テンプレート / 履歴 / データキャッシュ)
          │
          ▼ HTTPS (CORS 許可済み・認証不要)
[Data Dragon CDN (ddragon.leagueoflegends.com)]
```

バックエンドなし。外部通信は Data Dragon のみ。

## 3. Data Dragon 連携

### 3.1 使用エンドポイント

| 用途 | URL |
|---|---|
| 最新バージョン取得 | `https://ddragon.leagueoflegends.com/api/versions.json` → 配列の先頭 `[0]` が最新(例: `"14.x.1"`) |
| チャンピオン一覧(日本語) | `https://ddragon.leagueoflegends.com/cdn/{version}/data/ja_JP/champion.json` |
| チャンピオン詳細(日本語) | `https://ddragon.leagueoflegends.com/cdn/{version}/data/ja_JP/champion/{championId}.json` |
| チャンピオンアイコン | `https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{championId}.png` |
| サモナースペル一覧(日本語) | `https://ddragon.leagueoflegends.com/cdn/{version}/data/ja_JP/summoner.json` |
| サモナースペルアイコン | `https://ddragon.leagueoflegends.com/cdn/{version}/img/spell/{spellId}.png` |

`{championId}` は英語 ID(例: `Ahri`, `MonkeyKing`)。`champion.json` の各エントリの `id` フィールド。

### 3.2 取得戦略

- 起動時: `versions.json` → 最新 version 決定 → `champion.json`(一覧)を取得
- 一覧は `localStorage` にバージョン付きでキャッシュし、同一バージョンなら再取得しない
- チャンピオン詳細(`{championId}.json`)は**プロンプト生成時に必要なチャンピオンのみオンデマンド取得**(自分・対面・敵 JG など最大 10 件)。取得済みはメモリキャッシュ
- サモナースペルは `summoner.json` から `modes` に `"CLASSIC"` を含むものだけをフィルタして選択肢にする
- 通信失敗時: キャッシュがあればそれで動作継続し、警告バナーを表示。キャッシュもなければエラー画面

### 3.3 データ整形の注意点(実装時の落とし穴)

- スキルの `description` は **HTML タグ(`<br>`, `<font>` 等)を含む** → タグ除去してからプロンプトに埋め込む
- `tooltip` は `{{ e1 }}` のような未解決プレースホルダを含むため**使わない**。`description` を使う
- CD・射程・コストは数値配列ではなく **`cooldownBurn` / `rangeBurn` / `costBurn`(`"12/11/10/9/8"` 形式の文字列)** を使うと表記が楽
- パッシブは `passive.name` / `passive.description`(同様に HTML 除去)

## 4. ドメインモデル(TypeScript)

```typescript
type Role = 'TOP' | 'JG' | 'MID' | 'ADC' | 'SUP';
type Team = 'BLUE' | 'RED';
type Rank =
  | 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'EMERALD'
  | 'DIAMOND' | 'MASTER' | 'GRANDMASTER' | 'CHALLENGER';

interface ChampionSummary {   // champion.json 由来
  id: string;                 // "Ahri" (英語ID・詳細取得やアイコンURLに使う)
  key: string;                // "103" (数値キー)
  name: string;               // "アーリ" (日本語名)
  title: string;
  tags: string[];             // ["Mage", "Assassin"]
}

interface MatchInput {
  picks: Record<Team, Partial<Record<Role, string>>>; // 値は championId。未定は undefined
  selfTeam: Team;
  selfRole: Role;
  rank?: Rank;
  selfSpells: [string?, string?];      // サモナースペルID (例 "SummonerFlash")
  opponentSpells: [string?, string?];  // 対面レーナーのスペル
  bans: string[];                      // championId 最大10
}
```

派生値(状態として持たず計算する):

- 対面レーナー = `picks[敵チーム][selfRole]`
- 敵ジャングラー = `picks[敵チーム]['JG']`

## 5. チャンピオン検索の正規化

「あー」→「アーリ」を成立させるための照合ロジック(純粋関数、要ユニットテスト):

1. 入力・チャンピオン名の双方に正規化を適用して前方一致/部分一致で照合
2. 正規化内容:
   - ひらがな → カタカナ変換(`String.prototype.replace` + コードポイントシフト U+3041–U+3096 → +0x60)
   - 全角英数 → 半角、大文字化
   - 記号・スペース・「・」の除去
3. 日本語名(`name`)と英語 ID(`id`)の両方を照合対象にする(例: "ahri" でもヒット)
4. 結果は前方一致を部分一致より上位に表示

## 6. プロンプトテンプレート

### 6.1 テンプレート変数

テンプレートは以下のプレースホルダを含むプレーンテキスト。生成時に置換する。

| 変数 | 内容 |
|---|---|
| `{{patchVersion}}` | Data Dragon の最新バージョン |
| `{{selfChampion}}` | 自分のチャンピオン名(未定なら「不明」) |
| `{{selfRole}}` | 自分のロール(日本語表記: トップ/ジャングル/ミッド/ADC/サポート) |
| `{{rank}}` | ランク帯(未選択なら「不明」) |
| `{{opponentChampion}}` | 対面レーナーのチャンピオン名 |
| `{{selfSpells}}` / `{{opponentSpells}}` | サモナースペル名(未入力なら「不明」) |
| `{{blueTeam}}` / `{{redTeam}}` | 各チームのピック一覧(ロール: チャンピオン名、未定は「不明」) |
| `{{allyTeam}}` / `{{enemyTeam}}` | 自チーム/敵チーム視点のピック一覧 |
| `{{enemyJungler}}` | 敵ジャングラーのチャンピオン名 |
| `{{bans}}` | BAN 一覧(未入力なら「なし/不明」) |
| `{{skillData}}` | 埋め込みスキルデータ(6.3 参照) |

### 6.2 デフォルトテンプレート(全文)

```text
あなたは League of Legends のハイレベルなコーチです。以下の試合情報をもとに、私へのアドバイスを日本語で出力してください。

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
以下の 5 項目を、この順番・この見出しで出力してください。ランク帯({{rank}})のプレイヤーが実行可能な内容にしてください。

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
```

### 6.3 `{{skillData}}` の生成仕様

チャンピオン詳細 JSON から、以下の対象について整形テキストを生成して埋め込む:

- 対象: **自分・対面レーナー・敵ジャングラー**(重複は除く。未定のものはスキップ)
- 各チャンピオンにつき:

```text
### {日本語名} ({title})
- パッシブ: {passive.name} — {説明(HTML除去)}
- Q: {name} — CD {cooldownBurn}秒 / 射程 {rangeBurn} — {説明(HTML除去)}
- W: ...(以下 E, R 同様)
```

- 説明文は HTML タグ除去後、1 スキルあたり 200 文字程度で切り詰めてよい(プロンプト肥大防止)。CD と射程は削らない

### 6.4 テンプレート編集機能

- 設定画面でテンプレート全文を textarea 編集できる
- 保存先: localStorage(7 章)。「デフォルトに戻す」でビルトインのデフォルトに復元
- 生成時は「保存済みカスタムテンプレート > デフォルト」の優先で使用
- 変数一覧をヘルプ表示する

## 7. localStorage スキーマ

| キー | 内容 |
|---|---|
| `lol-adviser:ddragon-cache:v1` | `{ version: string, fetchedAt: string, champions: ChampionSummary[], summonerSpells: [...] }` |
| `lol-adviser:template:v1` | カスタムテンプレート文字列(未編集なら未設定) |
| `lol-adviser:history:v1` | `MatchInput[]`(新しい順、最大 10 件。生成実行時に先頭へ追加) |

読み込み時は必ず try-catch + 型チェックし、壊れていたら破棄してデフォルトにフォールバックする。

## 8. UI 構成

```text
┌──────────────────────────────────────────────┐
│ ヘッダー: タイトル / パッチver表示 / [テンプレート編集] [履歴] │
├──────────────────────────────────────────────┤
│  ブルーサイド          レッドサイド            │
│  TOP [アイコン/空]      TOP [アイコン/空]       │
│  JG  [...]             JG  [...]              │
│  MID [...]             MID [...]              │
│  ADC [...]             ADC [...]              │
│  SUP [...]             SUP [...]              │
│  (スロットクリックで下部のピッカーが対象スロットに紐づく)   │
├──────────────────────────────────────────────┤
│ チャンピオンピッカー: [検索ボックス] + アイコングリッド      │
├──────────────────────────────────────────────┤
│ 自分の設定: チーム / ロール / ランク帯 /                  │
│            自分スペル×2 / 対面スペル×2 / BAN(折りたたみ)   │
├──────────────────────────────────────────────┤
│ [現時点の情報で生成] ボタン(常に押下可能)                 │
├──────────────────────────────────────────────┤
│ 生成結果: プロンプト表示 + [コピー] ボタン                │
└──────────────────────────────────────────────┘
```

### コンポーネント分割

```text
App
├── Header (パッチ表示 / モーダル起動)
├── PickBoard (2チーム×5ロールのスロット群、選択中スロット管理)
│   └── PickSlot ×10
├── ChampionPicker (検索 + アイコングリッド)
├── SelfConfigPanel (チーム/ロール/ランク/スペル/BAN)
├── GenerateBar (生成ボタン)
├── PromptOutput (結果表示 + コピー)
├── TemplateEditorModal
└── HistoryModal
```

### UX 細部

- スロット選択 → ピッカーで選ぶ → **自動的に次の空スロットへフォーカス移動**(高速入力のため)
- 検索ボックスは選択後に自動クリア&フォーカス維持。Enter で先頭候補を確定
- 自分のスロットには強調枠、対面スロットには対面マークを表示
- コピーは `navigator.clipboard.writeText`(GitHub Pages は HTTPS なので利用可)。成功時「コピーしました」トースト

## 9. プロジェクト構造

```text
lol_adviser/
├── docs/                    # 本ドキュメント群(要件・設計・計画)
├── index.html
├── package.json
├── vite.config.ts           # base: '/<リポジトリ名>/' (GitHub Pages 用)
├── tsconfig.json
├── playwright.config.ts     # webServer 自動起動 / Chromium / クリップボード権限
├── .claude/launch.json      # 内蔵ブラウザでの動作確認用 (npm run dev, port 5173)
├── .github/workflows/deploy.yml
├── e2e/
│   ├── fixtures/            # Data Dragon モック用の縮小版 JSON
│   └── *.spec.ts            # 11.2 のフロー別 E2E スペック
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── components/          # 8章のコンポーネント群
    ├── domain/
    │   ├── types.ts         # 4章の型定義
    │   ├── search.ts        # 5章の正規化・検索(純粋関数)
    │   └── prompt.ts        # 6章のテンプレート置換・skillData生成(純粋関数)
    ├── ddragon/
    │   ├── client.ts        # fetch + キャッシュ
    │   └── types.ts         # Data Dragon レスポンス型
    ├── storage/
    │   └── localStorage.ts  # 7章のスキーマの読み書き
    └── styles/
```

## 10. GitHub Pages デプロイ

- `vite.config.ts` の `base` を `'/<リポジトリ名>/'` に設定する(これを忘れるとアセット 404 になる。最頻出の落とし穴)
- `.github/workflows/deploy.yml`: main への push で `npm ci` → ユニットテスト → E2E テスト(Playwright)→ `npm run build` → `actions/deploy-pages` で `dist/` を公開。**テスト失敗時はデプロイしない**(11.2 参照)
- リポジトリ設定で Pages のソースを「GitHub Actions」にする(手動作業、README に記載)

## 11. テスト・動作確認方針

3 層で品質を担保する。

### 11.1 ユニットテスト(Vitest)

純粋関数を優先的にテストする:

- `search.ts`: ひらがな→カタカナ正規化、「あー」→アーリ、英語 ID 検索、前方一致優先
- `prompt.ts`: 変数置換(全変数)、未入力時の「不明」フォールバック、HTML タグ除去、skillData 整形
- `localStorage.ts`: 壊れたデータでのフォールバック

### 11.2 E2E テスト(@playwright/test)— ブラウザ上の自動回帰テスト

`@playwright/test` を devDependency として導入し、実ブラウザ(Chromium のみで十分)で主要フローをコードとしてテストする。**Playwright MCP とは別物**であることに注意(11.3 参照)。

テスト対象フロー:

1. 起動 → チャンピオングリッドが表示される(ローディング → 表示)
2. 検索ボックスに「あー」と入力 → アーリが候補先頭に出る → Enter で選択中スロットに反映される
3. 10 スロット入力 → 自分のチーム/ロール/ランク帯を設定 → 生成 → プロンプトにチャンピオン名・パッチバージョン・スキルデータ(CD 表記)が含まれる
4. 部分入力(自分と対面のみ)で生成 → 未入力箇所が「不明」になる
5. コピーボタン → クリップボードにプロンプト全文が入る
6. テンプレート編集 → 保存 → 生成結果に反映される / デフォルトに戻す
7. 生成後にリロード → 履歴から復元できる

実装上の要点:

- **Data Dragon はモックする**: `page.route()` で `ddragon.leagueoflegends.com` へのリクエストをインターセプトし、`e2e/fixtures/` に置いた縮小版 JSON(チャンピオン 10 体程度 + 詳細 2〜3 体 + summoner.json)を返す。これでテストが決定的・高速・オフライン実行可能になる
- 実 CDN への疎通確認は「versions.json が取れて一覧が描画される」スモークテスト 1 本だけ実 API で行う(タグ `@smoke`、CI では失敗しても警告扱い)
- クリップボード検証は Chromium の context に `permissions: ['clipboard-read', 'clipboard-write']` を付与して `navigator.clipboard.readText()` で確認する
- `playwright.config.ts` の `webServer` 設定で dev サーバーを自動起動する(手動起動不要)
- コマンド: `npm run test:e2e`(headless)/ `npm run test:e2e -- --ui`(デバッグ用 UI モード)

CI 連携: GitHub Actions で push / PR 時に「ユニットテスト → E2E → ビルド」を実行し、**デプロイジョブはテスト成功を条件にする**(10 章のワークフローにテストジョブを追加)。

### 11.3 開発中の対話的なブラウザ動作確認(AI エージェント)

- **Claude Code には内蔵ブラウザ(Browser pane)があり、追加導入なしで動作確認できる**。dev サーバーを起動して画面の目視確認・クリック操作・スクリーンショット・コンソールエラー/ネットワークの確認が可能。実装セッションでは各 UI タスク完了時にこれで確認する
- 内蔵ブラウザ用に `.claude/launch.json` を用意する(`npm run dev`、port 5173)
- **Playwright MCP について**: AI エージェントにブラウザを操作させる MCP サーバーであり、内蔵ブラウザを持たないクライアントを使う場合の代替手段。対話的確認には有効だが、**実行結果がコードとして残らないため回帰テストの代替にはならない**。繰り返し可能なテストは 11.2 の `@playwright/test` で担保する。本プロジェクトでは Claude Code の内蔵ブラウザがあるため導入は必須ではない(導入する場合は `claude mcp add playwright -- npx @playwright/mcp@latest`)
