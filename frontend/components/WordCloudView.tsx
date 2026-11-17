import React, { useMemo } from 'react';
import { WordFrequency } from '../types';

interface WordCloudViewProps {
  words: WordFrequency[];
  onWordClick: (word: string) => void;
  colorMode: 'sentiment' | 'pos';
}

export const WordCloudView: React.FC<WordCloudViewProps> = ({ words, onWordClick, colorMode }) => {
  const topWords = useMemo(() => words.slice(0, 60), [words]);

  const maxCount = useMemo(() => Math.max(...topWords.map(w => w.count), 1), [topWords]);
  const minCount = useMemo(() => Math.min(...topWords.map(w => w.count), 1), [topWords]);

  const getWordColor = (w: WordFrequency) => {
    if (colorMode === 'sentiment') {
      if (w.sentimentAvg > 0.4) return '#10b981'; // green
      if (w.sentimentAvg < -0.4) return '#ef4444'; // red
      return '#64748b'; // slate
    }
    // pos
    switch (w.pos) {
      case 'noun': return '#3b82f6';
      case 'adj': return '#f59e0b';
      case 'verb': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between mb-4 pb-3 border-b border-slate-100 gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-800">ワードクラウド (Top 60単語)</h3>
          <p className="text-xs text-slate-500">文字の大きさは出現頻度を表します。クリックするとその単語を含む回答を即座に絞り込みます。</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>好意・ポジティブ</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>中立</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>不満・ネガティブ</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 min-h-[320px] p-6 bg-slate-50/60 rounded-lg select-none">
        {topWords.length === 0 ? (
          <p className="text-slate-400 text-sm">該当する単語がありません</p>
        ) : (
          topWords.map((w) => {
            // 頻度からフォントサイズ (14px 〜 42px) を計算
            const ratio = (w.count - minCount) / Math.max(maxCount - minCount, 1);
            const fontSize = Math.round(13 + ratio * 28);
            const color = getWordColor(w);

            return (
              <button
                key={w.word}
                onClick={() => onWordClick(w.word)}
                className="transition-all duration-150 hover:scale-110 hover:opacity-80 font-bold px-1.5 py-0.5 rounded cursor-pointer text-center"
                style={{
                  fontSize: `${fontSize}px`,
                  color,
                  lineHeight: '1.2'
                }}
                title={`${w.word}: 出現回数 ${w.count}回 (文書数: ${w.docFrequency})`}
              >
                {w.word}
                <span className="text-[10px] ml-1 font-normal opacity-60">({w.count})</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
