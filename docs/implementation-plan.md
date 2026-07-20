# 実装計画 — LoL アドバイスプロンプト生成サービス

最終更新: 2026-07-20
前提: [requirements.md](./requirements.md)・[design.md](./design.md) 承認済み。
運用ルール: 各ステップ完了時に、完了した作業と**同じやり取りの中で**チェックボックスを `[x]` に更新すること。

## フェーズ 1: プロジェクト基盤

- [x] 1-1. Vite + React + TypeScript プロジェクトを初期化(非空ディレクトリのため公式テンプレート準拠で手動作成。Vite 7 / React 18 / TS 5.8)
- [x] 1-2. git リポジトリ初期化、.gitignore 確認(.claude/settings.local.json を除外)、初回コミット
- [x] 1-3. Vitest を導入し、サンプルテストが通ることを確認(`npm run test` green)
- [x] 1-4. ディレクトリ構造を design.md 9 章の形に整備(domain / ddragon / storage / styles のスタブ作成、`npm run build` 成功確認)

## フェーズ 2: ドメインロジック(UI なしで完結・テスト必須)

- [x] 2-1. `src/domain/types.ts` — Role / Team / Rank / ChampionSummary / MatchInput 型を定義(design.md 4 章)+ 日本語ラベル・対面/敵JG 導出ヘルパー
- [x] 2-2. `src/ddragon/types.ts` — Data Dragon レスポンス型(champion.json / champion 詳細 / summoner.json)
- [x] 2-3. `src/ddragon/client.ts` — versions 取得 → champion.json / summoner.json 取得、localStorage キャッシュ(design.md 3.2 / 7 章)、チャンピオン詳細のオンデマンド取得 + メモリキャッシュ、通信失敗時 stale フォールバック
- [x] 2-4. `src/domain/search.ts` — かな正規化 + 検索(design.md 5 章)+ ユニットテスト(「あー」→アーリ、"ahri"→アーリ、前方一致優先)
- [x] 2-5. `src/domain/prompt.ts` — デフォルトテンプレート定数(design.md 6.2 全文)、変数置換、HTML タグ除去、skillData 整形(6.3)+ ユニットテスト(全変数置換、未入力→「不明」)
- [x] 2-6. `src/storage/localStorage.ts` — テンプレート / 履歴 / キャッシュの読み書き + 破損時フォールバック + テスト(計 31 テスト green)

## フェーズ 3: UI

- [x] 3-1. App 全体レイアウトとダークトーンの基本スタイル(design.md 8 章のワイヤーフレーム)
- [x] 3-2. `PickBoard` + `PickSlot` — 2 チーム × 5 ロールのスロット、選択中スロット管理、クリア操作、自分/対面スロットの強調表示
- [x] 3-3. `ChampionPicker` — 検索ボックス + アイコングリッド、選択済みグレーアウト、Enter で先頭候補確定、選択後に次の空スロットへ自動フォーカス
- [x] 3-4. `SelfConfigPanel` — チーム / ロール / ランク帯 / サモナースペル(自分・対面)/ BAN(折りたたみ)
- [x] 3-5. `GenerateBar` + `PromptOutput` — 「現時点の情報で生成」(部分入力可)、生成結果表示、クリップボードコピー + トースト
- [x] 3-6. `TemplateEditorModal` — テンプレート編集・保存・デフォルトに戻す・変数一覧ヘルプ
- [x] 3-7. `HistoryModal` — 履歴一覧(最大 10 件)表示と復元。生成実行時の履歴保存を接続
- [x] 3-8. ローディング / Data Dragon 取得失敗時のエラーバナー実装(モバイル表示の目視確認は 4-5 の通し確認で実施)
- [x] 3-9. `.claude/launch.json` を作成し(npm run dev / port 5173)、内蔵ブラウザで動作確認(実データで検索→ピック→生成→スキルデータ埋め込みを確認済み。Enter 選択と クリップボードは内蔵ブラウザの CDP 制約で E2E にて検証)

## フェーズ 4: E2E テスト・結合確認

- [x] 4-1. `@playwright/test` 導入(Chromium のみ)、`playwright.config.ts` 作成(webServer 自動起動、クリップボード権限、chromium / smoke プロジェクト分離)
- [x] 4-2. `e2e/fixtures/` に Data Dragon モック用の縮小版 JSON を作成(チャンピオン 10 体 + 詳細 3 体 + summoner.json)し、`e2e/helpers.ts` の `mockDDragon()` でインターセプト
- [x] 4-3. E2E スペック作成: フロー 1〜7 すべて green(起動表示 / かな検索+Enter / 英語ID検索 / 全入力生成 / 部分入力生成 / コピー(クリップボード実読取) / テンプレート編集・リセット / 履歴復元)計 9 テスト
- [x] 4-4. 実 CDN スモークテスト 1 本(smoke プロジェクト、`npm run test:e2e:smoke`)green
- [x] 4-5. 実データでの通し確認(内蔵ブラウザで目視済み): パッチ 16.14.1・173 体で検索 → ピック → 生成 → アーリ/ゼド/リー・シンのスキル CD・射程が実データと一致することを確認(モバイル表示の目視はデプロイ後の 5-5 で実施)
- [x] 4-6. 全ユニットテスト 31 件 + E2E 9 件 + スモーク 1 件 green、`npm run build` 成功確認(@types/node 追加)

## フェーズ 5: 公開

- [x] 5-1. `vite.config.ts` に `base: '/lol-adviser/'` 設定(本番ビルドのみ適用。dev / E2E は `/` のまま。dist の asset パスと E2E green を確認済み)
- [x] 5-2. `.github/workflows/deploy.yml` 作成(main push → ユニットテスト → E2E → build → deploy-pages。テスト失敗時はデプロイしない。実CDNスモークは warning 扱い)
- [ ] 5-3. GitHub リポジトリ `lol-adviser`(公開)作成・push(**ユーザーが手動で実施**。ブランチは main に変更済み)
- [ ] 5-4. リポジトリ設定で Pages ソースを「GitHub Actions」に設定(**ユーザーが手動で実施**)
- [ ] 5-5. 公開 URL での動作確認(クリップボードコピー・モバイル表示含む)
- [x] 5-6. README.md 作成(概要・使い方・開発コマンド・デプロイ手順・Riot 出典表記)

## 注意事項(実装セッション向け)

- Data Dragon の説明文は HTML を含む。`tooltip` は使わず `description` を使う(design.md 3.3)
- CD / 射程は `cooldownBurn` / `rangeBurn` 文字列を使う
- GitHub Pages の `base` 設定忘れが最頻出の 404 原因
- 依存追加は最小限(ランタイムは react / react-dom のみの方針)
