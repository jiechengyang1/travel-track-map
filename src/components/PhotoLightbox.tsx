import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Camera, Calendar, MapPin, Film, NotebookPen } from 'lucide-react';
import { MediaMemory } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const overlayVariants = {
  initial: { opacity: 0, scale: 1.04 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.985 },
};

const panelVariants = {
  initial: { opacity: 0, x: 30 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.18,
    },
  },
  exit: { opacity: 0, x: 20 },
};

const panelItemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

interface PhotoLightboxProps {
  photo: MediaMemory | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  autoPlay?: boolean;
  onAutoAdvance?: () => void;
  autoAdvanceMs?: number;
  hideManualNav?: boolean;
}

export default function PhotoLightbox({
  photo,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  autoPlay = false,
  onAutoAdvance,
  autoAdvanceMs,
  hideManualNav = false,
}: PhotoLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext && hasNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  useEffect(() => {
    if (!photo || !autoPlay || !onAutoAdvance) return;
    if (photo.type === 'video') return;
    if (!autoAdvanceMs || autoAdvanceMs <= 0) return;

    const timer = window.setTimeout(() => {
      onAutoAdvance();
    }, autoAdvanceMs);

    return () => window.clearTimeout(timer);
  }, [photo, autoPlay, onAutoAdvance, autoAdvanceMs]);

  if (!photo) return null;

  const renderMedia = () => {
    const mediaTransition = autoPlay
      ? { duration: 0.62, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }
      : { duration: 0.3 };
    const mediaInitial = autoPlay ? { opacity: 0, scale: 0.9 } : { opacity: 0, scale: 0.95 };
    const mediaExit = autoPlay ? { opacity: 0, scale: 0.92 } : { opacity: 0, scale: 0.95 };

    if (photo.type === 'video' && photo.url) {
      return (
        <motion.video
          key={photo.id}
          initial={mediaInitial}
          animate={{ opacity: 1, scale: 1 }}
          exit={mediaExit}
          transition={mediaTransition}
          src={photo.url}
          className="max-w-full max-h-[85vh] md:max-h-[92vh] object-contain rounded shadow-2xl bg-black"
          controls={!autoPlay}
          autoPlay
          onEnded={() => {
            if (autoPlay && onAutoAdvance) {
              onAutoAdvance();
            }
          }}
        />
      );
    }

    if (photo.type === 'note') {
      return (
        <motion.div
          key={photo.id}
          initial={mediaInitial}
          animate={{ opacity: 1, scale: 1 }}
          exit={mediaExit}
          transition={mediaTransition}
          className="max-w-3xl w-full rounded-2xl border border-slate-800 bg-slate-950/90 shadow-2xl p-8 text-left"
        >
          <div className="flex items-center gap-2 text-emerald-400 text-xs uppercase tracking-[0.2em] font-mono mb-4">
            <NotebookPen size={14} />
            <span>旅行感受</span>
          </div>
          <h3 className="text-2xl font-semibold text-white mb-4">{photo.title || '旅途记录'}</h3>
          <p className="text-base leading-8 text-slate-200 whitespace-pre-wrap">
            {photo.text || photo.description || '暂无文字内容。'}
          </p>
        </motion.div>
      );
    }

    return (
      <motion.img
        key={photo.id}
        initial={mediaInitial}
        animate={{ opacity: 1, scale: 1 }}
        exit={mediaExit}
        transition={mediaTransition}
        src={photo.url}
        alt={photo.title}
        referrerPolicy="no-referrer"
        className="max-w-full max-h-[85vh] md:max-h-[92vh] object-contain rounded shadow-2xl"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80';
        }}
      />
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col md:flex-row items-stretch justify-between bg-black/95 backdrop-blur-md"
        id="lightbox-container"
        variants={overlayVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: autoPlay ? 0.58 : 0.36, ease: 'easeOut' }}
      >
        <div className="relative flex-1 flex items-center justify-center p-4 min-h-[50vh] md:min-h-0">
          <button
            id="btn-close-lightbox-top"
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-slate-900/80 text-slate-200 hover:text-white hover:bg-slate-800 transition shadow-lg border border-slate-700/50"
            aria-label="Close Lightbox"
          >
            <X size={22} />
          </button>

          {!hideManualNav && hasPrev && onPrev && (
            <button
              id="btn-lightbox-prev"
              onClick={onPrev}
              className="absolute left-4 p-3 rounded-full bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800/80 transition shadow-md border border-slate-800"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {renderMedia()}

          {!hideManualNav && hasNext && onNext && (
            <button
              id="btn-lightbox-next"
              onClick={onNext}
              className="absolute right-4 p-3 rounded-full bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800/80 transition shadow-md border border-slate-800"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        <motion.div
          className="w-full md:w-[380px] bg-slate-950 border-t md:border-t-0 md:border-l border-slate-800/60 p-6 flex flex-col justify-between overflow-y-auto shrink-0"
          variants={panelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div>
            <motion.div variants={panelItemVariants} className="flex items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-4">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1">
                {photo.type === 'video' ? <Film size={12} /> : photo.type === 'note' ? <NotebookPen size={12} /> : <Camera size={12} />}
                <span>{photo.type === 'video' ? 'VIDEO MEMORY' : photo.type === 'note' ? 'NOTE MEMORY' : 'PHOTO MEMORY'}</span>
              </span>
              <button
                id="btn-close-lightbox-sidebar"
                onClick={onClose}
                className="hidden md:flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
              >
                <span>关闭</span>
                <X size={14} />
              </button>
            </motion.div>

            <motion.h3 variants={panelItemVariants} className="text-lg font-medium text-slate-100 font-display mb-3">{photo.title || '旅行记忆'}</motion.h3>
            <motion.p variants={panelItemVariants} className="text-sm text-slate-300 leading-relaxed mb-6 whitespace-pre-line bg-slate-900/40 p-3 rounded border border-slate-900">
              {photo.type === 'note'
                ? photo.text || photo.description || '在这个节点记录下你的所见所感。'
                : photo.description || '在该景点拍摄的旅行瞬间。记录下大好河山的瑰丽壮阔。'}
            </motion.p>

            <motion.div variants={panelItemVariants} className="space-y-4">
              {photo.locationName && (
                <div className="flex items-start gap-3">
                  <MapPin className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <div className="text-xs text-slate-400">拍摄位置</div>
                    <div className="text-sm text-slate-200">{photo.locationName}</div>
                  </div>
                </div>
              )}

              {photo.takenAt && (
                <div className="flex items-start gap-3">
                  <Calendar className="text-indigo-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <div className="text-xs text-slate-400">记录时间</div>
                    <div className="text-sm text-slate-200">{photo.takenAt}</div>
                  </div>
                </div>
              )}

              {photo.coordinate && (
                <div className="flex items-start gap-3">
                  <MapPin className="text-amber-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <div className="text-xs text-slate-400">GPS 坐标</div>
                    <div className="text-sm font-mono text-xs text-slate-300">
                      Lng: {photo.coordinate[0].toFixed(5)}, Lat: {photo.coordinate[1].toFixed(5)}
                    </div>
                  </div>
                </div>
              )}

              {photo.type === 'video' && photo.durationMs && (
                <div className="flex items-start gap-3">
                  <Film className="text-pink-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <div className="text-xs text-slate-400">视频时长</div>
                    <div className="text-sm text-slate-200">{(photo.durationMs / 1000).toFixed(1)} 秒</div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          <motion.div variants={panelItemVariants} className="mt-8 border-t border-slate-900 pt-4 text-xs text-slate-500 flex flex-col gap-1">
            <div>💡 提示：支持使用键盘左右方向键 ◀ ▶ 切换内容</div>
            <div>⌨ 按钮 Esc 键可直接退出查看。</div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
