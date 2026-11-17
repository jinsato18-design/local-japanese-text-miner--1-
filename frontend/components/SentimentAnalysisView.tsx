import React, { useMemo } from 'react';
import { SurveyRow } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Smile, Meh, Frown, TrendingUp } from 'lucide-react';

interface SentimentAnalysisViewProps {
  rows: SurveyRow[];
}

export const SentimentAnalysisView: React.FC<SentimentAnalysisViewProps> = ({ rows }) => {
  const sentimentStats = useMemo(() => {
    let pos = 0;
    let neu = 0;
    let neg = 0;

    for (const r of rows) {
      if (r.sentiment === 'positive') pos++;
      else if (r.sentiment === 'negative') neg++;
      else neu++;
    }

    const total = rows.length || 1;
    return {
      pos,
      neu,
      neg,
      posRate: ((pos / total) * 100).toFixed(1),
      neuRate: ((neu / total) * 100).toFixed(1),
      negRate: ((neg / total) * 100).toFixed(1)
    };
  }, [rows]);

  // カテゴリ別ポジネガ内訳
  const categoryData = useMemo(() => {
    const map = new Map<string, { category: string; positive: number; neutral: number; negative: number; total: number }>();

    for (const r of rows) {
      const cat = r.category || '未設定';
      let entry = map.get(cat);
      if (!entry) {
        entry = { category: cat, positive: 0, neutral: 0, negative: 0, total: 0 };
        map.set(cat, entry);
      }
      entry.total++;
      if (r.sentiment === 'positive') entry.positive++;
      else if (r.sentiment === 'negative') entry.negative++;
      else entry.neutral++;
    }

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [rows]);

  const pieData = [
    { name: 'ポジティブ (好意・満足)', value: sentimentStats.pos, color: '#10b981' },
    { name: 'ニュートラル (中立・要望)', value: sentimentStats.neu, color: '#94a3b8' },
    { name: 'ネガティブ (不満・課題)', value: sentimentStats.neg, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      {/* 3枚のサマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Smile className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-800">ポジティブ率</p>
            <p className="text-2xl font-bold text-emerald-600">{sentimentStats.posRate}%</p>
            <p className="text-xs text-slate-500">{sentimentStats.pos} 件の肯定的な評価</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
            <Meh className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-700">中立・改善要望</p>
            <p className="text-2xl font-bold text-slate-700">{sentimentStats.neuRate}%</p>
            <p className="text-xs text-slate-500">{sentimentStats.neu} 件の中立・事実回答</p>
          </div>
        </div>

        <div className="bg-white border border-red-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-xl text-red-600">
            <Frown className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-medium text-red-800">ネガティブ率</p>
            <p className="text-2xl font-bold text-red-600">{sentimentStats.negRate}%</p>
            <p className="text-xs text-slate-500">{sentimentStats.neg} 件の不満・不具合指摘</p>
          </div>
        </div>
      </div>

      {/* チャートレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 円グラフ */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-1">全体感情分布</h3>
          <p className="text-xs text-slate-500 mb-4">アンケート全体のポジティブ・ニュートラル・ネガティブの比率</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} 件 (${((value / rows.length) * 100).toFixed(1)}%)`, '件数']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 属性・カテゴリ別クロス分析 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-1">属性・カテゴリ別 ポジネガ比較</h3>
          <p className="text-xs text-slate-500 mb-4">セグメントごとの評価傾向と課題の多い層の発見</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="positive" name="ポジティブ" stackId="a" fill="#10b981" />
                <Bar dataKey="neutral" name="中立" stackId="a" fill="#94a3b8" />
                <Bar dataKey="negative" name="ネガティブ" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
