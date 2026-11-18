import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Papa from 'papaparse';
import encoding from 'encoding-japanese';
import { SurveyRow, WordToken, WordFrequency, PosType, ColumnMappingConfig, SavedAnalysisConfig } from './types';
import {
  DEFAULT_STOPWORDS,
  tokenizeText,
  calculateRowSentiment,
  computeWordFrequencies,
  computeCooccurrence,
  computeNgrams
} from './utils/tokenizer';
import { generateSampleData } from './utils/sampleDataGenerator';
import { WordCloudView } from './components/WordCloudView';
import { CooccurrenceNetworkView } from './components/CooccurrenceNetworkView';
import { SentimentAnalysisView } from './components/SentimentAnalysisView';
import { KwicBrowserView } from './components/KwicBrowserView';
import { HelpModal } from './components/HelpModal';
import { ColumnMappingModal } from './components/ColumnMappingModal';
import { SegmentComparisonView } from './components/SegmentComparisonView';
import {
  FileText,
  BarChart3,
  Network,
  Cloud,
  HeartPulse,
  Search,
  Upload,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Cpu,
  Layers,
  HelpCircle,
  Save,
  Download,
  Filter,
  Settings
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function App() {
  const [baseRows, setBaseRows] = useState<SurveyRow[]>([]);
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [tokenMap, setTokenMap] = useState<Map<string, WordToken[]>>(new Map());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'frequencies' | 'cloud' | 'network' | 'ngrams' | 'sentiment' | 'kwic' | 'segment'>('dashboard');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // 設定・フィルタ
  const [posNoun, setPosNoun] = useState(true);
  const [posAdj, setPosAdj] = useState(true);
  const [posVerb, setPosVerb] = useState(true);
  const [minFreq, setMinFreq] = useState(3);
  const [customStopwordsStr, setCustomStopwordsStr] = useState('');
  const [networkMinCooc, setNetworkMinCooc] = useState(4);
  const [networkMinJaccard, setNetworkMinJaccard] = useState(0.08);
  const [kwicSearchQuery, setKwicSearchQuery] = useState('');

  // 複数項目分析用の状態
  const [columnMapping, setColumnMapping] = useState<ColumnMappingConfig>({ textCols: [], attributeCols: [], scoreCols: [] });
  const [selectedQuestion, setSelectedQuestion] = useState<string>('ALL'); // 'ALL' or specific text column
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string[]>>({});

  // 処理中フラグ
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPending, startTransition] = useTransition();

  // CSVインポート設定モーダル用状態
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [rawCsvData, setRawCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

  // localStorageからの復元
  useEffect(() => {
    const saved = localStorage.getItem('textMinerSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.posFilter) {
          setPosNoun(parsed.posFilter.includes('noun'));
          setPosAdj(parsed.posFilter.includes('adj'));
          setPosVerb(parsed.posFilter.includes('verb'));
        }
        if (parsed.minFreq) setMinFreq(parsed.minFreq);
        if (parsed.customStopwords !== undefined) setCustomStopwordsStr(parsed.customStopwords);
        if (parsed.cooccurrenceMinFreq) setNetworkMinCooc(parsed.cooccurrenceMinFreq);
        if (parsed.jaccardThreshold) setNetworkMinJaccard(parsed.jaccardThreshold);
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
    loadSample(1200);
  }, []);

  // localStorageへの自動保存
  useEffect(() => {
    const settings = {
      posFilter: [
        ...(posNoun ? ['noun'] : []),
        ...(posAdj ? ['adj'] : []),
        ...(posVerb ? ['verb'] : [])
      ],
      minFreq,
      customStopwords: customStopwordsStr,
      cooccurrenceMinFreq: networkMinCooc,
      jaccardThreshold: networkMinJaccard
    };
    localStorage.setItem('textMinerSettings', JSON.stringify(settings));
  }, [posNoun, posAdj, posVerb, minFreq, customStopwordsStr, networkMinCooc, networkMinJaccard]);

  // サンプルデータ生成と解析
  const loadSample = (count: number) => {
    setIsProcessing(true);
    setProgress(15);
    setTimeout(() => {
      const sample = generateSampleData(count);
      setColumnMapping({
        textCols: ['Q1_良い点・満足な点', 'Q2_不満・改善要望'],
        attributeCols: ['年代', '契約プラン'],
        scoreCols: ['総合満足度', '推奨度NPS']
      });
      setSelectedQuestion('ALL');
      setAttributeFilters({});
      setBaseRows(sample);
      processDataset(sample, undefined, 'ALL');
    }, 50);
  };

  // CSVファイル入力
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 同じファイルを選択し直せるようにvalueをクリア
    e.target.value = '';

    setIsProcessing(true);
    setProgress(10);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // 文字コード判別と変換
        const detectedEncoding = encoding.detect(uint8Array);
        const unicodeString = encoding.convert(uint8Array, {
          to: 'UNICODE',
          from: detectedEncoding || 'AUTO',
          type: 'string'
        }) as string;

        Papa.parse(unicodeString, {
          header: true, // ヘッダーとして読み込む
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as Record<string, string>[];
            if (data.length < 1) {
              alert('CSVファイルが空または有効な行がありません。');
              setIsProcessing(false);
              return;
            }
            
            const headers = results.meta.fields || Object.keys(data[0] || {});

            setCsvHeaders(headers);
            setRawCsvData(data);
            setIsCsvModalOpen(true);
            setIsProcessing(false);
          },
          error: () => {
            alert('CSVの解析に失敗しました。フォーマットを確認してください。');
            setIsProcessing(false);
          }
        });
      } catch (err) {
        alert('ファイルの読み込みに失敗しました。');
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportConfig = () => {
    const config: SavedAnalysisConfig = {
      columnMapping,
      posFilter: [
        ...(posNoun ? ['noun' as PosType] : []),
        ...(posAdj ? ['adj' as PosType] : []),
        ...(posVerb ? ['verb' as PosType] : [])
      ],
      minFreq,
      customStopwords: customStopwordsStr,
      cooccurrenceMinFreq: networkMinCooc,
      jaccardThreshold: networkMinJaccard
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'textminer-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    e.target.value = ''; // reset
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string) as SavedAnalysisConfig;
        
        if (config.posFilter) {
          setPosNoun(config.posFilter.includes('noun'));
          setPosAdj(config.posFilter.includes('adj'));
          setPosVerb(config.posFilter.includes('verb'));
        }
        if (config.minFreq) setMinFreq(config.minFreq);
        if (config.customStopwords !== undefined) setCustomStopwordsStr(config.customStopwords);
        if (config.cooccurrenceMinFreq) setNetworkMinCooc(config.cooccurrenceMinFreq);
        if (config.jaccardThreshold) setNetworkMinJaccard(config.jaccardThreshold);
        if (config.columnMapping) setColumnMapping(config.columnMapping);
        
        alert('設定プロファイルを読み込みました。');

        if (baseRows.length > 0) {
          processDataset(baseRows, config.customStopwords);
        }
      } catch (err) {
        alert('設定ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
  };

  const executeCsvImport = (config: ColumnMappingConfig) => {
    setIsCsvModalOpen(false);
    setIsProcessing(true);
    setProgress(10);
    setColumnMapping(config);
    
    setTimeout(() => {
        const parsedRows: SurveyRow[] = [];
        
        for (let i = 0; i < rawCsvData.length; i++) {
          const row = rawCsvData[i];
          
          const texts: Record<string, string> = {};
          config.textCols.forEach(c => texts[c] = row[c] || '');
          
          const attributes: Record<string, string> = {};
          config.attributeCols.forEach(c => attributes[c] = row[c] || '');
          
          const scores: Record<string, number> = {};
          config.scoreCols.forEach(c => {
             const val = Number(row[c]);
             if (!isNaN(val)) scores[c] = val;
          });
          
          const combinedText = config.textCols
            .map(c => row[c] || '')
            .filter(text => text.trim() !== '')
            .join(' ');
          
          if (combinedText.trim() === '') continue;
          
          parsedRows.push({
            id: `ROW-${i}`,
            text: combinedText,
            texts,
            attributes,
            scores,
            category: config.attributeCols.length > 0 ? row[config.attributeCols[0]] || '一般' : '一般',
            score: config.scoreCols.length > 0 ? Number(row[config.scoreCols[0]]) || undefined : undefined,
            wordCount: combinedText.length
          });
        }
        
        if (parsedRows.length === 0) {
            alert('有効なデータが見つかりませんでした。');
            setIsProcessing(false);
            return;
        }

        setSelectedQuestion('ALL');
        setAttributeFilters({});
        setBaseRows(parsedRows);
        processDataset(parsedRows, undefined, 'ALL');
    }, 50);
  };

  // データセットのローカル形態素解析・センチメント付与
  const processDataset = (rawRows: SurveyRow[], overrideStopwordsStr?: string, targetQ?: string) => {
    setProgress(30);

    const targetStopwordsStr = overrideStopwordsStr !== undefined ? overrideStopwordsStr : customStopwordsStr;
    const questionToProcess = targetQ !== undefined ? targetQ : selectedQuestion;

    // ストップワードの結合
    const stopwordSet = new Set(DEFAULT_STOPWORDS);
    if (targetStopwordsStr.trim()) {
      targetStopwordsStr.split(/[,、\s]+/).forEach(w => {
        const normalized = w.trim().toLowerCase().replace(/[。]/g, '');
        if (normalized) stopwordSet.add(normalized);
      });
    }

    // チャンク処理でUIをロックさせない
    const tokensResult = new Map<string, WordToken[]>();
    const enrichedRows: SurveyRow[] = [];

    let processed = 0;
    const total = rawRows.length;

    const processBatch = (startIdx: number) => {
      const end = Math.min(startIdx + 200, total);
      for (let i = startIdx; i < end; i++) {
        const r = rawRows[i];
        
        let targetText = r.text;
        if (questionToProcess !== 'ALL' && r.texts) {
          targetText = r.texts[questionToProcess] || '';
        }

        const tokens = tokenizeText(targetText, stopwordSet);
        const sentiment = calculateRowSentiment(targetText, tokens);

        tokensResult.set(r.id, tokens);
        enrichedRows.push({
          ...r,
          text: targetText, // 解析対象テキストで上書き
          sentiment: sentiment.label,
          sentimentScore: sentiment.score,
          wordCount: targetText.length
        });
      }

      processed = end;
      setProgress(Math.round(30 + (processed / total) * 65));

      if (end < total) {
        setTimeout(() => processBatch(end), 5);
      } else {
        startTransition(() => {
          setRows(enrichedRows);
          setTokenMap(tokensResult);
          setIsProcessing(false);
          setProgress(100);
        });
      }
    };

    processBatch(0);
  };

  // 品詞フィルタ
  const activePosFilter = useMemo(() => {
    const s = new Set<PosType>();
    if (posNoun) s.add('noun');
    if (posAdj) s.add('adj');
    if (posVerb) s.add('verb');
    return s;
  }, [posNoun, posAdj, posVerb]);

  // グローバル・セグメント絞り込み
  const filteredRows = useMemo(() => {
    if (Object.keys(attributeFilters).length === 0) return rows;
    
    return rows.filter(r => {
      // AND条件（すべての属性条件を満たすか）
      for (const [attrName, allowedValues] of Object.entries(attributeFilters)) {
        if (allowedValues.length === 0) continue; // 選択なし＝すべて許可
        
        const rowVal = r.attributes?.[attrName] || '';
        // OR条件（同一属性内ではどれか1つに一致すればOK）
        if (!allowedValues.includes(rowVal)) {
          return false; // 1つでも属性条件を満たさない場合は除外
        }
      }
      return true;
    });
  }, [rows, attributeFilters]);

  // 集計キャッシュ
  const wordFrequencies = useMemo(() => {
    return computeWordFrequencies(filteredRows, tokenMap, minFreq, activePosFilter);
  }, [filteredRows, tokenMap, minFreq, activePosFilter]);

  const cooccurrenceData = useMemo(() => {
    return computeCooccurrence(filteredRows, tokenMap, 28, networkMinCooc, networkMinJaccard);
  }, [filteredRows, tokenMap, networkMinCooc, networkMinJaccard]);

  const ngrams = useMemo(() => {
    return computeNgrams(filteredRows, tokenMap, 2, minFreq);
  }, [filteredRows, tokenMap, minFreq]);

  // サマリー計算
  const summary = useMemo(() => {
    let totalLen = 0;
    let totalTokens = 0;
    let posCount = 0;
    let neuCount = 0;
    let negCount = 0;

    for (const r of filteredRows) {
      totalLen += r.text.length;
      totalTokens += (tokenMap.get(r.id)?.length || 0);
      if (r.sentiment === 'positive') posCount++;
      else if (r.sentiment === 'negative') negCount++;
      else neuCount++;
    }

    return {
      totalRows: filteredRows.length,
      totalTokens,
      avgLength: filteredRows.length > 0 ? Math.round(totalLen / filteredRows.length) : 0,
      positiveCount: posCount,
      neutralCount: neuCount,
      negativeCount: negCount,
      vocabCount: wordFrequencies.length
    };
  }, [filteredRows, tokenMap, wordFrequencies]);

  // 単語クリック時にKWIC原文検索タブへジャンプ
  const handleWordDrilldown = (word: string) => {
    setKwicSearchQuery(word);
    setActiveTab('kwic');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* ヘルプモーダル (README) */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* CSVインポート設定モーダル */}
      <ColumnMappingModal
        isOpen={isCsvModalOpen}
        headers={csvHeaders}
        previewData={rawCsvData}
        initialConfig={columnMapping}
        onApply={executeCsvImport}
        onClose={() => setIsCsvModalOpen(false)}
      />

      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 whitespace-nowrap">日本語アンケート・テキストマイニングツール</h1>
                <span className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap shrink-0" title="ローカル完全完結 (外部通信なし)">
                  <ShieldCheck className="w-3 h-3" />
                  ローカル完全完結
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate" title="1,000〜10,000件規模の自由記述を高精度・高速にブラウザ内で一括解析">1,000〜10,000件規模の自由記述を高精度・高速にブラウザ内で一括解析</p>
            </div>
          </div>

          {/* クイックアクション */}
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 lg:pb-0">
            <label className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-2.5 py-1.5 rounded-lg cursor-pointer transition shadow-xs whitespace-nowrap shrink-0" title="CSVファイルを読込">
              <Upload className="w-3.5 h-3.5" />
              CSV読込
              <input type="file" accept=".csv,.txt,.tsv" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => loadSample(1200)}
              className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1.5 rounded-lg transition whitespace-nowrap shrink-0"
              title="1,200件のデモアンケートを再読み込み"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              デモ生成
            </button>

            {rawCsvData.length > 0 && (
              <button
                onClick={() => setIsCsvModalOpen(true)}
                className="flex items-center gap-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-2.5 py-1.5 rounded-lg transition border border-emerald-200 whitespace-nowrap shrink-0"
                title="読み込み済みCSVの列マッピングを再設定"
              >
                <Settings className="w-3.5 h-3.5" />
                列設定
              </button>
            )}

            <div className="h-4 w-px bg-slate-200 shrink-0 mx-0.5"></div>

            <button
              onClick={handleExportConfig}
              className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1.5 rounded-lg transition whitespace-nowrap shrink-0"
              title="現在の設定を.jsonファイルとして保存"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              設定保存
            </button>
            <label className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1.5 rounded-lg cursor-pointer transition whitespace-nowrap shrink-0" title="保存した.jsonファイルから設定を読込">
              <Download className="w-3.5 h-3.5 text-slate-500" />
              設定読込
              <input type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
            </label>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1.5 rounded-lg transition whitespace-nowrap shrink-0"
              title="使い方ガイド・READMEを開く"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              使い方
            </button>
          </div>
        </div>

        {/* ナビゲーションタブ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-100 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 px-2.5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'dashboard'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            ダッシュボード
          </button>

          <button
            onClick={() => setActiveTab('frequencies')}
            className={`py-3 px-2.5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'frequencies'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            頻度ランキング ({wordFrequencies.length})
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-3 px-2.5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'cloud'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-4 h-4" />
            ワードクラウド
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`py-3 px-2.5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'network'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Network className="w-4 h-4" />
            共起ネットワーク
          </button>

          <button
            onClick={() => setActiveTab('ngrams')}
            className={`py-3 px-2.5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'ngrams'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            2-gram 連語
          </button>

          <button
            onClick={() => setActiveTab('sentiment')}
            className={`py-3 px-2.5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'sentiment'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            感情・満足度
          </button>

          <button
            onClick={() => setActiveTab('kwic')}
            className={`py-3 px-2.5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'kwic'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4" />
            KWIC・原文
          </button>
          
          <button
            onClick={() => setActiveTab('segment')}
            className={`py-3 px-2.5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'segment'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            セグメント比較
          </button>
        </div>
      </header>

      {/* 解析中プログレスバー */}
      {isProcessing && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>日本語形態素解析・センチメント判定を実行中... ({progress}%)</span>
          </div>
          <div className="w-48 bg-indigo-800 rounded-full h-2 overflow-hidden">
            <div className="bg-emerald-400 h-2 transition-all duration-200" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        
        {/* 上部フィルタ・オプションバー（設問切替＆属性フィルタ） */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 text-xs">
          
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  分析対象の自由記述:
                </span>
                <select
                  value={selectedQuestion}
                  onChange={(e) => {
                    setSelectedQuestion(e.target.value);
                    processDataset(baseRows, undefined, e.target.value);
                  }}
                  className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 font-medium"
                >
                  <option value="ALL">[ 選択した全設問を統合 ]</option>
                  {columnMapping.textCols.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {columnMapping.attributeCols.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pl-4 border-l border-slate-200">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-green-500" />
                    属性・セグメント絞り込み:
                  </span>
                  {columnMapping.attributeCols.map(attr => (
                    <div key={attr} className="flex items-center gap-1">
                      <span className="text-slate-500">{attr}:</span>
                      <select
                        className="px-2 py-1 bg-slate-50 border border-slate-300 rounded"
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          setAttributeFilters(prev => {
                            const current = prev[attr] || [];
                            if (!current.includes(val)) {
                              return { ...prev, [attr]: [...current, val] };
                            }
                            return prev;
                          });
                        }}
                      >
                        <option value="">＋追加</option>
                        {Array.from(new Set(baseRows.map(r => r.attributes?.[attr] || '').filter(v => v))).map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(attributeFilters).map(([attr, vals]) => 
                vals.map(val => (
                  <span key={`${attr}-${val}`} className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full">
                    <span className="opacity-70">{attr}:</span> {val}
                    <button
                      className="hover:bg-green-200 rounded-full p-0.5"
                      onClick={() => setAttributeFilters(prev => ({
                        ...prev,
                        [attr]: prev[attr].filter(v => v !== val)
                      }))}
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
              {Object.keys(attributeFilters).some(k => attributeFilters[k].length > 0) && (
                <button
                  className="text-slate-500 hover:text-slate-800 underline decoration-slate-300 underline-offset-2"
                  onClick={() => setAttributeFilters({})}
                >
                  クリア
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  抽出品詞:
                </span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={posNoun}
                    onChange={(e) => setPosNoun(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  名詞
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={posAdj}
                    onChange={(e) => setPosAdj(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  形容詞
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={posVerb}
                    onChange={(e) => setPosVerb(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  動詞
                </label>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">最小出現回数:</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={minFreq}
                  onChange={(e) => setMinFreq(Math.max(1, Number(e.target.value)))}
                  className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">除外語(カンマ区切り):</span>
                <input
                  type="text"
                  placeholder="例: 御社, 会社, *ます"
                  value={customStopwordsStr}
                  onChange={(e) => setCustomStopwordsStr(e.target.value)}
                  onBlur={() => processDataset(baseRows)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      processDataset(baseRows);
                    }
                  }}
                  className="w-48 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                <button
                  onClick={() => {
                    setPosNoun(true);
                    setPosAdj(true);
                    setPosVerb(true);
                    setMinFreq(3);
                    setCustomStopwordsStr('');
                    processDataset(baseRows);
                  }}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded transition"
                  title="解析設定を初期値に戻す"
                >
                  設定を初期化
                </button>
              </div>
            </div>
          </div>

          <div className="text-slate-500">
            解析対象: <strong className="text-slate-800">{summary.totalRows.toLocaleString()}</strong> 件 / 抽出語彙: <strong className="text-slate-800">{summary.vocabCount.toLocaleString()}</strong> 語
          </div>
        </div>

        {/* 1. ダッシュボード概要 */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* メトリクスカード */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500">総アンケート回答数</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{summary.totalRows.toLocaleString()}<span className="text-xs font-normal text-slate-500 ml-1">件</span></p>
                <p className="text-[11px] text-slate-400 mt-1">1データ最大1,000字想定</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500">抽出総単語数 (トークン)</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{summary.totalTokens.toLocaleString()}<span className="text-xs font-normal text-slate-500 ml-1">語</span></p>
                <p className="text-[11px] text-slate-400 mt-1">形態素・意味単語の総数</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500">平均文字数 / 回答</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{summary.avgLength}<span className="text-xs font-normal text-slate-500 ml-1">文字</span></p>
                <p className="text-[11px] text-slate-400 mt-1">記述密度の目安</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500">好意・ポジティブ比率</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {summary.totalRows > 0 ? ((summary.positiveCount / summary.totalRows) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-[11px] text-slate-400 mt-1">好意的な意見の割合</p>
              </div>
            </div>

            {/* 上位頻出語バーチャート & ワードクラウドPreview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">最頻出キーワード Top 10</h3>
                    <p className="text-xs text-slate-500">アンケート全体で最も言及された単語</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('frequencies')}
                    className="text-xs text-indigo-600 hover:underline font-medium"
                  >
                    全ランキングへ
                  </button>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={wordFrequencies.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                      <XAxis type="number" />
                      <YAxis dataKey="word" type="category" width={70} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => [`${value}回`, '出現回数']} />
                      <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ワードクラウド簡易プレビュー */}
              <WordCloudView
                words={wordFrequencies.slice(0, 35)}
                onWordClick={handleWordDrilldown}
                colorMode="sentiment"
              />
            </div>
          </div>
        )}

        {/* 2. 単語頻度ランキング */}
        {activeTab === 'frequencies' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-800">単語出現頻度 (TF / DFランキング)</h3>
                <p className="text-xs text-slate-500">単語をクリックすると、その単語を含む回答原文を一覧表示します。</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">順位</th>
                    <th className="py-2.5 px-4 font-semibold">出現単語</th>
                    <th className="py-2.5 px-4 font-semibold">品詞</th>
                    <th className="py-2.5 px-4 font-semibold">出現総数 (TF)</th>
                    <th className="py-2.5 px-4 font-semibold">出現文書数 (DF)</th>
                    <th className="py-2.5 px-4 font-semibold">文書カバー率</th>
                    <th className="py-2.5 px-4 font-semibold">極性平均</th>
                    <th className="py-2.5 px-4 font-semibold text-right">アクション</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wordFrequencies.slice(0, 100).map((w, idx) => {
                    const coverage = filteredRows.length > 0 ? ((w.docFrequency / filteredRows.length) * 100).toFixed(1) : '0';
                    return (
                      <tr key={w.word} className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-4 text-slate-400 font-mono font-bold">{idx + 1}</td>
                        <td className="py-2 px-4 font-bold text-indigo-600 hover:underline cursor-pointer" onClick={() => handleWordDrilldown(w.word)}>
                          {w.word}
                        </td>
                        <td className="py-2 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600">
                            {w.pos === 'noun' ? '名詞' : w.pos === 'adj' ? '形容詞' : '動詞'}
                          </span>
                        </td>
                        <td className="py-2 px-4 font-semibold text-slate-800">{w.count.toLocaleString()}</td>
                        <td className="py-2 px-4 text-slate-600">{w.docFrequency.toLocaleString()}</td>
                        <td className="py-2 px-4 text-slate-600">{coverage}%</td>
                        <td className="py-2 px-4">
                          <span className={`font-semibold ${w.sentimentAvg > 0 ? 'text-emerald-600' : w.sentimentAvg < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                            {w.sentimentAvg > 0 ? `+${w.sentimentAvg}` : w.sentimentAvg}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => {
                              const newStr = customStopwordsStr.trim() ? `${customStopwordsStr.trim()}, ${w.word}` : w.word;
                              setCustomStopwordsStr(newStr);
                              processDataset(baseRows, newStr);
                            }}
                            className="text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition"
                            title="この単語を除外語に追加して再集計"
                          >
                            除外
                          </button>
                          <button
                            onClick={() => handleWordDrilldown(w.word)}
                            className="text-xs text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition"
                          >
                            原文を見る &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. ワードクラウド */}
        {activeTab === 'cloud' && (
          <WordCloudView
            words={wordFrequencies}
            onWordClick={handleWordDrilldown}
            colorMode="sentiment"
          />
        )}

        {/* 4. 共起ネットワーク */}
        {activeTab === 'network' && (
          <CooccurrenceNetworkView
            nodes={cooccurrenceData.nodes}
            edges={cooccurrenceData.edges}
            onNodeClick={handleWordDrilldown}
            minCooc={networkMinCooc}
            setMinCooc={setNetworkMinCooc}
            minJaccard={networkMinJaccard}
            setMinJaccard={setNetworkMinJaccard}
          />
        )}

        {/* 5. 2-gram 連語フレーズ */}
        {activeTab === 'ngrams' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">2-gram (バイグラム) 頻出連語フレーズ</h3>
              <p className="text-xs text-slate-500">連続して使われた単語の組み合わせ（係り受け・頻出コロケーション）を抽出します。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ngrams.map((ng, idx) => (
                <div
                  key={ng.phrase}
                  onClick={() => handleWordDrilldown(ng.words[0])}
                  className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg cursor-pointer transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400 w-5">{idx + 1}</span>
                    <span className="text-xs font-semibold text-slate-800">{ng.phrase}</span>
                  </div>
                  <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-600">
                    {ng.count}回
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
{/* 6. セグメント比較 (NEW) */}
{activeTab === 'segment' && (
  <SegmentComparisonView
    rows={filteredRows}
    tokenMap={tokenMap}
    onWordClick={handleWordDrilldown}
    attributeCols={columnMapping.attributeCols}
    textCols={columnMapping.textCols}
  />
)}

{/* 6. 感情・満足度分析 */}
{activeTab === 'sentiment' && (
  <SentimentAnalysisView rows={filteredRows} attributeCols={columnMapping.attributeCols} textCols={columnMapping.textCols} />
)}

{/* 7. KWIC原文ブラウザ */}
{activeTab === 'kwic' && (
  <KwicBrowserView rows={filteredRows} initialKeyword={kwicSearchQuery} />
)}
      </main>

      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        完全ローカル実行型 日本語テキストマイニングツール &bull; 端末内メモリ完結・個人情報や社内機密アンケートの外部流出リスクなし
      </footer>
    </div>
  );
}
