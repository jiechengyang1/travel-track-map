import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Camera, Calendar, MapPin } from 'lucide-react';
import { Photo } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface PhotoLightboxProps {
  photo: Photo | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export default function PhotoLightbox({
  photo,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: PhotoLightboxProps) {
  
  // Close on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext && hasNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  if (!photo) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex flex-col md:flex-row items-stretch justify-between bg-black/95 backdrop-blur-md"
        id="lightbox-container"
      >
        {/* Photo Container: Taking up left/center of screen */}
        <div className="relative flex-1 flex items-center justify-center p-4 min-h-[50vh] md:min-h-0">
          {/* Close button inside photo view for easy touch access */}
          <button 
            id="btn-close-lightbox-top"
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-slate-900/80 text-slate-200 hover:text-white hover:bg-slate-800 transition shadow-lg border border-slate-700/50"
            aria-label="Close Lightbox"
          >
            <X size={22} />
          </button>

          {/* Left Arrow */}
          {hasPrev && onPrev && (
            <button
              id="btn-lightbox-prev"
              onClick={onPrev}
              className="absolute left-4 p-3 rounded-full bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800/80 transition shadow-md border border-slate-800"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Main Photo Image with zoom effect */}
          <motion.img
            key={photo.url}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            src={photo.url}
            alt={photo.title}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[85vh] md:max-h-[92vh] object-contain rounded shadow-2xl"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80";
            }}
          />

          {/* Right Arrow */}
          {hasNext && onNext && (
            <button
              id="btn-lightbox-next"
              onClick={onNext}
              className="absolute right-4 p-3 rounded-full bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800/80 transition shadow-md border border-slate-800"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {/* Sidebar Panel: Info, description, camera details */}
        <div className="w-full md:w-[380px] bg-slate-950 border-t md:border-t-0 md:border-l border-slate-800/60 p-6 flex flex-col justify-between overflow-y-auto shrink-0">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-4">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">PHOTO DETAILED</span>
              <button
                id="btn-close-lightbox-sidebar"
                onClick={onClose}
                className="hidden md:flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
              >
                <span>关闭</span>
                <X size={14} />
              </button>
            </div>

            {/* Title & Desc */}
            <h3 className="text-lg font-medium text-slate-100 font-display mb-3">{photo.title || "旅行记忆"}</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6 whitespace-pre-line bg-slate-900/40 p-3 rounded border border-slate-900">
              {photo.description || "在该景点拍摄的旅行瞬间。记录下大好河山的瑰丽壮阔。"}
            </p>

            {/* Metadata Checklist */}
            <div className="space-y-4">
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
                    <div className="text-xs text-slate-400">拍摄时间</div>
                    <div className="text-sm text-slate-200">{photo.takenAt}</div>
                  </div>
                </div>
              )}

              {photo.camera && (
                <div className="flex items-start gap-3">
                  <Camera className="text-pink-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <div className="text-xs text-slate-400">器材参数 (EXIF)</div>
                    <div className="text-sm font-mono text-slate-200 text-xs">{photo.camera}</div>
                  </div>
                </div>
              )}

              {photo.coordinates && (
                <div className="flex items-start gap-3">
                  <MapPin className="text-amber-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <div className="text-xs text-slate-400">GPS 坐标</div>
                    <div className="text-sm font-mono text-xs text-slate-300">
                      Lng: {photo.coordinates[0].toFixed(5)}, Lat: {photo.coordinates[1].toFixed(5)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick tips */}
          <div className="mt-8 border-t border-slate-900 pt-4 text-xs text-slate-500 flex flex-col gap-1">
            <div>💡 提示：支持使用键盘左右方向键 ◀ ▶ 切换照片</div>
            <div>⌨ 按钮 Esc 键可直接退出查看。</div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
