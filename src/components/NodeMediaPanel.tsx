import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Camera, ChevronLeft, ChevronRight, Film, MapPin, NotebookPen } from 'lucide-react';
import { KeyNode, MediaMemory } from '../types';

interface NodeMediaPanelProps {
  node: KeyNode | null;
  memories: MediaMemory[];
  activeMedia: MediaMemory | null;
  activeIndex: number;
  autoPlay?: boolean;
  autoAdvanceMs?: number;
  onAutoAdvance?: () => void;
  onSelectMedia: (memory: MediaMemory) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const mediaVariants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.985 },
};

export default function NodeMediaPanel({
  node,
  memories,
  activeMedia,
  activeIndex,
  autoPlay = false,
  autoAdvanceMs,
  onAutoAdvance,
  onSelectMedia,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: NodeMediaPanelProps) {
  useEffect(() => {
    if (!activeMedia || !autoPlay || !onAutoAdvance) return;
    if (activeMedia.type === 'video') return;
    if (!autoAdvanceMs || autoAdvanceMs <= 0) return;

    const timer = window.setTimeout(() => {
      onAutoAdvance();
    }, autoAdvanceMs);

    return () => window.clearTimeout(timer);
  }, [activeMedia, autoPlay, autoAdvanceMs, onAutoAdvance]);

  const renderMainMedia = () => {
    if (!activeMedia) {
      return (
        <div className="h-full min-h-[260px] flex items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 text-slate-500 text-sm">
          选择一个节点内容开始查看
        </div>
      );
    }

    if (activeMedia.type === 'video' && activeMedia.url) {
      return (
        <motion.video
          key={activeMedia.id}
          variants={mediaVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: autoPlay ? 0.45 : 0.28, ease: 'easeOut' }}
          src={activeMedia.url}
          className="w-full max-h-[52vh] rounded-2xl bg-black object-contain"
          controls
          autoPlay={autoPlay}
          onEnded={() => {
            if (autoPlay && onAutoAdvance) {
              onAutoAdvance();
            }
          }}
        />
      );
    }

    if (activeMedia.type === 'note') {
      return (
        <motion.div
          key={activeMedia.id}
          variants={mediaVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: autoPlay ? 0.45 : 0.28, ease: 'easeOut' }}
          className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-left min-h-[320px]"
        >
          <div className="flex items-center gap-2 text-emerald-400 text-xs uppercase tracking-[0.18em] font-mono mb-4">
            <NotebookPen size={14} />
            <span>旅行感受</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-4">{activeMedia.title || '旅途记录'}</h3>
          <p className="text-sm leading-7 text-slate-200 whitespace-pre-wrap">
            {activeMedia.text || activeMedia.description || '暂无文字内容。'}
          </p>
        </motion.div>
      );
    }

    return (
      <motion.img
        key={activeMedia.id}
        variants={mediaVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: autoPlay ? 0.45 : 0.28, ease: 'easeOut' }}
        src={activeMedia.url}
        alt={activeMedia.title}
        referrerPolicy="no-referrer"
        className="w-full max-h-[52vh] rounded-2xl object-contain bg-slate-950/50"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80';
        }}
      />
    );
  };

  return (
    <div className="h-full w-full overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-slate-800 shrink-0">
        <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-mono">节点内容预览</div>
        <div className="mt-1 text-lg font-semibold text-white">{node?.name || '未选择节点'}</div>
        {node?.highlight && (
          <div className="mt-1 text-xs text-slate-400">{node.highlight}</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="relative rounded-2xl border border-slate-800 bg-slate-900/60 p-2.5">
          <AnimatePresence mode="wait">
            {renderMainMedia()}
          </AnimatePresence>

          {activeMedia && (
            <>
              {hasPrev && onPrev && (
                <button
                  onClick={onPrev}
                  className="absolute left-5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:text-white hover:bg-slate-800 transition border border-slate-700"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              {hasNext && onNext && (
                <button
                  onClick={onNext}
                  className="absolute right-5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:text-white hover:bg-slate-800 transition border border-slate-700"
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </>
          )}
        </div>

        {activeMedia ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1">
                {activeMedia.type === 'video' ? <Film size={12} /> : activeMedia.type === 'note' ? <NotebookPen size={12} /> : <Camera size={12} />}
                <span>{activeMedia.type === 'video' ? 'VIDEO' : activeMedia.type === 'note' ? 'NOTE' : 'PHOTO'}</span>
              </span>
              <span className="text-[11px] text-slate-500">
                {memories.length > 0 ? `${activeIndex + 1} / ${memories.length}` : '0 / 0'}
              </span>
            </div>

            <div>
              <div className="text-base font-medium text-white">{activeMedia.title || '旅行记忆'}</div>
              <p className="mt-1.5 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {activeMedia.type === 'note'
                  ? activeMedia.text || activeMedia.description || '在这个节点记录下你的所见所感。'
                  : activeMedia.description || '在该景点拍摄的旅行瞬间。'}
              </p>
            </div>

            <div className="space-y-2.5 text-sm">
              {activeMedia.locationName && (
                <div className="flex items-start gap-3">
                  <MapPin className="text-emerald-400 shrink-0 mt-0.5" size={15} />
                  <div>
                    <div className="text-xs text-slate-400">拍摄位置</div>
                    <div className="text-slate-200">{activeMedia.locationName}</div>
                  </div>
                </div>
              )}

              {activeMedia.takenAt && (
                <div className="flex items-start gap-3">
                  <Calendar className="text-indigo-400 shrink-0 mt-0.5" size={15} />
                  <div>
                    <div className="text-xs text-slate-400">记录时间</div>
                    <div className="text-slate-200">{activeMedia.takenAt}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-5 text-sm text-slate-500">
            当前节点暂无媒体内容
          </div>
        )}
      </div>
    </div>
  );
}
