import React, { useState, useMemo, useEffect } from 'react';
import { SurveyRow } from '../types';
import { Search, Filter, Download, MessageSquareText, Star } from 'lucide-react';

interface KwicBrowserProps {
  rows: SurveyRow[];
  initialKeyword?: string;
}

export const KwicBrowserView: React.FC<KwicBrowserProps> = ({ rows, initialKeyword = '' }) => {
  const [searchWord, setSearchWord] = useState(initialKeyword);
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    setSearchWord(initialKeyword);
    setPage(1);
  }, [initialKeyword]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.category) set.add(r.category); });
    return Array.from(set);
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (sentimentFilter !== 'all' && r.sentiment !== sentimentFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (searchWord.trim() && !r.text.toLowerCase().includes(searchWord.trim().toLowerCase())) return false;
      return true;
    });
  }, [rows, searchWord, sentimentFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  // ハイライト表示用関数
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.trim().toLowerCase() ? (
        <mark key={i} className="bg-amber-200 text-amber-900 font-bold px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // CSVエクスポート
  const exportCsv = () => {
    const header = 'ID,回答テキスト,属性カテゴリ,満足度スコア,感情判定,文字数\n';
    const body = filteredRows
      .map(r => `"${r.id}","${r.text.replace(/"/g, '""')}","${r.category || ''}",${r.score || ''},"${r.sentiment || ''}",${r.wordCount || 0}`)
      .join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey_mining_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-indigo-600" />
            KWIC・原文ブラウザ (回答閲覧)
          </h3>
          <p className="text-xs text-slate-500">
            抽出されたキーワードを含む回答原文の前後の文脈（Context）を精査・確認できます。
          </p>
        </div>

        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition"
        >
          <Download className="w-3.5 h-3.5" />
          現在の絞り込みをCSV出力 ({filteredRows.length}件)
        </button>
      </div>

      {/* フィルタバー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="キーワードで本文検索..."
            value={searchWord}
            onChange={(e) => {
              setSearchWord(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">感情:</span>
          <select
            value={sentimentFilter}
            onChange={(e) => {
              setSentimentFilter(e.target.value);
              setPage(1);
            }}
            className="w-full py-1.5 px-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none"
          >
            <option value="all">すべて</option>
            <option value="positive">ポジティブのみ</option>
            <option value="neutral">中立のみ</option>
            <option value="negative">ネガティブのみ</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">属性:</span>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="w-full py-1.5 px-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none"
          >
            <option value="all">すべての属性 ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 回答一覧リスト */}
      <div className="space-y-3">
        {pagedRows.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            条件に一致する回答が見つかりませんでした。
          </div>
        ) : (
          pagedRows.map((r) => {
            const badgeBg =
              r.sentiment === 'positive'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : r.sentiment === 'negative'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-slate-100 text-slate-700 border-slate-200';

            return (
              <div
                key={r.id}
                className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700">{r.id}</span>
                    {r.category && (
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                        {r.category}
                      </span>
                    )}
                    {r.score && (
                      <span className="flex items-center text-amber-500 font-medium">
                        <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                        {r.score}/5
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${badgeBg}`}>
                      {r.sentiment === 'positive' ? 'ポジティブ' : r.sentiment === 'negative' ? 'ネガティブ' : '中立'}
                    </span>
                    <span>{r.wordCount}文字</span>
                  </div>
                </div>
                <div className="text-sm text-slate-800 leading-relaxed space-y-2">
                  {r.texts && Object.keys(r.texts).length > 0 ? (
                    Object.entries(r.texts).map(([qName, qText], idx) => (
                      <div key={idx} className="flex flex-col gap-0.5">
                        {Object.keys(r.texts).length > 1 && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                            {qName}
                          </span>
                        )}
                        <p>{highlightText(qText, searchWord)}</p>
                      </div>
                    ))
                  ) : (
                    <p>{highlightText(r.text, searchWord)}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            全 {filteredRows.length} 件中 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredRows.length)} 件を表示
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded transition"
            >
              前へ
            </button>
            <span className="font-medium text-slate-700">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded transition"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
