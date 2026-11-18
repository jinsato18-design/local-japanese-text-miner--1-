import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CooccurrenceNode, CooccurrenceEdge } from '../types';
import { Maximize2, RefreshCw, ZoomIn, ZoomOut, Sliders } from 'lucide-react';

interface CooccurrenceNetworkProps {
  nodes: CooccurrenceNode[];
  edges: CooccurrenceEdge[];
  onNodeClick: (word: string) => void;
  minCooc: number;
  setMinCooc: (v: number) => void;
  minJaccard: number;
  setMinJaccard: (v: number) => void;
}

interface SimNode extends CooccurrenceNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const CooccurrenceNetworkView: React.FC<CooccurrenceNetworkProps> = ({
  nodes,
  edges,
  onNodeClick,
  minCooc,
  setMinCooc,
  minJaccard,
  setMinJaccard
}) => {
  const [zoom, setZoom] = useState(1);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const draggingNodeRef = useRef<{ id: string; offsetX: number; offsetY: number; startX: number; startY: number } | null>(null);
  const wasMovedRef = useRef<boolean>(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const width = 800;
  const height = 500;

  const simNodesRef = useRef<SimNode[]>([]);

  // 簡易力学シミュレーション（クライアントサイド・高速計算）
  useEffect(() => {
    if (nodes.length === 0) {
      setSimNodes([]);
      simNodesRef.current = [];
      return;
    }

    // 初期配置 (円形ランダム配置 または 前回の座標を引き継ぎ)
    const initial: SimNode[] = nodes.map((n, i) => {
      const existing = simNodesRef.current.find(sn => sn.id === n.id);
      if (existing) {
        return { ...n, x: existing.x, y: existing.y, vx: 0, vy: 0 };
      }
      const angle = (i / nodes.length) * 2 * Math.PI;
      const radius = 160 + (i % 3) * 35;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0
      };
    });

    const nodeIndexMap = new Map<string, number>();
    initial.forEach((n, idx) => nodeIndexMap.set(n.id, idx));

    // 150回のイテレーションで静的レイアウトを安定化
    for (let step = 0; step < 150; step++) {
      // 1. ノード間の反発力 (Coulomb force)
      for (let i = 0; i < initial.length; i++) {
        for (let j = i + 1; j < initial.length; j++) {
          const n1 = initial[i];
          const n2 = initial[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const repulse = 4000 / (dist * dist);
          const fx = (dx / dist) * repulse;
          const fy = (dy / dist) * repulse;

          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      }

      // 2. エッジの引力 (Hooke spring force)
      for (const edge of edges) {
        const i1 = nodeIndexMap.get(edge.source);
        const i2 = nodeIndexMap.get(edge.target);
        if (i1 === undefined || i2 === undefined) continue;

        const n1 = initial[i1];
        const n2 = initial[i2];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 150 - Math.min(edge.jaccard * 100, 40);
        const attract = (dist - targetDist) * 0.03 * (edge.jaccard * 2.5);

        const fx = (dx / dist) * attract;
        const fy = (dy / dist) * attract;

        n1.vx += fx;
        n1.vy += fy;
        n2.vx -= fx;
        n2.vy -= fy;
      }

      // 3. 中心への重力引力
      for (const n of initial) {
        n.vx += (width / 2 - n.x) * 0.008;
        n.vy += (height / 2 - n.y) * 0.008;

        // 減衰と位置適用
        n.x += n.vx * 0.5;
        n.y += n.vy * 0.5;
        n.vx *= 0.65;
        n.vy *= 0.65;
      }
    }

    setSimNodes(initial);
  }, [nodes, edges]);

  useEffect(() => {
    simNodesRef.current = simNodes;
  }, [simNodes]);

  const maxNodeCount = useMemo(() => Math.max(...nodes.map(n => n.count), 1), [nodes]);
  const nodeMap = useMemo(() => new Map(simNodes.map(n => [n.id, n])), [simNodes]);

  // マウスドラッグハンドラ
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodeMap.get(nodeId);
    if (!node || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;
    const logicalX = width / 2 + (svgX - width / 2) / zoom;
    const logicalY = height / 2 + (svgY - height / 2) / zoom;

    wasMovedRef.current = false;
    draggingNodeRef.current = { id: nodeId, offsetX: logicalX - node.x, offsetY: logicalY - node.y, startX: e.clientX, startY: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeRef.current || !svgRef.current) return;
    const { id, offsetX, offsetY, startX, startY } = draggingNodeRef.current;
    
    const dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
    if (dist > 4) {
      wasMovedRef.current = true;
    }

    const rect = svgRef.current.getBoundingClientRect();
    
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;

    const logicalX = width / 2 + (svgX - width / 2) / zoom;
    const logicalY = height / 2 + (svgY - height / 2) / zoom;

    const newX = logicalX - offsetX;
    const newY = logicalY - offsetY;

    setSimNodes(prev => prev.map(n => n.id === id ? { ...n, x: newX, y: newY } : n));
  };

  const handleMouseUp = () => {
    draggingNodeRef.current = null;
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">共起ネットワーク (Co-occurrence Network)</h3>
          <p className="text-xs text-slate-500">同じ回答文内で同時に使われやすい単語同士を結んだネットワーク図です。文脈構造や話題のまとまりを可視化します。</p>
        </div>

        {/* コントロール群 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>共起回数 &ge; {minCooc}</span>
            <input
              type="range"
              min="2"
              max="20"
              value={minCooc}
              onChange={(e) => setMinCooc(Number(e.target.value))}
              className="w-16 accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <span>Jaccard &ge; {minJaccard}</span>
            <input
              type="range"
              min="0.03"
              max="0.25"
              step="0.01"
              value={minJaccard}
              onChange={(e) => setMinJaccard(Number(e.target.value))}
              className="w-16 accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
              className="p-1 hover:bg-white rounded text-slate-600 transition"
              title="縮小"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-medium px-1 text-slate-600">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
              className="p-1 hover:bg-white rounded text-slate-600 transition"
              title="拡大"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 hover:bg-white rounded text-slate-600 transition"
              title="リセット"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVGキャンバス */}
      <div className="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[480px] cursor-grab active:cursor-grabbing select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <g transform={`scale(${zoom})`} transform-origin="center center">
            {/* エッジ線 */}
            {edges.map((e, idx) => {
              const src = nodeMap.get(e.source);
              const tgt = nodeMap.get(e.target);
              if (!src || !tgt) return null;

              const isHighlighted = selectedWord === e.source || selectedWord === e.target;
              const strokeWidth = Math.min(1 + e.weight * 0.4, 5);

              return (
                <line
                  key={`${e.source}-${e.target}-${idx}`}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={isHighlighted ? '#6366f1' : '#cbd5e1'}
                  strokeWidth={strokeWidth}
                  strokeOpacity={isHighlighted ? 0.9 : 0.6}
                  strokeLinecap="round"
                />
              );
            })}

            {/* ノード */}
            {simNodes.map((n) => {
              const radius = Math.max(12, Math.min(10 + (n.count / maxNodeCount) * 18, 28));
              const isSelected = selectedWord === n.id;

              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  onMouseDown={(e) => handleMouseDown(n.id, e)}
                  onClick={(e) => {
                    if (wasMovedRef.current) {
                      e.stopPropagation();
                      return;
                    }
                    setSelectedWord(n.id === selectedWord ? null : n.id);
                    onNodeClick(n.id);
                  }}
                  className="cursor-pointer group"
                >
                  <circle
                    r={radius}
                    fill={isSelected ? '#4f46e5' : '#3b82f6'}
                    stroke={isSelected ? '#c7d2fe' : '#ffffff'}
                    strokeWidth={isSelected ? 4 : 2}
                    className="transition-colors duration-150 shadow-md group-hover:fill-indigo-600"
                  />
                  <text
                    y={radius + 12}
                    textAnchor="middle"
                    className="text-[11px] font-bold fill-slate-800 pointer-events-none drop-shadow-sm"
                  >
                    {n.label} ({n.count})
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* 凡例 / ヒント */}
        <div className="absolute bottom-2 left-3 text-[11px] text-slate-500 bg-white/90 backdrop-blur px-2.5 py-1 rounded shadow-sm border border-slate-200">
          ノード: {simNodes.length}語 / エッジ: {edges.length}件 (ドラッグでノード移動可)
        </div>
      </div>
    </div>
  );
};
