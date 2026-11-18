import { PosType, WordToken, SurveyRow, WordFrequency, CooccurrenceEdge, CooccurrenceNode, NgramFreq, ExcludeOptions } from '../types';

// 代表的なストップワード（純粋な汎用ノイズ語）
export const DEFAULT_STOPWORDS = new Set([
  'さん', 'とき', 'たち', 'ほか', 'あと', 'まえ',
  '思う', '感じる', '考える', '言う', 'ただ', 'あり', 'なし', '今回', '最近',
  'お願い', '希望', '利用', '使用', '担当', '対応', '会社', '製品', 'サービス'
]);

const WORD_CATEGORIES = {
  particle: new Set(['は', 'が', 'を', 'に', 'へ', 'と', 'より', 'から', 'で', 'や', 'の', 'も', 'ね', 'よ', 'わ', 'さ', 'ぞ', 'ぜ', 'か', 'な', 'ば', 'ても', 'でも', 'けれど', 'けれども', 'けど', 'のに', 'ので', 'し', 'ながら', 'たり', 'だり', 'つつ', 'ばかり', 'まで', 'だけ', 'ほど', 'くらい', 'ぐらい', 'など', 'なり', 'やら', 'こそ', 'さえ', 'すら', 'しか', 'って', 'とは', 'には', 'では', 'への', 'との', 'からの', 'までの']),
  auxiliary: new Set(['です', 'ます', 'ました', 'ません', 'ませんでした', 'ましょう', 'でした', 'でしょ', 'でしょう', 'れる', 'られる', 'せる', 'させる', 'たい', 'たがる', 'ない', 'なかった', 'ぬ', 'ん', 'そう', 'そうだ', 'そうです', 'よう', 'ようだ', 'ようです', 'らしい', 'らしかった', 'だ', 'だった', 'だろう', 'であろう', 'まい', 'べき', 'べし', 'ぬく']),
  conjunction: new Set(['しかし', 'だが', 'けれども', 'けれど', 'だけど', 'でも', 'ところが', 'それでも', 'それに', 'しかも', 'さらに', 'また', 'および', 'ならびに', 'かつ', 'そして', 'それで', 'そこで', 'したがって', 'ゆえに', 'そのため', 'それゆえ', 'だから', 'すると', 'つまり', 'すなわち', '要するに', 'あるいは', 'または', 'もしくは', 'それとも', 'なお', 'ただし', 'もっとも', 'ちなみに', 'ところで', 'さて', 'では', 'それでは', 'じゃあ', 'なぜなら', 'だって']),
  pronoun: new Set(['これ', 'それ', 'あれ', 'どれ', 'ここ', 'そこ', 'あそこ', 'どこ', 'こちら', 'そちら', 'あちら', 'どちら', 'こっち', 'そっち', 'あっち', 'どっち', '私', 'わたし', 'わたくし', '僕', 'ぼく', '俺', 'おれ', '自分', 'じぶん', 'うち', 'あなた', '貴方', '君', 'きみ', 'お前', '彼', 'かれ', '彼女', 'かのじょ', '彼ら', '彼女ら', '誰', 'だれ', 'どなた', '何', 'なに', 'なん', 'どれか', '何か', 'どこか', '誰か', 'みんな', '皆', '皆様', '各自', '双方', '両者', '当方', '先方', '貴社', '御社', '弊社', '当社']),
  dependent: new Set([
    'こと', 'もの', 'ところ', 'ため', 'はず', 'わけ', 'まま', 'ほう', 'つもり', 'とおり', '通り', 'うち', 'うえ', '上', 'なか', '中', 'もと', '際', 'さい', '度', 'たび', '折', 'おり', '旨', 'むね', '次第', 'しだい',
    'する', 'している', 'してる', 'した', 'します', 'できる', 'できた', 'できます', 'いる', 'いた', 'います', 'ある', 'あった', 'あります', 'おる', 'おり', 'なる', 'なった', 'なります', 'いく', 'ゆく', 'いった', 'くる', 'きた', 'きます', 'みる', 'みた', 'みます', 'おく', 'おいた', 'おきます', 'しまう', 'しまった', 'しまいます', 'ちゃう', 'じゃう', 'くださる', 'ください', 'いただく', 'いただき', 'いただいた', 'いただきます', 'もらう', 'もらった', 'もらいます', 'あげる', 'くれる', 'ほしい', '欲しい', 'よい', 'いい', 'よかった', '悪い', 'わるい', 'やすい', 'づらい', 'にくい'
  ])
};

const SYMBOL_REGEX = /^[!-\/:-@[-`{-~、。・…ー〜～！？（）「」『』【】〔〕〈〉《》［］｛｝※○●◎△▲▽▼□■◇◆★☆♪→←↑↓＝＋－×÷＜＞％＃＆＠＊＿｜／＼：；]+$/;
const NUMBER_REGEX = /^[0-9０-９.,]+$/;

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

export function tokenizeText(text: string, customStopwords: Set<string>, excludeOptions?: ExcludeOptions): WordToken[] {
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
    if (!raw) continue;
    
    const isSymbolOrNumber = SYMBOL_REGEX.test(raw) || NUMBER_REGEX.test(raw);
    
    if (excludeOptions?.symbol && isSymbolOrNumber) continue;
    if (excludeOptions?.symbol && raw.length < 2 && /^[ぁ-んァ-ヶ]$/.test(raw)) continue; // 1文字のひらがな・カタカナノイズ
    if (!excludeOptions && raw.length < 2) continue; // デフォルトの挙動（オプション未指定時）
    if (!excludeOptions && /^[0-9]+$/.test(raw)) continue;
    if (/^[a-zA-Z]$/.test(raw)) continue;

    const normalized = raw.toLowerCase();
    
    if (exactStopwords.has(normalized)) continue;
    
    if (excludeOptions) {
      if (excludeOptions.particle && WORD_CATEGORIES.particle.has(normalized)) continue;
      if (excludeOptions.auxiliary && WORD_CATEGORIES.auxiliary.has(normalized)) continue;
      if (excludeOptions.conjunction && WORD_CATEGORIES.conjunction.has(normalized)) continue;
      if (excludeOptions.pronoun && WORD_CATEGORIES.pronoun.has(normalized)) continue;
      if (excludeOptions.dependent && WORD_CATEGORIES.dependent.has(normalized)) continue;
    }

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
  posFilter?: Set<PosType>,
  targetScoreCol?: string
): WordFrequency[] {
  const freqMap = new Map<string, { count: number; docSet: Set<string>; pos: PosType; sentimentTotal: number; scoreTotal: number; scoreCount: number }>();

  for (const row of rows) {
    const tokens = tokenMap.get(row.id) || [];
    
    // スコアの取得
    let rowScore: number | undefined;
    if (targetScoreCol && row.scores && typeof row.scores[targetScoreCol] === 'number') {
        rowScore = row.scores[targetScoreCol];
    }

    for (const token of tokens) {
      if (posFilter && !posFilter.has(token.pos)) continue;

      let entry = freqMap.get(token.normalized);
      if (!entry) {
        entry = { count: 0, docSet: new Set(), pos: token.pos, sentimentTotal: 0, scoreTotal: 0, scoreCount: 0 };
        freqMap.set(token.normalized, entry);
      }
      entry.count += 1;
      
      // 同じ行から複数回出現した場合でもスコアの集計は「出現回数」ベースか「文書」ベースか
      // 要件には「その単語を含む回答の選択中スコア平均値」「その単語が出現した回答の平均スコア」とある
      // 文書単位での平均か、出現数ベースの平均か。
      // 文書への追加（docSetへの追加）と同時に1回だけカウントするのが適切（文書単位平均）
      if (!entry.docSet.has(row.id)) {
          entry.docSet.add(row.id);
          if (rowScore !== undefined) {
              entry.scoreTotal += rowScore;
              entry.scoreCount += 1;
          }
      }
      
      entry.sentimentTotal += token.sentimentScore;
    }
  }

  const result: WordFrequency[] = [];
  for (const [word, data] of freqMap.entries()) {
    if (data.count >= minCount) {
      const freq: WordFrequency = {
        word,
        pos: data.pos,
        count: data.count,
        docFrequency: data.docSet.size,
        sentimentAvg: data.count > 0 ? Number((data.sentimentTotal / data.count).toFixed(2)) : 0
      };
      
      if (data.scoreCount > 0) {
          freq.scoreAvg = Number((data.scoreTotal / data.scoreCount).toFixed(2));
      }

      result.push(freq);
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

  const candidateEdges: CooccurrenceEdge[] = [];
  for (const [pairKey, weight] of coocMap.entries()) {
    if (weight < minCoocCount) continue;
    const [w1, w2] = pairKey.split(':::');
    const docCount1 = wordDocMap.get(w1)?.size || 1;
    const docCount2 = wordDocMap.get(w2)?.size || 1;

    // Jaccard = |A ∩ B| / |A ∪ B|
    const union = docCount1 + docCount2 - weight;
    const jaccard = union > 0 ? weight / union : 0;

    if (jaccard >= minJaccard) {
      candidateEdges.push({
        source: w1,
        target: w2,
        weight,
        jaccard: Number(jaccard.toFixed(3))
      });
    }
  }

  // 視認性を保つため、各ノードごとにJaccard係数の高い上位5件のエッジに制限する
  const nodeEdges = new Map<string, CooccurrenceEdge[]>();
  nodes.forEach(n => nodeEdges.set(n.id, []));

  candidateEdges.forEach(e => {
    nodeEdges.get(e.source)?.push(e);
    nodeEdges.get(e.target)?.push(e);
  });

  const finalEdges = new Set<CooccurrenceEdge>();
  for (const edgesOfNode of nodeEdges.values()) {
    edgesOfNode.sort((a, b) => b.jaccard - a.jaccard);
    const topEdges = edgesOfNode.slice(0, 5);
    topEdges.forEach(e => finalEdges.add(e));
  }

  return { nodes, edges: Array.from(finalEdges) };
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
