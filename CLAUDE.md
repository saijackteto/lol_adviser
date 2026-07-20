# LoL Adviser — プロジェクトガイド

League of Legends のチャンピオンセレクト中にピック情報を入力し、レーン戦・集団戦・勝利条件のアドバイスを LLM に求める**プロンプトを生成する**静的 Web サービス(日本語 UI)。LLM API 呼び出しは行わない(ユーザーがコピーして ChatGPT / Claude 等に貼る)。

## 必読ドキュメント(セッション開始時に読むこと)

1. [docs/requirements.md](docs/requirements.md) — 確定済み要件(ユーザー承認済み。勝手に変更しない)
2. [docs/design.md](docs/design.md) — 技術設計(スタック、Data Dragon 連携、型、プロンプトテンプレート全文、UI 構成、デプロイ)
3. [docs/implementation-plan.md](docs/implementation-plan.md) — 実装チェックリスト。**ここの未完了タスクから作業を再開し、完了したら同じやり取り内で `[x]` に更新すること**

## 確定済みの重要決定(要件変更なしに覆さない)

- プロンプト生成のみ(v1 では LLM API 連携なし)
- バックエンドなし。外部通信は Data Dragon CDN のみ(Riot API キー不使用)
- スタック: Vite + React 18 + TypeScript + CSS Modules + Vitest + Playwright(E2E)。ランタイム依存は react / react-dom のみ(ライブラリを勝手に追加しない)
- テストは 3 層(design.md 11 章): Vitest ユニットテスト / `@playwright/test` による E2E(Data Dragon はモック)/ Claude Code 内蔵ブラウザでの対話的動作確認。UI 変更後は内蔵ブラウザで確認すること
- ホスティング: GitHub Pages(GitHub Actions でデプロイ)
- 最重要要件: LLM 知識カットオフ対策として、パッチバージョン明記 + Data Dragon のスキルデータ(CD・射程・説明)をプロンプトへ埋め込む

## 開発コマンド(フェーズ 1 完了後に有効)

```bash
npm run dev       # 開発サーバー (port 5173。内蔵ブラウザは .claude/launch.json 経由で起動)
npm run test      # Vitest (ユニットテスト)
npm run test:e2e  # Playwright E2E (headless。--ui でデバッグモード)
npm run build     # 本番ビルド(GitHub Pages 用。vite.config.ts の base 設定必須)
```

## 実装時の落とし穴(design.md 3.3 / 10 章より)

- Data Dragon のスキル説明は `tooltip` ではなく `description` を使い、HTML タグを除去する
- CD / 射程は `cooldownBurn` / `rangeBurn`(文字列)を使う
- `vite.config.ts` の `base` は配信 URL に一致させる(ずれるとアセット 404)。カスタムドメイン `lol_adviser.saijack.com` のルート配信のため `'/'`(github.io パス配下に戻すなら `'/<リポジトリ名>/'`)
- localStorage 読み込みは必ず破損時フォールバックを付ける

## ディレクトリ規約

- アプリコード: ワークスペースルート直下(`src/` 等)
- ドキュメント: `docs/` のみ。設計変更時は該当ドキュメントも同時更新する
