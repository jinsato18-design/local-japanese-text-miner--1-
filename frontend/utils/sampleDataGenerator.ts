import { SurveyRow } from '../types';

const CATEGORIES = ['20代以下', '30代', '40代', '50代以上'];
const PLANS = ['無料プラン', 'スタンダード', 'プレミアム', 'エンタープライズ'];

const POSITIVE_PATTERNS = [
  'UIがとても直感的で使いやすく、日々の業務効率が格段に向上しました。サポートの返信も早くて助かります。',
  'スマホアプリの動作が軽快で素晴らしいです。検索機能の精度が高く、探している商品がすぐに見つかります。',
  'デザインが綺麗で見やすく満足しています。定期的な機能改善アップデートがあり期待しています。',
  '初心者でも簡単に設定できました。マニュアルが分かりやすく親切です。友人にもおすすめしたいです。',
  '価格以上の価値があると感じています。データの同期がスムーズでストレスが全くありません。',
  '困ったときのカスタマーサポートの対応が非常に丁寧で迅速でした。安心感があります。',
  'CSVエクスポート機能が追加されてから集計作業が圧倒的に楽になりました。感謝しています。'
];

const NEGATIVE_PATTERNS = [
  '夕方の混雑時間帯にサーバーが重くなり、ページの読み込みに時間がかかります。改善をお願いします。',
  '機能が多すぎて設定画面が複雑で分かりづらいです。もっとシンプルな画面構成にしてほしい。',
  'プランごとの料金が高く感じます。中小企業向けのリーズナブルな価格設定を検討してください。',
  '時々アプリが予期せず落ちる不具合があります。エラーログの確認とバグ修正をお願いします。',
  '問い合わせ窓口がチャットボットのみで、複雑な質問に対する回答が不親切で困りました。',
  '通知が多すぎてストレスになります。必要な通知だけを選択できるようにカスタマイズしてほしいです。',
  'パスワードのリセット手順が分かりにくく、ログインできなくなるトラブルがありました。'
];

const NEUTRAL_PATTERNS = [
  '全体的には普通に使えています。可もなく不可もなくといった印象です。もう少し様子を見ます。',
  '他社製品と比較して大きな違いは感じませんが、基本機能は問題なく動作しています。',
  '月1回程度の利用ですが、基本的な操作には困っていません。マニュアルの充実を望みます。',
  '以前より改善された点もありますが、まだ細かい操作性で気になるところがあります。',
  '今後のアップデートに期待しています。ダークモード機能が追加されると嬉しいです。',
  '機能としては十分ですが、デザインが少し古い印象を受けます。刷新を期待します。'
];

export function generateSampleData(count: number = 1200): SurveyRow[] {
  const rows: SurveyRow[] = [];
  const now = Date.now();

  for (let i = 1; i <= count; i++) {
    const rand = Math.random();
    let text = '';
    let score = 3;

    if (rand < 0.45) {
      text = POSITIVE_PATTERNS[Math.floor(Math.random() * POSITIVE_PATTERNS.length)];
      score = Math.random() < 0.6 ? 5 : 4;
      if (Math.random() < 0.4) {
        text += ' ' + POSITIVE_PATTERNS[Math.floor(Math.random() * POSITIVE_PATTERNS.length)];
      }
    } else if (rand < 0.78) {
      text = NEGATIVE_PATTERNS[Math.floor(Math.random() * NEGATIVE_PATTERNS.length)];
      score = Math.random() < 0.5 ? 1 : 2;
      if (Math.random() < 0.3) {
        text += ' 特に' + NEGATIVE_PATTERNS[Math.floor(Math.random() * NEGATIVE_PATTERNS.length)];
      }
    } else {
      text = NEUTRAL_PATTERNS[Math.floor(Math.random() * NEUTRAL_PATTERNS.length)];
      score = 3;
    }

    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const plan = PLANS[Math.floor(Math.random() * PLANS.length)];
    const daysAgo = Math.floor(Math.random() * 90);
    const dateStr = new Date(now - daysAgo * 24 * 3600 * 1000).toISOString().split('T')[0];

    rows.push({
      id: `RES-${String(i).padStart(5, '0')}`,
      text,
      category: `${cat} / ${plan}`,
      score,
      date: dateStr,
      wordCount: text.length
    });
  }

  return rows;
}
