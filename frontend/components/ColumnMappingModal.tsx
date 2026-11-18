import React, { useState, useEffect } from 'react';
import { ColumnMappingConfig } from '../types';
import { Settings, X, FileText, BarChart3, Database } from 'lucide-react';

interface ColumnMappingModalProps {
  isOpen: boolean;
  headers: string[];
  previewData: Record<string, string>[];
  initialConfig?: ColumnMappingConfig;
  onApply: (config: ColumnMappingConfig) => void;
  onClose: () => void;
}

export function ColumnMappingModal({ isOpen, headers, previewData, initialConfig, onApply, onClose }: ColumnMappingModalProps) {
  const [textCols, setTextCols] = useState<string[]>([]);
  const [attributeCols, setAttributeCols] = useState<string[]>([]);
  const [scoreCols, setScoreCols] = useState<string[]>([]);

  useEffect(() => {
    if (initialConfig && initialConfig.textCols.some(col => headers.includes(col))) {
      setTextCols(initialConfig.textCols.filter(col => headers.includes(col)));
      setAttributeCols(initialConfig.attributeCols.filter(col => headers.includes(col)));
      setScoreCols(initialConfig.scoreCols.filter(col => headers.includes(col)));
    } else {
      // Auto-detect based on basic heuristics if possible, otherwise empty
      const detectedTexts = headers.filter(h => h.includes('テキスト') || h.includes('自由記述') || h.includes('意見') || h.includes('Q'));
      const detectedScores = headers.filter(h => h.includes('スコア') || h.includes('満足度') || h.includes('NPS') || h.includes('評価'));
      const detectedAttributes = headers.filter(h => !detectedTexts.includes(h) && !detectedScores.includes(h) && (h.includes('年代') || h.includes('性別') || h.includes('属性') || h.includes('プラン')));

      setTextCols(detectedTexts.length > 0 ? detectedTexts : (headers.length > 0 ? [headers[0]] : []));
      setScoreCols(detectedScores);
      setAttributeCols(detectedAttributes);
    }
  }, [headers, initialConfig, isOpen]);

  if (!isOpen) return null;

  const toggleCol = (col: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(col)) {
      setList(list.filter(c => c !== col));
    } else {
      setList([...list, col]);
    }
  };

  const handleApply = () => {
    if (textCols.length === 0) {
      alert('自由記述テキストの列を少なくとも1つ選択してください。');
      return;
    }
    onApply({ textCols, attributeCols, scoreCols });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800">CSV列マッピング設定</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <p className="text-gray-600 mb-6 text-sm">
            読み込んだCSVデータの各列の役割（自由記述、属性、数値スコア）を選択してください。<br/>
            分析対象外の列はすべてのチェックを外してください。
          </p>

          <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 border-b font-semibold border-r w-48">列名 (ヘッダー)</th>
                  <th className="px-4 py-3 border-b border-r text-center w-32">
                    <div className="flex flex-col items-center gap-1">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-700 font-semibold">自由記述</span>
                      <span className="text-xs text-gray-500 font-normal">(複数可)</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 border-b border-r text-center w-32">
                    <div className="flex flex-col items-center gap-1">
                      <Database className="w-4 h-4 text-green-600" />
                      <span className="text-green-700 font-semibold">属性・セグメント</span>
                      <span className="text-xs text-gray-500 font-normal">(複数可)</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 border-b border-r text-center w-32">
                    <div className="flex flex-col items-center gap-1">
                      <BarChart3 className="w-4 h-4 text-orange-600" />
                      <span className="text-orange-700 font-semibold">数値スコア</span>
                      <span className="text-xs text-gray-500 font-normal">(複数可)</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 border-b text-gray-500">データプレビュー (先頭3件)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {headers.map(header => (
                  <tr key={header} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 border-r font-medium text-gray-800 break-all">{header}</td>
                    <td className="px-4 py-3 border-r text-center bg-blue-50/30">
                      <input
                        type="checkbox"
                        checked={textCols.includes(header)}
                        onChange={() => toggleCol(header, textCols, setTextCols)}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 border-r text-center bg-green-50/30">
                      <input
                        type="checkbox"
                        checked={attributeCols.includes(header)}
                        onChange={() => toggleCol(header, attributeCols, setAttributeCols)}
                        className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 border-r text-center bg-orange-50/30">
                      <input
                        type="checkbox"
                        checked={scoreCols.includes(header)}
                        onChange={() => toggleCol(header, scoreCols, setScoreCols)}
                        className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-xs">
                      {previewData.slice(0, 3).map((row, i) => (
                        <div key={i} className="truncate">{row[header] !== undefined && row[header] !== null ? String(row[header]) : ''}</div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
          >
            この設定で解析開始
          </button>
        </div>
      </div>
    </div>
  );
}
