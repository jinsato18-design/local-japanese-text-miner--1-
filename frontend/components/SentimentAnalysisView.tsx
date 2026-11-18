import React, { useMemo, useState, useEffect } from 'react';
import { SurveyRow } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Smile, Meh, Frown, TrendingUp } from 'lucide-react';

interface SentimentAnalysisViewProps {
  rows: SurveyRow[];
  attributeCols?: string[];
  textCols?: string[];
}

export const SentimentAnalysisView: React.FC<SentimentAnalysisViewProps> = ({ rows, attributeCols = [], textCols = [] }) => {
  const [axis1, setAxis1] = useState<string>(attributeCols[0] || 'カテゴリ');
  const [axis2, setAxis2] = useState<string>('なし');

  useEffect(() => {
    if (axis1 !== 'カテゴリ' && axis1 !== '自由記述設問別' && !attributeCols.includes(axis1)) {
      setAxis1(attributeCols[0] || 'カテゴリ');
    }
    if (axis2 !== 'なし' && axis2 !== '自由記述設問別' && !attributeCols.includes(axis2)) {
      setAxis2('なし');
    }
  }, [attributeCols, axis1, axis2]);

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
      let val1 = '全体';
      if (axis1 === '自由記述設問別' && textCols.length > 0) {
          // If comparing by text column, this is slightly complex because a single row might have multiple texts.
          // For simplicity, we just use the current category or fallback.
          val1 = 'テキスト';
      } else if (axis1 !== 'カテゴリ') {
          val1 = r.attributes?.[axis1] || '未設定';
      } else {
          val1 = r.category || '未設定';
      }

      let val2 = '';
      if (axis2 !== 'なし') {
         val2 = r.attributes?.[axis2] || '未設定';
      }

      const catName = val2 ? `${val1} × ${val2}` : val1;

      let entry = map.get(catName);
      if (!entry) {
        entry = { category: catName, positive: 0, neutral: 0, negative: 0, total: 0 };
        map.set(catName, entry);
      }
      entry.total++;
      if (r.sentiment === 'positive') entry.positive++;
      else if (r.sentiment === 'negative') entry.negative++;
      else entry.neutral++;
    }

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [rows, axis1, axis2, textCols]);

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
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">2軸クロス集計分析</h3>
              <p className="text-xs text-slate-500">属性を掛け合わせてポジネガ傾向を比較</p>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-12">軸1(主):</span>
                <select value={axis1} onChange={e => setAxis1(e.target.value)} className="border border-slate-300 rounded px-2 py-1 bg-slate-50 w-32">
                  <option value="カテゴリ">カテゴリ(自動)</option>
                  {attributeCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-12">軸2(副):</span>
                <select value={axis2} onChange={e => setAxis2(e.target.value)} className="border border-slate-300 rounded px-2 py-1 bg-slate-50 w-32">
                  <option value="なし">-- なし --</option>
                  {attributeCols.filter(c => c !== axis1).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={110} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
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
