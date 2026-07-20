# 実装計画 — LoL アドバイスプロンプト生成サービス

最終更新: 2026-07-20
前提: [requirements.md](./requirements.md)・[design.md](./design.md) 承認済み。
運用ルール: 各ステップ完了時に、完了した作業と**同じやり取りの中で**チェックボックスを `[x]` に更新すること。

## フェーズ 1: プロジェクト基盤

- [ ] 1-1. Vite + React + TypeScript プロジェクトを初期化(`npm create vite@latest . -- --template react-ts`)。既存の docs/ や CLAUDE.md を壊さないこと
- [ ] 1-2. git リポジトリ初期化、.gitignore 確認、初回コミット
- [ ] 1-3. Vitest を導入し、サンプルテストが通ることを確認
- [ ] 1-4. ディレクトリ構造を design.md 9 章の形に整備(空ファイル・型定義から)

## フェーズ 2: ドメインロジック(UI なしで完結・テスト必須)

- [ ] 2-1. `src/domain/types.ts` — Role / Team / Rank / ChampionSummary / MatchInput 型を定義(design.md 4 章)
- [ ] 2-2. `src/ddragon/types.ts` — Data Dragon レスポンス型(champion.json / champion 詳細 / summoner.json)
- [ ] 2-3. `src/ddragon/client.ts` — versions 取得 → champion.json / summoner.json 取得、localStorage キャッシュ(design.md 3.2 / 7 章)、チャンピオン詳細のオンデマンド取得 + メモリキャッシュ
- [ ] 2-4. `src/domain/search.ts` — かな正規化 + 検索(design.md 5 章)+ ユニットテスト(「あー」→アーリ、"ahri"→アーリ、前方一致優先)
- [ ] 2-5. `src/domain/prompt.ts` — デフォルトテンプレート定数(design.md 6.2 全文)、変数置換、HTML タグ除去、skillData 整形(6.3)+ ユニットテスト(全変数置換、未入力→「不明」)
- [ ] 2-6. `src/storage/localStorage.ts` — テンプレート / 履歴 / キャッシュの読み書き + 破損時フォールバック + テスト

## フェーズ 3: UI

- [ ] 3-1. App 全体レイアウトとダークトーンの基本スタイル(design.md 8 章のワイヤーフレーム)
- [ ] 3-2. `PickBoard` + `PickSlot` — 2 チーム × 5 ロールのスロット、選択中スロット管理、クリア操作、自分/対面スロットの強調表示
- [ ] 3-3. `ChampionPicker` — 検索ボックス + アイコングリッド、選択済みグレーアウト、Enter で先頭候補確定、選択後に次の空スロットへ自動フォーカス
- [ ] 3-4. `SelfConfigPanel` — チーム / ロール / ランク帯 / サモナースペル(自分・対面)/ BAN(折りたたみ)
- [ ] 3-5. `GenerateBar` + `PromptOutput` — 「現時点の情報で生成」(部分入力可)、生成結果表示、クリップボードコピー + トースト
- [ ] 3-6. `TemplateEditorModal` — テンプレート編集・保存・デフォルトに戻す・変数一覧ヘルプ
- [ ] 3-7. `HistoryModal` — 履歴一覧(最大 10 件)表示と復元。生成実行時の履歴保存を接続
- [ ] 3-8. ローディング / Data Dragon 取得失敗時のエラーバナー、モバイルでの表示崩れ確認
- [ ] 3-9. `.claude/launch.json` を作成し(npm run dev / port 5173)、各 UI タスクの完了時に Claude Code 内蔵ブラウザで動作確認する運用を開始(design.md 11.3)

## フェーズ 4: E2E テスト・結合確認

- [ ] 4-1. `@playwright/test` 導入(Chromium のみ)、`playwright.config.ts` 作成(webServer 自動起動、クリップボード権限。design.md 11.2)
- [ ] 4-2. `e2e/fixtures/` に Data Dragon モック用の縮小版 JSON を作成(チャンピオン 10 体程度 + 詳細 2〜3 体 + summoner.json)し、`page.route()` によるインターセプト共通処理を用意
- [ ] 4-3. E2E スペック作成: design.md 11.2 のフロー 1〜7(起動表示 / かな検索 / 全入力生成 / 部分入力生成 / コピー / テンプレート編集 / 履歴復元)
- [ ] 4-4. 実 CDN スモークテスト 1 本(`@smoke` タグ)
- [ ] 4-5. 実データでの通し確認(内蔵ブラウザで目視): 起動 → 最新パッチ取得 → 10 ピック入力 → 生成 → スキルデータの CD / 射程が実データと一致するか検証
- [ ] 4-6. 全ユニットテスト + E2E green、`npm run build` 成功確認

## フェーズ 5: 公開

- [ ] 5-1. `vite.config.ts` に `base: '/<リポジトリ名>/'` 設定
- [ ] 5-2. `.github/workflows/deploy.yml` 作成(main push → ユニットテスト → E2E → build → deploy-pages。テスト失敗時はデプロイしない)
- [ ] 5-3. GitHub リポジトリ作成・push(ユーザー確認の上で実施)
- [ ] 5-4. リポジトリ設定で Pages ソースを「GitHub Actions」に設定(手動作業 — ユーザーに依頼)
- [ ] 5-5. 公開 URL での動作確認(クリップボードコピー含む)
- [ ] 5-6. README.md 作成(概要・使い方・開発コマンド・デプロイ手順)

## 注意事項(実装セッション向け)

- Data Dragon の説明文は HTML を含む。`tooltip` は使わず `description` を使う(design.md 3.3)
- CD / 射程は `cooldownBurn` / `rangeBurn` 文字列を使う
- GitHub Pages の `base` 設定忘れが最頻出の 404 原因
- 依存追加は最小限(ランタイムは react / react-dom のみの方針)
