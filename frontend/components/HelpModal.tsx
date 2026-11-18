import React from 'react';
import { X, HelpCircle, ShieldCheck, FileSpreadsheet, Cpu, Sparkles } from 'lucide-react';
import licensesText from '../../THIRD_PARTY_LICENSES.txt?raw';

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

          {/* Windows起動方法 */}
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              WindowsでのGUI起動方法
            </h3>
            <p className="text-slate-600 ml-1">
              コマンド操作なしで簡単に起動するには、プロジェクトフォルダ内の <code>start.bat</code> をダブルクリックしてください。自動的にブラウザが開きます。<br/>
              単一HTMLファイルとして配布したい場合は、<code>npm run build</code> を実行すると <code>frontend/dist/index.html</code> にすべてがまとめられます。
            </p>
          </div>

          {/* 取り込みCSVフォーマット */}
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              CSVファイルの取り込み仕様
            </h3>
            <p className="mb-2">ヘッダー付きのCSVファイルを読み込むと「列マッピング設定」画面が表示されます。以下の列を自由に割り当て可能です：</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 ml-1 mb-2">
              <li><strong>自由記述</strong>: 複数列を選択可能です。</li>
              <li><strong>属性・セグメント</strong>: 年代、契約プラン、性別などのカテゴリ軸（複数可）。</li>
              <li><strong>数値スコア</strong>: 満足度やNPSなどの数値軸（複数可）。</li>
            </ul>
            <div className="bg-slate-800 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
              回答ID,Q1_良い点,Q2_不満な点,年代,契約プラン,総合満足度<br />
              001,"使いやすい","特になし","30代","スタンダード",5<br />
              002,"普通","夕方に重くなる","40代","無料プラン",2
            </div>
          </div>

          {/* 各機能の操作方法 */}
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              主要機能と操作テクニック
            </h3>
            <div className="space-y-2.5">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">設問切り替え・グローバルフィルタ</span>
                <p className="text-slate-500 mt-0.5">複数の自由記述を取り込んだ場合、上部のドロップダウンで解析対象をワンクリックで切り替えられます。また、属性（年代・プランなど）で全体のデータを絞り込むことができ、全タブが連動して更新されます。</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">セグメント比較・2軸クロス集計</span>
                <p className="text-slate-500 mt-0.5">「感情・満足度分析」タブでは、属性同士を掛け合わせた2軸クロス集計グラフが描画されます。「セグメント比較」タブでは各属性の特徴語ランキングを横並びで比較可能です。</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">設定プロファイルの保存・復元</span>
                <p className="text-slate-500 mt-0.5">右上のボタンから、列マッピング設定や除外語などのパラメータを <code>.json</code> 形式で保存できます。次回のCSV読み込み前にこのプロファイルを読み込むと、設定が自動で復元されます。</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">単語クリックから原文へ (ドリルダウン)</span>
                <p className="text-slate-500 mt-0.5">ワードクラウド、共起ネットワーク、頻度ランキングの各単語をクリックすると、その単語を含む回答原文一覧に瞬時にジャンプします。</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">対象外ワード（ストップワード）の柔軟な指定</span>
                <p className="text-slate-500 mt-0.5">
                  画面上部の入力欄から、除外したい語句をカンマ区切りで指定できます。<br/>
                  完全一致だけでなく、<code>*ます</code> や <code>～ます</code> のようなワイルドカード指定にも対応しています。
                </p>
              </div>
            </div>
          </div>

          {/* 利用条件・免責事項 */}
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              利用条件・免責事項（オープンソースライセンス）
            </h3>
            <div className="space-y-2.5">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">データの取り扱い</span>
                <p className="text-slate-500 mt-0.5">本ツールはブラウザ内メモリでのみ動作し外部通信を行いませんが、ブラウザを閉じるとデータが消去されるため、バックアップは利用者の責任で行ってください。</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">解析精度の限界</span>
                <p className="text-slate-500 mt-0.5">Web標準の <code>Intl.Segmenter</code> や簡易辞書による形態素分割・極性判定は統計的・簡易的な処理であり、文脈や皮肉などによって意図と異なる結果になる場合があります。</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">免責事項（無保証）</span>
                <p className="text-slate-500 mt-0.5">開発者および提供者は、本ツールの正確性・完全性・動作の安定性について保証せず、利用によって生じたいかなる損害についても責任を負いません。</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">オープンソースライセンスの表記</span>
                <p className="text-slate-500 mt-0.5 mb-2">本ツールは、React、Recharts、PapaParse、encoding-japanese などのサードパーティ製ソフトウェアを利用しています。</p>
                <details className="group">
                  <summary className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-medium select-none flex items-center gap-1 text-[11px]">
                    <span>サードパーティライセンス情報を表示</span>
                  </summary>
                  <div className="mt-2 p-3 bg-white border border-slate-200 rounded text-[10px] text-slate-500 h-40 overflow-y-auto whitespace-pre-wrap font-mono">
                    {licensesText}
                  </div>
                </details>
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
