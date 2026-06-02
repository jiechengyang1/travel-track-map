import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TripData, KeyNode, MediaMemory } from './types';
import { interpolateRouteCoordinate, geoDistanceMeters } from './utils/routePlayback';
import { defaultTrip } from './data/defaultTrip';
import MapContainer from './components/MapContainer';
import Timeline from './components/Timeline';
import PhotoLightbox from './components/PhotoLightbox';
import DataController from './components/DataController';

export default function App() {
  const [tripData, setTripData] = useState<TripData>(defaultTrip);
  const [dataLoadedSource, setDataLoadedSource] = useState<'default' | 'fetched'>('default');

  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const [activeNode, setActiveNode] = useState<KeyNode | null>(null);
  const [activePhoto, setActivePhoto] = useState<MediaMemory | null>(null);
  const [activePhotoGroup, setActivePhotoGroup] = useState<MediaMemory[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'node-media'>('map');
  const [autoPlaybackNodeId, setAutoPlaybackNodeId] = useState<string | null>(null);
  const [mediaQueue, setMediaQueue] = useState<MediaMemory[]>([]);
  const [mediaQueueIndex, setMediaQueueIndex] = useState(0);
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);
  const autoPlayedNodeIdsRef = useRef<Set<string>>(new Set());

  const flattenedRoute = useMemo(() => {
    return tripData.segments.flatMap((segment, index) => {
      if (index === 0) return segment.path;
      return segment.path.slice(1);
    });
  }, [tripData.segments]);

  const totalRoutePoints = flattenedRoute.length;

  const nodePositions = useMemo(() => {
    if (tripData.previewNodes.length === 0 || totalRoutePoints <= 1) {
      return [] as Array<{ node: KeyNode; position: number }>;
    }

    return tripData.previewNodes.map((node, index) => ({
      node,
      position: tripData.previewNodes.length > 1
        ? (index / (tripData.previewNodes.length - 1)) * (totalRoutePoints - 1)
        : 0,
    }));
  }, [tripData.previewNodes, totalRoutePoints]);

  const segmentStatuses = useMemo(() => {
    const statusMap = new Map<string, 'planned' | 'traveled' | 'skipped'>();
    let cursor = 0;

    tripData.segments.forEach((segment, index) => {
      const pointsInFlatRoute = index === 0 ? segment.path.length : Math.max(segment.path.length - 1, 0);
      const segmentStart = cursor;
      const segmentEnd = Math.max(segmentStart, cursor + pointsInFlatRoute - 1);
      const hasEnteredSegment = currentProgress >= segmentStart;
      const hasCompletedSegment = currentProgress >= segmentEnd;

      if (segment.status === 'skipped') {
        statusMap.set(segment.id, 'skipped');
      } else if (segment.status === 'traveled' || hasCompletedSegment) {
        statusMap.set(segment.id, 'traveled');
      } else if (hasEnteredSegment) {
        statusMap.set(segment.id, 'traveled');
      } else {
        statusMap.set(segment.id, 'planned');
      }

      cursor += pointsInFlatRoute;
    });

    return statusMap;
  }, [tripData.segments, currentProgress]);

  const playbackNode = useMemo(() => {
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

  const travelerCoord = useMemo(() => {
    return interpolateRouteCoordinate(flattenedRoute, currentProgress);
  }, [flattenedRoute, currentProgress]);

  const activeNodeMemories = useMemo(() => {
    if (!activeNode) return [];
    return tripData.mediaMemories.filter((memory) => memory.keyNodeId === activeNode.id);
  }, [tripData.mediaMemories, activeNode]);

  const currentAutoMedia = mediaQueue[mediaQueueIndex] || null;

  useEffect(() => {
    const fetchTripJson = async () => {
      try {
        const response = await fetch('trip.json');
        if (response.ok) {
          const parsed = await response.json();
          if (parsed.tripName && Array.isArray(parsed.segments) && Array.isArray(parsed.previewNodes)) {
            setTripData(parsed);
            setDataLoadedSource('fetched');
            if (parsed.previewNodes.length > 0) {
              setActiveNode(parsed.previewNodes[0]);
            }
          }
        } else if (defaultTrip.previewNodes.length > 0) {
          setActiveNode(defaultTrip.previewNodes[0]);
        }
      } catch (e) {
        console.warn('获取 trip.json 失败或跨域被拦截，已自动启动内置路线引擎:', e);
        if (defaultTrip.previewNodes.length > 0) {
          setActiveNode(defaultTrip.previewNodes[0]);
        }
      }
    };

    fetchTripJson();
  }, []);

  useEffect(() => {
    if (!isPlaying || totalRoutePoints <= 1 || viewMode !== 'map') return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      setCurrentProgress((prev) => {
        const step = 0.85 * playbackSpeed * delta;
        const next = prev + step;

        if (next >= totalRoutePoints - 1) {
          setIsPlaying(false);
          return totalRoutePoints - 1;
        }
        return next;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, playbackSpeed, totalRoutePoints, viewMode]);

  useEffect(() => {
    if (playbackNode) {
      setActiveNode(playbackNode);
    }
  }, [playbackNode]);

  useEffect(() => {
    if (currentProgress === 0) {
      autoPlayedNodeIdsRef.current.clear();
    }
  }, [currentProgress]);

  const getMediaAutoAdvanceMs = useCallback((memory: MediaMemory) => {
    if (memory.type === 'photo') return 1500;
    if (memory.type === 'video') return memory.durationMs || undefined;

    const textLength = (memory.text || memory.description || '').trim().length;
    const estimated = Math.ceil((textLength / 250) * 60 * 1000);
    return Math.max(3000, Math.min(45000, estimated || 3000));
  }, []);

  const finishNodeAutoPlayback = useCallback(() => {
    setActivePhoto(null);
    setActivePhotoGroup([]);
    setMediaQueue([]);
    setMediaQueueIndex(0);
    setAutoPlaybackNodeId(null);
    setViewMode('map');
    setIsPlaying(true);
  }, []);

  const handleAutoAdvance = useCallback(() => {
    setMediaQueueIndex((prev) => {
      if (prev < mediaQueue.length - 1) {
        return prev + 1;
      }

      window.setTimeout(() => {
        finishNodeAutoPlayback();
      }, 150);
      return prev;
    });
  }, [mediaQueue.length, finishNodeAutoPlayback]);

  useEffect(() => {
    if (!currentAutoMedia) return;
    setActivePhoto(currentAutoMedia);
    setActivePhotoGroup(mediaQueue);
  }, [currentAutoMedia, mediaQueue]);

  useEffect(() => {
    if (!isPlaying || viewMode !== 'map' || tripData.previewNodes.length === 0) return;

    const thresholdMeters = 250;
    const nearestNode = tripData.previewNodes.reduce<{ node: KeyNode | null; distance: number }>((closest, node) => {
      const distance = geoDistanceMeters(travelerCoord, node.coordinate);
      if (distance < closest.distance) {
        return { node, distance };
      }
      return closest;
    }, { node: null, distance: Infinity });

    if (!nearestNode.node || nearestNode.distance > thresholdMeters) return;

    const node = nearestNode.node;
    if (autoPlayedNodeIdsRef.current.has(node.id)) return;

    const queue = tripData.mediaMemories
      .filter((memory) => memory.keyNodeId === node.id)
      .sort((a, b) => {
        const rank = { video: 0, photo: 1, note: 2 } as const;
        return rank[a.type] - rank[b.type];
      });

    if (queue.length === 0) return;

    autoPlayedNodeIdsRef.current.add(node.id);
    setIsPlaying(false);
    setActiveNode(node);
    setAutoPlaybackNodeId(node.id);
    setMediaQueue(queue);
    setMediaQueueIndex(0);
    setViewMode('node-media');
  }, [travelerCoord, isPlaying, tripData.previewNodes, tripData.mediaMemories, viewMode]);

  const handleSelectNode = useCallback((node: KeyNode) => {
    setActiveNode(node);
    const nodeIndex = nodePositions.find((entry) => entry.node.id === node.id)?.position;
    if (nodeIndex !== undefined) {
      setCurrentProgress(nodeIndex);
    }
  }, [nodePositions]);

  const handleUpdateTripData = useCallback((newData: TripData) => {
    setTripData(newData);
    setCurrentProgress(0);
    setIsPlaying(false);
    setViewMode('map');
    setActivePhoto(null);
    setActivePhotoGroup([]);
    setMediaQueue([]);
    setMediaQueueIndex(0);
    setAutoPlaybackNodeId(null);
    autoPlayedNodeIdsRef.current.clear();
    if (newData.previewNodes.length > 0) {
      setActiveNode(newData.previewNodes[0]);
    } else {
      setActiveNode(null);
    }
  }, []);

  const handlePhotoClick = useCallback((memory: MediaMemory) => {
    const related = tripData.mediaMemories.filter((item) => item.keyNodeId === memory.keyNodeId && item.type === 'photo');
    setActivePhoto(memory);
    setActivePhotoGroup(related.length > 0 ? related : [memory]);
  }, [tripData.mediaMemories]);

  const activePhotoIndex = useMemo(() => {
    if (!activePhoto) return -1;
    return activePhotoGroup.findIndex((memory) => memory.id === activePhoto.id);
  }, [activePhotoGroup, activePhoto]);

  const hasPrevPhoto = activePhotoIndex > 0;
  const hasNextPhoto = activePhotoIndex !== -1 && activePhotoIndex < activePhotoGroup.length - 1;

  const handlePrevPhoto = useCallback(() => {
    if (hasPrevPhoto) {
      setActivePhoto(activePhotoGroup[activePhotoIndex - 1]);
    }
  }, [hasPrevPhoto, activePhotoGroup, activePhotoIndex]);

  const handleNextPhoto = useCallback(() => {
    if (hasNextPhoto) {
      setActivePhoto(activePhotoGroup[activePhotoIndex + 1]);
    }
  }, [hasNextPhoto, activePhotoGroup, activePhotoIndex]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden font-sans select-none antialiased">
      <div className={`flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-700 ease-out ${
        viewMode === 'node-media'
          ? 'opacity-0 pointer-events-none scale-[0.945] blur-[2px] brightness-[0.72]'
          : 'opacity-100 scale-100 blur-0 brightness-100'
      }`}>
        <MapContainer
          tripData={tripData}
          flattenedRoute={flattenedRoute}
          currentProgress={currentProgress}
          segmentStatuses={segmentStatuses}
          activeNode={activeNode}
          onSelectNode={handleSelectNode}
          dataLoadedSource={dataLoadedSource}
        />

        <Timeline
          currentProgress={currentProgress}
          onProgressChange={setCurrentProgress}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          playbackSpeed={playbackSpeed}
          setPlaybackSpeed={setPlaybackSpeed}
          routesCount={totalRoutePoints}
          previewNodes={tripData.previewNodes}
          nodePositions={nodePositions}
          onSelectNode={handleSelectNode}
          activeNode={activeNode}
        />
      </div>

      <PhotoLightbox
        photo={activePhoto}
        onClose={() => {
          if (viewMode === 'node-media') {
            finishNodeAutoPlayback();
            return;
          }
          setActivePhoto(null);
          setActivePhotoGroup([]);
        }}
        onPrev={handlePrevPhoto}
        onNext={handleNextPhoto}
        hasPrev={hasPrevPhoto}
        hasNext={hasNextPhoto}
        autoPlay={viewMode === 'node-media'}
        onAutoAdvance={handleAutoAdvance}
        autoAdvanceMs={currentAutoMedia ? getMediaAutoAdvanceMs(currentAutoMedia) : undefined}
        hideManualNav={viewMode === 'node-media'}
      />

      {viewMode === 'map' && activeNode && activeNodeMemories.length > 0 && (
        <div className="absolute top-20 right-4 z-30 w-[340px] max-w-[calc(100vw-2rem)] bg-slate-950/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-mono">节点内容预览</div>
            <div className="mt-1 text-sm font-semibold text-white">{activeNode.name}</div>
            {activeNode.highlight && (
              <div className="mt-1 text-xs text-slate-400">{activeNode.highlight}</div>
            )}
          </div>
          <div className="max-h-[55vh] overflow-y-auto p-3 space-y-3">
            {activeNodeMemories.map((memory) => (
              <button
                key={memory.id}
                onClick={() => handlePhotoClick(memory)}
                className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 transition overflow-hidden"
              >
                {memory.type === 'photo' && memory.url && (
                  <img src={memory.url} alt={memory.title} className="w-full h-36 object-cover" referrerPolicy="no-referrer" />
                )}
                {memory.type === 'video' && (
                  <div className="w-full h-36 bg-slate-900 flex items-center justify-center text-slate-300 text-sm">
                    ▶ 视频预留位
                  </div>
                )}
                {memory.type === 'note' && (
                  <div className="p-4 text-sm text-slate-300 leading-relaxed line-clamp-5">
                    {memory.text || memory.description || '旅行文字记录'}
                  </div>
                )}
                <div className="p-3">
                  <div className="text-sm font-medium text-white">{memory.title}</div>
                  {memory.description && memory.type !== 'note' && (
                    <div className="mt-1 text-xs text-slate-400 line-clamp-2">{memory.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {viewMode === 'node-media' && currentAutoMedia && autoPlaybackNodeId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="absolute inset-0 z-40 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(2,6,23,0.16) 0%, rgba(2,6,23,0.48) 45%, rgba(2,6,23,0.88) 100%)',
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-950/85 border border-emerald-500/20 text-emerald-300 text-xs font-mono tracking-[0.18em] shadow-xl backdrop-blur"
            >
              节点自动播放中 · {tripData.previewNodes.find((node) => node.id === autoPlaybackNodeId)?.name}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DataController
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        tripData={tripData}
        onUpdateTripData={handleUpdateTripData}
      />

      <button
        onClick={() => setIsImporterOpen(true)}
        className="absolute top-4 right-4 z-40 px-3 py-2 rounded-full bg-slate-900/85 hover:bg-slate-800 text-slate-100 border border-slate-700 shadow-lg text-xs font-semibold backdrop-blur"
      >
        打开路线数据控制台
      </button>
    </div>
  );
}
