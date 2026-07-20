# LoL Adviser

League of Legends のチャンピオンセレクト中にピック情報を入力すると、レーン戦・集団戦・勝利条件などのアドバイスを LLM に求めるための**プロンプトを生成する** Web サービスです(日本語)。

生成されたプロンプトをコピーして ChatGPT / Claude などに貼り付けて使います。LLM API の呼び出しは行いません。

## 特徴

- **LLM の知識カットオフ対策**: パッチバージョンを明記し、[Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon)(Riot 公式 CDN)から取得した自分・対面・敵ジャングラーのスキルデータ(CD・射程・説明)をプロンプトに埋め込むため、最新パッチでも正確なアドバイスを引き出せます
- **チャンセレ中でも間に合う入力 UX**: ひらがな対応のインクリメンタル検索(「あー」→アーリ)+ アイコングリッド、ピック後は次の空きスロットへ自動移動
- **部分入力で生成可能**: 自分と対面が決まった時点でも「現時点の情報で生成」できます
- プロンプトのワンクリックコピー / テンプレートのカスタマイズ / 入力履歴の復元(localStorage)
- バックエンドなしの静的 SPA。外部通信は Data Dragon のみ(API キー不要・完全無料)

## 開発

```bash
npm install
npm run dev            # 開発サーバー (http://localhost:5173)
npm run test           # ユニットテスト (Vitest)
npm run test:e2e       # E2E テスト (Playwright / Data Dragon はモック)
npm run test:e2e:smoke # 実 Data Dragon への疎通スモークテスト
npm run build          # 本番ビルド (GitHub Pages 用に base=/lol_adviser/)
```

初回のみ Playwright のブラウザ取得が必要です: `npx playwright install chromium`

設計・要件ドキュメントは [docs/](docs/) を参照してください。

## デプロイ (GitHub Pages)

1. このリポジトリを GitHub に push する(リポジトリ名: `lol_adviser`。変更する場合は `vite.config.ts` の `base` も合わせること)
2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定する(初回のみ)
3. `main` ブランチへの push で [deploy.yml](.github/workflows/deploy.yml) が実行され、ユニットテスト + E2E テストが通った場合のみ `https://<ユーザー名>.github.io/lol_adviser/` へデプロイされます

## ライセンス / 出典

- チャンピオンデータ・画像は Riot Games の Data Dragon を利用しています。本プロジェクトは Riot Games とは無関係の非公式ツールです。
- League of Legends は Riot Games, Inc. の登録商標です。
