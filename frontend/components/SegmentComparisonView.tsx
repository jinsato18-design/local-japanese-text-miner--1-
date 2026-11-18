import React, { useState, useMemo, useEffect } from 'react';
import { SurveyRow, WordToken } from '../types';
import { Layers, Users, Smile, Frown, MessageSquare } from 'lucide-react';

interface SegmentComparisonViewProps {
  rows: SurveyRow[];
  tokenMap: Map<string, WordToken[]>;
  onWordClick: (word: string) => void;
  attributeCols: string[];
  textCols: string[];
  scoreCols?: string[];
  selectedScoreCol?: string;
}

export function SegmentComparisonView({ rows, tokenMap, onWordClick, attributeCols, textCols, scoreCols = [], selectedScoreCol = '' }: SegmentComparisonViewProps) {
  const [compareAxis, setCompareAxis] = useState<string>(attributeCols[0] || 'カテゴリ');

  useEffect(() => {
    if (compareAxis !== 'カテゴリ' && !attributeCols.includes(compareAxis)) {
      setCompareAxis(attributeCols[0] || 'カテゴリ');
    }
  }, [attributeCols, compareAxis]);

  // Compute segment data
  const segmentData = useMemo(() => {
    const segments = new Map<string, {
      totalRows: number;
      posCount: number;
      negCount: number;
      wordFreqs: Map<string, number>;
      scoreTotal: number;
      scoreCount: number;
    }>();

    for (const r of rows) {
      let segName = '全体';
      if (compareAxis === 'カテゴリ') {
        segName = r.category || '未設定';
      } else {
        segName = r.attributes?.[compareAxis] || '未設定';
      }

      if (!segments.has(segName)) {
        segments.set(segName, { totalRows: 0, posCount: 0, negCount: 0, wordFreqs: new Map(), scoreTotal: 0, scoreCount: 0 });
      }

      const seg = segments.get(segName)!;
      seg.totalRows++;
      if (r.sentiment === 'positive') seg.posCount++;
      if (r.sentiment === 'negative') seg.negCount++;
      
      if (selectedScoreCol && r.scores && typeof r.scores[selectedScoreCol] === 'number') {
        seg.scoreTotal += r.scores[selectedScoreCol];
        seg.scoreCount++;
      }

      // Count words in this row
      const tokens = tokenMap.get(r.id) || [];
      const seenWords = new Set<string>(); // For document frequency within segment
      
      for (const t of tokens) {
        if (t.pos === 'other') continue;
        if (seenWords.has(t.normalized)) continue;
        seenWords.add(t.normalized);
        
        seg.wordFreqs.set(t.normalized, (seg.wordFreqs.get(t.normalized) || 0) + 1);
      }
    }

    // Process top 10 words for each segment
    const result = Array.from(segments.entries()).map(([name, data]) => {
      const topWords = Array.from(data.wordFreqs.entries())
        .map(([word, count]) => ({
          word,
          count,
          coverageRate: (count / data.totalRows) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        name,
        totalRows: data.totalRows,
        posRate: data.totalRows > 0 ? (data.posCount / data.totalRows) * 100 : 0,
        negRate: data.totalRows > 0 ? (data.negCount / data.totalRows) * 100 : 0,
        avgScore: data.scoreCount > 0 ? Number((data.scoreTotal / data.scoreCount).toFixed(2)) : undefined,
        topWords
      };
    });

    return result.sort((a, b) => b.totalRows - a.totalRows);
  }, [rows, tokenMap, compareAxis, selectedScoreCol]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            セグメント比較 (特徴語マトリクス)
          </h2>
          <p className="text-sm text-slate-500 mt-1">選択した属性の各セグメントにおける頻出キーワードと感情傾向を比較します。</p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">比較軸:</span>
          <select
            value={compareAxis}
            onChange={(e) => setCompareAxis(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="カテゴリ">カテゴリ (自動推定)</option>
            {attributeCols.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {segmentData.map((seg, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-w-[280px]">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-800 text-lg truncate" title={seg.name}>{seg.name}</h3>
              <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                <span className="flex items-center gap-1 text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  <Users className="w-3.5 h-3.5" />
                  {seg.totalRows} 件
                </span>
                {selectedScoreCol && seg.avgScore !== undefined && (
                  <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium font-mono">
                    ★ {selectedScoreCol}: {seg.avgScore.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${seg.posRate}%` }}></div>
                  <div className="bg-slate-300 h-full flex-1"></div>
                  <div className="bg-red-500 h-full" style={{ width: `${seg.negRate}%` }}></div>
                </div>
              </div>
              <div className="flex justify-between text-[10px] mt-1">
                <span className="text-emerald-700 flex items-center gap-0.5"><Smile className="w-3 h-3"/> {seg.posRate.toFixed(1)}%</span>
                <span className="text-red-700 flex items-center gap-0.5"><Frown className="w-3 h-3"/> {seg.negRate.toFixed(1)}%</span>
              </div>
            </div>

            <div className="p-4 flex-1">
              <h4 className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1 border-b border-slate-100 pb-1">
                <MessageSquare className="w-3.5 h-3.5" />
                特徴語 Top 10
              </h4>
              <ul className="space-y-2">
                {seg.topWords.map((tw, i) => (
                  <li key={i} className="flex flex-col gap-0.5">
                    <div className="flex justify-between items-center text-sm">
                      <button
                        onClick={() => onWordClick(tw.word)}
                        className="text-indigo-600 font-medium hover:underline text-left truncate flex-1"
                      >
                        {i + 1}. {tw.word}
                      </button>
                      <span className="text-slate-500 text-xs w-8 text-right">{tw.count}件</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div className="bg-indigo-300 h-full" style={{ width: `${Math.min(100, tw.coverageRate * 2)}%` }}></div>
                      </div>
                      <span className="text-[9px] text-slate-400 w-8 text-right">{tw.coverageRate.toFixed(1)}%</span>
                    </div>
                  </li>
                ))}
                {seg.topWords.length === 0 && (
                  <li className="text-xs text-slate-400 text-center py-4">特徴語がありません</li>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}