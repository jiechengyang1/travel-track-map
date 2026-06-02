import React from 'react';
import { Play, Pause, RotateCcw, Navigation, Calendar } from 'lucide-react';
import { KeyNode } from '../types';

interface TimelineProps {
  currentProgress: number;
  onProgressChange: (progress: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  routesCount: number;
  previewNodes: KeyNode[];
  nodePositions: Array<{ node: KeyNode; position: number }>;
  onSelectNode: (node: KeyNode) => void;
  activeNode: KeyNode | null;
}

export default function Timeline({
  currentProgress,
  onProgressChange,
  isPlaying,
  setIsPlaying,
  playbackSpeed,
  setPlaybackSpeed,
  routesCount,
  previewNodes,
  nodePositions,
  onSelectNode,
  activeNode,
}: TimelineProps) {
  const days = React.useMemo(() => {
    const list = previewNodes
      .map((node) => node.day)
      .filter((day): day is number => typeof day === 'number');
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [previewNodes]);

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onProgressChange(parseFloat(e.target.value));
  };

  const handleReset = () => {
    setIsPlaying(false);
    onProgressChange(0);
  };

  const currentPercent = routesCount > 1 ? (currentProgress / Math.max(1, routesCount - 1)) * 100 : 0;

  const playbackNode = React.useMemo(() => {
    if (nodePositions.length === 0) return null;

    let closest = nodePositions[0];
    let minDiff = Infinity;

    nodePositions.forEach((entry) => {
      const diff = Math.abs(entry.position - currentProgress);
      if (diff < minDiff) {
        minDiff = diff;
        closest = entry;
      }
    });

    return closest.node;
  }, [nodePositions, currentProgress]);

  const currentDay = playbackNode?.day || activeNode?.day || 1;

  const jumpToDay = (dayNum: number) => {
    const targetNode = previewNodes.find((node) => node.day === dayNum);
    if (targetNode) {
      onSelectNode(targetNode);
    }
  };

  return (
    <div className="bg-slate-900/92 border-t border-slate-800 p-4 md:px-8 md:py-5 flex flex-col gap-4 backdrop-blur-md text-slate-100 shrink-0 select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap flex items-center gap-1 mr-1">
            <Calendar size={13} className="text-slate-500" />
            <span>节点日程:</span>
          </span>
          {days.map((dayNum) => (
            <button
              id={`day-tab-${dayNum}`}
              key={dayNum}
              onClick={() => jumpToDay(dayNum)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition whitespace-nowrap ${
                currentDay === dayNum
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Day {dayNum}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-400 self-end md:self-auto bg-slate-950/40 px-3 py-1.5 rounded border border-slate-800/40">
          <div className="flex items-center gap-1.5">
            <Navigation size={12} className="text-emerald-400" />
            <span>当前节点:</span>
            <span className="text-slate-200 font-medium">
              {playbackNode ? playbackNode.name : '等待路线数据...'}
            </span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div>
            <span>进度:</span>
            <span className="text-slate-200 font-medium ml-1">{currentPercent.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="relative mt-2">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-slate-800 rounded-full overflow-hidden pointer-events-none">
          <div className="h-full bg-emerald-500/80 transition-all duration-75" style={{ width: `${currentPercent}%` }} />
        </div>

        <input
          id="timeline-scrubber"
          type="range"
          min={0}
          max={Math.max(1, routesCount - 1)}
          step={0.1}
          value={currentProgress}
          onChange={handleScrubberChange}
          className="relative w-full h-6 appearance-none bg-transparent cursor-pointer focus:outline-none z-10 accent-emerald-500 hover:accent-emerald-400"
        />

        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none">
          {nodePositions.map(({ node, position }) => {
            const percent = routesCount > 1 ? (position / Math.max(1, routesCount - 1)) * 100 : 0;
            const isVisited = position <= currentProgress;
            const isCurrentlySelected = activeNode?.id === node.id;

            return (
              <button
                id={`timeline-tick-${node.id}`}
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node);
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group focus:outline-none z-20"
                style={{ left: `${percent}%` }}
                title={node.name}
              >
                <span className={`block w-3.5 h-3.5 rounded-full border-2 transition-all shadow-md ${
                  isCurrentlySelected
                    ? 'bg-red-500 border-white scale-125 ring-2 ring-red-500/30'
                    : isVisited
                    ? 'bg-emerald-400 border-slate-900 group-hover:bg-emerald-300'
                    : 'bg-slate-600 border-slate-900 group-hover:bg-slate-400'
                }`} />

                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950 font-sans text-[10px] text-slate-200 px-2 py-1 rounded shadow-lg border border-slate-800 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transform scale-95 group-hover:scale-100 transition-all origin-bottom">
                  <span className="font-semibold text-emerald-400">Day {node.day || '-'}</span> {node.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-3">
          <button
            id="btn-play-pause"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2.5 rounded-full text-slate-950 transition hover:scale-105 shadow ${
              isPlaying
                ? 'bg-amber-400 hover:bg-amber-300 ring-4 ring-amber-400/20'
                : 'bg-emerald-400 hover:bg-emerald-300 ring-4 ring-emerald-400/20'
            }`}
            title={isPlaying ? '暂停动画' : '播放轨迹动画'}
          >
            {isPlaying ? <Pause size={18} fill="#020617" /> : <Play size={18} fill="#020617" />}
          </button>

          <button
            id="btn-reset-timeline"
            onClick={handleReset}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="重置到起点"
          >
            <RotateCcw size={16} />
          </button>

          <div className="text-xs text-slate-400 hidden sm:block">
            {isPlaying ? '关键节点回放进行中...' : '关键节点回放已暂停'}
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-850">
          {[0.5, 1, 3, 5].map((speed) => (
            <button
              id={`speed-btn-${speed}`}
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2 py-1 text-xs font-mono font-medium rounded transition ${
                playbackSpeed === speed
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
