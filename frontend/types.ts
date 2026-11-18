export interface SurveyRow {
  id: string;
  text: string;
  texts: Record<string, string>;
  attributes: Record<string, string>;
  scores: Record<string, number>;
  category?: string; // 属性 (例: 性別、年代、契約プランなど)
  score?: number;    // 評価値・満足度 (1-5等)
  date?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  wordCount?: number;
}

export interface ColumnMappingConfig {
  textCols: string[];
  attributeCols: string[];
  scoreCols: string[];
}

export interface AnalysisParams {
  posFilter: ('noun' | 'verb' | 'adj' | 'other')[];
  minFreq: number;
  customStopwords: string;
  cooccurrenceMinFreq: number;
  jaccardThreshold: number;
}

export interface SavedAnalysisConfig extends AnalysisParams {
  columnMapping: ColumnMappingConfig;
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
