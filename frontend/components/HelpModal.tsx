import React from 'react';
import { X, HelpCircle, ShieldCheck, FileSpreadsheet, Cpu, Sparkles } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">ツールの使い方・仕様ガイド (README)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-600 leading-relaxed">
          {/* セキュリティ宣言 */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900 text-sm">完全ローカル・外部通信ゼロ設計</p>
              <p className="text-emerald-700 mt-1">
                本ツールはブラウザ内部のJavaScriptエンジンのみで形態素解析と感情判定を実行します。個人情報や社内機密を含むアンケートも外部サーバーに送信されることはありません。
              </p>
            </div>
          </div>

          {/* 取り扱いデータ規模 */}
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-600" />
              取り扱いデータ規模と性能
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-600 ml-1">
              <li><strong>件数想定</strong>: 1,000件 〜 10,000件程度</li>
              <li><strong>文字数想定</strong>: 1回答あたり 最大1,000文字程度</li>
              <li><strong>処理方式</strong>: Web標準の <code>Intl.Segmenter</code> を活用したノンブロッキング・バッチ処理</li>
            </ul>
          </div>

          {/* 取り込みCSVフォーマット */}
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              CSVファイルの取り込み仕様
            </h3>
            <p className="mb-2">ヘッダー付きのCSVまたはTSVファイルを読み込めます。列順序は以下の通りです：</p>
            <div className="bg-slate-800 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
              回答テキスト,属性カテゴリ(任意),満足度スコア(任意)<br />
              "操作が簡単で助かります。","30代 / 有料プラン",5<br />
              "夕方に画面が重くなります。","40代 / 無料プラン",2
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">※ 最低限「第1列（回答本文）」があれば解析可能です。</p>
          </div>

          {/* 各機能の操作方法 */}
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              主要機能と操作テクニック
            </h3>
            <div className="space-y-2.5">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">単語クリックから原文へ (ドリルダウン)</span>
                <p className="text-slate-500 mt-0.5">ワードクラウド、共起ネットワーク、頻度ランキングの各単語をクリックすると、その単語を含む回答原文一覧に瞬時にジャンプします。</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">共起ネットワークの操作</span>
                <p className="text-slate-500 mt-0.5">各ノード（丸）はドラッグして位置を調整できます。スライダーで共起回数やJaccard係数の閾値を変更してネットワークの密度を調整できます。</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">感情・ポジネガ分析</span>
                <p className="text-slate-500 mt-0.5">日本語の極性語辞書と係り受けパターンにより、回答をポジティブ・中立・ネガティブに自動分類し、属性別の不満比率を可視化します。</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-xs transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
