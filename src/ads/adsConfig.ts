// 広告設定(Google AdSense)。
// ADSENSE_CLIENT が空文字の間は広告関連の DOM・スクリプトを一切出力しない(現状の UX に影響ゼロ)。
//
// 有効化手順(README「広告」参照):
// 1. AdSense の審査に通ったら発行される client ID を ADSENSE_CLIENT に設定
// 2. AdSense 管理画面で「ディスプレイ広告」ユニットを 2 つ作成し、slot ID を AD_SLOTS に設定
// 3. ビルド・デプロイすると広告が表示される(片方だけ設定した場合はその枠のみ表示)

/** 例: 'ca-pub-1234567890123456' */
// 一時的に広告表示を無効化中(空文字にすると広告 DOM・スクリプトが一切出力されない)。
// 再開するときは 'ca-pub-7613364452744758' に戻す。
export const ADSENSE_CLIENT: string = '';

export const AD_SLOTS = {
  /** ヘッダー直下の横長レスポンシブバナーの slot ID(AdSense ユニット名: lol_advisor_width) */
  topBanner: '8919523761',
  /** 超ワイド画面(1480px以上)のみ表示する右サイドレール(160x600)の slot ID(AdSense ユニット名: lol_advisor_hight) */
  sideRail: '3620643788',
};
