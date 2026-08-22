# LoL Adviser

League of Legends のチャンピオンセレクト中にピック情報を入力すると、レーン戦・集団戦・勝利条件などのアドバイスを LLM に求めるための**プロンプトを生成する** Web サービスです(日本語)。

生成されたプロンプトをコピーして ChatGPT / Claude などに貼り付けて使います。LLM API の呼び出しは行いません。

## 特徴

- **LLM の知識カットオフ対策**: パッチバージョンを明記し、[Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon)(Riot 公式 CDN)から取得した自分・対面・敵ジャングラーのスキルデータ(CD・射程・説明)をプロンプトに埋め込むため、最新パッチでも正確なアドバイスを引き出せます
- **チャンセレ中でも間に合う入力 UX**: ひらがな対応のインクリメンタル検索(「あー」→アーリ)+ アイコングリッド、ピック後は次の空きスロットへ自動移動
- **部分入力で生成可能**: 自分と対面が決まった時点でも「現時点の情報で生成」できます
- プロンプトのワンクリックコピー / テンプレートのカスタマイズ / 入力履歴の復元(localStorage)
- 生成時に自分 vs 対面レーナーの [lolalytics](https://lolalytics.com/) ビルド・カウンターページへのリンクを表示
- バックエンドなしの静的 SPA。データ取得は Data Dragon のみ(API キー不要・完全無料)

## 開発

```bash
npm install
npm run dev            # 開発サーバー (http://localhost:5173)
npm run test           # ユニットテスト (Vitest)
npm run test:e2e       # E2E テスト (Playwright / Data Dragon はモック)
npm run test:e2e:smoke # 実 Data Dragon への疎通スモークテスト
npm run build          # 本番ビルド (カスタムドメインのルート配信のため base=/)
```

初回のみ Playwright のブラウザ取得が必要です: `npx playwright install chromium`

設計・要件ドキュメントは [docs/](docs/) を参照してください。

## デプロイ (GitHub Pages)

1. このリポジトリを GitHub に push する
2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定する(初回のみ)
3. **Settings → Pages → Custom domain** にカスタムドメイン(現在: `loladviser.saijack.com`)を設定する。カスタムドメインを使わない場合(github.io のパス配下で配信する場合)は `vite.config.ts` の `base` を `'/<リポジトリ名>/'` に戻すこと
4. `main` ブランチへの push で [deploy.yml](.github/workflows/deploy.yml) が実行され、ユニットテスト + E2E テストが通った場合のみデプロイされます(github.io の URL はカスタムドメインへ 301 リダイレクトされます)

## 広告(任意)

広告枠(ヘッダー下バナー + 超ワイド画面のみの右サイドレール)を実装済みですが、[src/ads/adsConfig.ts](src/ads/adsConfig.ts) の ID が未設定の間は一切表示されません。有効化する場合:

1. 独自ドメインを取得し、GitHub Pages のカスタムドメインに設定する(AdSense は github.io のパス配下を登録できないため)— 設定済み(`loladviser.saijack.com`)
2. [Google AdSense](https://adsense.google.com/) でサイトを登録し審査を通す
3. ディスプレイ広告ユニットを 2 つ作成し、`adsConfig.ts` に client ID と slot ID を設定して push する

## ライセンス / 出典

- チャンピオンデータ・画像は Riot Games の Data Dragon を利用しています。本プロジェクトは Riot Games とは無関係の非公式ツールです。
- League of Legends は Riot Games, Inc. の登録商標です。
