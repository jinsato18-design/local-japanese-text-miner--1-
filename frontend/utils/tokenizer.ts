import { PosType, WordToken, SurveyRow, WordFrequency, CooccurrenceEdge, CooccurrenceNode, NgramFreq } from '../types';

// 代表的なストップワード（分析でノイズになりやすい助詞・代名詞・一般的すぎる語句）
export const DEFAULT_STOPWORDS = new Set([
  'こと', 'もの', 'それ', 'これ', 'あれ', 'どれ', 'よう', 'そう', 'ため', 'ところ',
  'さん', 'とき', 'わけ', 'ほう', 'はず', 'まま', 'たち', 'ほか', 'あと', 'まえ',
  'する', 'いる', 'ある', 'なる', 'れる', 'られる', 'いく', 'くる', 'おる', 'みる',
  '思う', '感じる', '考える', '言う', 'できる', 'くださる', 'いただく', 'です', 'ます',
  'など', 'また', 'そして', 'しかし', 'ただ', 'だが', 'ので', 'から', 'より', 'まで',
  'て', 'に', 'を', 'は', 'が', 'の', 'と', 'で', 'へ', 'や', 'も', 'ね', 'よ',
  'ない', 'よい', 'いい', 'あり', 'なし', '御社', '貴社', '今回', '最近', '自分',
  'お願い', '希望', '利用', '使用', '担当', '対応', '会社', '製品', 'サービス',
  'ました', 'ません', 'ましょう', 'でした', 'でしょ'
]);

// 簡易極性辞書（主要なポジティブ・ネガティブ語句と重み）
const SENTIMENT_DICT: Record<string, number> = {
  // ポジティブ
  '便利': 2, '快適': 2, '使いやすい': 2, '満足': 2.5, '素晴らしい': 3, '早い': 1.5,
  '親切': 2, '丁寧': 2, '助かる': 2, '安心': 2, '分かりやすい': 2, '最高': 3,
  '改善': 1, '向上': 1.5, '期待': 1, 'おすすめ': 2, '感謝': 2.5, '良い': 1.5,
  '安定': 1.5, '安い': 1.5, '綺麗': 2, 'きれい': 2, '好き': 2, '信頼': 2,
  '充実': 1.5, '迅速': 2, 'スムーズ': 2, '簡単': 2, '手軽': 2, '正確': 1.5,
  
  // ネガティブ
  '不便': -2, '遅い': -2, '使いづらい': -2.5, '不満': -2.5, '最悪': -3, '分かりにくい': -2,
  'エラー': -2, 'バグ': -2.5, '困る': -2, '高い': -1.5, '重い': -1.5,
  'フリーズ': -2.5, '落ちる': -2, '分かりづらい': -2, '複雑': -1.5, '面倒': -2,
  '失敗': -2, '不親切': -2.5, '不快': -2.5, '不安': -2, '解約': -2, 'やめたい': -2.5,
  '問題': -1.5, '不具合': -2.5, '固まる': -2, '改善求む': -1.5, 'ストレス': -2.5, '悪化': -2
};

// 形態素・品詞簡易推計
export function estimatePos(word: string): PosType {
  if (word.length <= 1 && /^[ぁ-んァ-ヶ]$/.test(word)) return 'other';
  // カタカナ単語、漢字＋名詞接尾辞
  if (/^[ァ-ヴー]+$/.test(word)) return 'noun';
  if (/^[一-龥々]+(感|性|化|的|費|者|品|店|機能|画面|対応|価格|サポート)?$/.test(word)) return 'noun';
  
  // 形容詞系
  if (/^(便利|快適|丁寧|親切|不便|簡単|複雑|綺麗|きれい)$/.test(word)) return 'adj';
  if (word.endsWith('い') && word.length >= 2 && !/^(ない|よい|いい)$/.test(word)) return 'adj';
  
  // 動詞系 (連用形などの活用語尾も簡易的にカバー)
  if (/^[一-龥ぁ-ん]+[うくぐすつぬぶむるきぎしちじにひびみりえけげせてねへべめれ]$/.test(word) && !/^[一-龥]+$/.test(word)) return 'verb';
  if (/^[一-龥]+[ぁ-ん]+$/.test(word)) return 'verb';
  
  return 'noun';
}

// 現代ブラウザ標準のIntl.Segmenterを用いた日本語トークナイザ
let segmenterInstance: Intl.Segmenter | null = null;
function getSegmenter(): Intl.Segmenter {
  if (!segmenterInstance) {
    segmenterInstance = new Intl.Segmenter('ja', { granularity: 'word' });
  }
  return segmenterInstance;
}

export function tokenizeText(text: string, customStopwords: Set<string>): WordToken[] {
  if (!text) return [];
  
  const exactStopwords = new Set<string>();
  const wildcardPatterns: RegExp[] = [];

  for (const sw of customStopwords) {
    const normalizedSw = sw.toLowerCase().trim().replace(/[、。]/g, '');
    if (!normalizedSw) continue;

    if (normalizedSw.includes('*') || normalizedSw.includes('~') || normalizedSw.includes('～')) {
      let patternStr = normalizedSw
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/[~～]/g, '.*');
      wildcardPatterns.push(new RegExp(`^${patternStr}$`));
    } else {
      exactStopwords.add(normalizedSw);
    }
  }

  const segmenter = getSegmenter();
  const segments = segmenter.segment(text);
  const tokens: WordToken[] = [];

  for (const seg of segments) {
    if (!seg.isWordLike) continue;
    const raw = seg.segment.trim();
    if (!raw || raw.length < 2) continue; // 1文字はノイズカット
    if (/^[0-9]+$/.test(raw)) continue;  // 数字のみ除外
    if (/^[a-zA-Z]$/.test(raw)) continue;

    const normalized = raw.toLowerCase();
    
    if (exactStopwords.has(normalized)) continue;
    
    let isWildcardMatch = false;
    for (const pattern of wildcardPatterns) {
      if (pattern.test(normalized)) {
        isWildcardMatch = true;
        break;
      }
    }
    if (isWildcardMatch) continue;

    const pos = estimatePos(normalized);
    const sentimentScore = SENTIMENT_DICT[normalized] || 0;

    tokens.push({
      word: raw,
      normalized,
      pos,
      sentimentScore
    });
  }

  return tokens;
}

// 1行のセンチメントスコア計算
export function calculateRowSentiment(text: string, tokens: WordToken[]): { score: number; label: 'positive' | 'neutral' | 'negative' } {
  let scoreSum = 0;
  for (const t of tokens) {
    let score = t.sentimentScore;
    if (score !== 0) {
      // 否定表現の考慮（直後に「ない」「ません」等が続く場合はスコア反転）
      const idx = text.indexOf(t.word);
      if (idx !== -1) {
        const afterStr = text.slice(idx + t.word.length, idx + t.word.length + 6);
        if (/^(は|が)?(ない|ませ|無|なく)/.test(afterStr)) {
          score = score * -1;
        }
      }
    }
    scoreSum += score;
  }
  // ネガティブ判定ルール
  if (/不便|最悪|困っ|使いづら|解約|クレーム|返金|バグ|落ちる/.test(text)) {
    scoreSum -= 1.5;
  }
  if (/最高|素晴らしい|感謝|助かっ|愛用|満足|おすすめ/.test(text)) {
    scoreSum += 1.5;
  }

  let label: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (scoreSum > 0.8) label = 'positive';
  else if (scoreSum < -0.8) label = 'negative';

  return { score: scoreSum, label };
}

// 単語出現頻度集計
export function computeWordFrequencies(
  rows: SurveyRow[],
  tokenMap: Map<string, WordToken[]>,
  minCount: number = 3,
  posFilter?: Set<PosType>
): WordFrequency[] {
  const freqMap = new Map<string, { count: number; docSet: Set<string>; pos: PosType; sentimentTotal: number }>();

  for (const row of rows) {
    const tokens = tokenMap.get(row.id) || [];

    for (const token of tokens) {
      if (posFilter && !posFilter.has(token.pos)) continue;

      let entry = freqMap.get(token.normalized);
      if (!entry) {
        entry = { count: 0, docSet: new Set(), pos: token.pos, sentimentTotal: 0 };
        freqMap.set(token.normalized, entry);
      }
      entry.count += 1;
      entry.docSet.add(row.id);
      entry.sentimentTotal += token.sentimentScore;
    }
  }

  const result: WordFrequency[] = [];
  for (const [word, data] of freqMap.entries()) {
    if (data.count >= minCount) {
      result.push({
        word,
        pos: data.pos,
        count: data.count,
        docFrequency: data.docSet.size,
        sentimentAvg: data.count > 0 ? Number((data.sentimentTotal / data.count).toFixed(2)) : 0
      });
    }
  }

  result.sort((a, b) => b.count - a.count);
  return result;
}

// 共起ネットワーク用 (Jaccard係数に基づく共起計算)
export function computeCooccurrence(
  rows: SurveyRow[],
  tokenMap: Map<string, WordToken[]>,
  topWordsCount: number = 25,
  minCoocCount: number = 2,
  minJaccard: number = 0.05
): { nodes: CooccurrenceNode[]; edges: CooccurrenceEdge[] } {
  // まず上位頻出単語を選抜
  const allFreqs = computeWordFrequencies(rows, tokenMap, 2);
  const targetWords = allFreqs.slice(0, topWordsCount);
  const targetWordSet = new Set(targetWords.map(w => w.word));
  const wordDocMap = new Map<string, Set<string>>();

  targetWords.forEach(w => {
    wordDocMap.set(w.word, new Set());
  });

  // 各ドキュメントでの共起出現をカウント
  const coocMap = new Map<string, number>();

  for (const row of rows) {
    const tokens = tokenMap.get(row.id) || [];
    const docWords = Array.from(new Set(tokens.map(t => t.normalized))).filter(w => targetWordSet.has(w));

    for (const w of docWords) {
      wordDocMap.get(w)?.add(row.id);
    }

    for (let i = 0; i < docWords.length; i++) {
      for (let j = i + 1; j < docWords.length; j++) {
        const w1 = docWords[i];
        const w2 = docWords[j];
        const pairKey = w1 < w2 ? `${w1}:::${w2}` : `${w2}:::${w1}`;
        coocMap.set(pairKey, (coocMap.get(pairKey) || 0) + 1);
      }
    }
  }

  const nodes: CooccurrenceNode[] = targetWords.map(w => ({
    id: w.word,
    label: w.word,
    count: w.count,
    pos: w.pos
  }));

  const edges: CooccurrenceEdge[] = [];
  for (const [pairKey, weight] of coocMap.entries()) {
    if (weight < minCoocCount) continue;
    const [w1, w2] = pairKey.split(':::');
    const docCount1 = wordDocMap.get(w1)?.size || 1;
    const docCount2 = wordDocMap.get(w2)?.size || 1;

    // Jaccard = |A ∩ B| / |A ∪ B|
    const union = docCount1 + docCount2 - weight;
    const jaccard = union > 0 ? weight / union : 0;

    if (jaccard >= minJaccard) {
      edges.push({
        source: w1,
        target: w2,
        weight,
        jaccard: Number(jaccard.toFixed(3))
      });
    }
  }

  return { nodes, edges };
}

// 2-gram / 3-gram フレーズ抽出
export function computeNgrams(
  rows: SurveyRow[],
  tokenMap: Map<string, WordToken[]>,
  n: 2 | 3 = 2,
  minCount: number = 3
): NgramFreq[] {
  const ngramMap = new Map<string, { count: number; words: string[] }>();

  for (const row of rows) {
    const tokens = tokenMap.get(row.id) || [];
    if (tokens.length < n) continue;

    for (let i = 0; i <= tokens.length - n; i++) {
      const slice = tokens.slice(i, i + n);
      const phrase = slice.map(t => t.word).join(' ');
      const existing = ngramMap.get(phrase);
      if (existing) {
        existing.count += 1;
      } else {
        ngramMap.set(phrase, { count: 1, words: slice.map(t => t.word) });
      }
    }
  }

  const list: NgramFreq[] = [];
  for (const [phrase, data] of ngramMap.entries()) {
    if (data.count >= minCount) {
      list.push({ phrase, count: data.count, words: data.words });
    }
  }

  list.sort((a, b) => b.count - a.count);
  return list.slice(0, 50);
}
