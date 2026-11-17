export interface SurveyRow {
  id: string;
  text: string;
  category?: string; // 属性 (例: 性別、年代、契約プランなど)
  score?: number;    // 評価値・満足度 (1-5等)
  date?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  wordCount?: number;
}

export type PosType = 'noun' | 'verb' | 'adj' | 'other';

export interface WordToken {
  word: string;
  normalized: string;
  pos: PosType;
  sentimentScore: number;
}

export interface WordFrequency {
  word: string;
  pos: PosType;
  count: number;
  docFrequency: number;
  sentimentAvg: number;
}

export interface CooccurrenceEdge {
  source: string;
  target: string;
  weight: number;
  jaccard: number;
}

export interface CooccurrenceNode {
  id: string;
  label: string;
  count: number;
  pos: PosType;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface NgramFreq {
  phrase: string;
  count: number;
  words: string[];
}

export interface MiningSummary {
  totalRows: number;
  totalWords: number;
  avgLength: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  vocabSize: number;
}
