import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TripData, KeyNode, MediaMemory } from './types';
import { interpolateRouteCoordinate, geoDistanceMeters } from './utils/routePlayback';
import { defaultTrip } from './data/defaultTrip';
import MapContainer from './components/MapContainer';
import Timeline from './components/Timeline';
import NodeMediaPanel from './components/NodeMediaPanel';
import DataController from './components/DataController';

const PLAYBACK_PREPARE_TIMEOUT_MS = 260;
const PLAYBACK_PREPARE_ANIMATION_SECONDS = PLAYBACK_PREPARE_TIMEOUT_MS / 1000;

export default function App() {
  const [tripData, setTripData] = useState<TripData>(defaultTrip);
  const [dataLoadedSource, setDataLoadedSource] = useState<'default' | 'fetched'>('default');

  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPreparingPlayback, setIsPreparingPlayback] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const [activeNode, setActiveNode] = useState<KeyNode | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'node-media'>('map');
  const [autoPlaybackNodeId, setAutoPlaybackNodeId] = useState<string | null>(null);
  const [mediaQueue, setMediaQueue] = useState<MediaMemory[]>([]);
  const [mediaQueueIndex, setMediaQueueIndex] = useState(0);
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);
  const [isImmersiveMapMode, setIsImmersiveMapMode] = useState<boolean>(false);
  const [isPageHovered, setIsPageHovered] = useState<boolean>(false);
  const autoPlayedNodeIdsRef = useRef<Set<string>>(new Set());
  const playbackPrepareTimeoutRef = useRef<number | null>(null);

  const flattenedRoute = useMemo(() => {
    const validSegments = tripData.segments.filter((segment) => segment.path.length >= 2);

    return validSegments.flatMap((segment, index) => {
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

  const segmentProgressRanges = useMemo(() => {
    let cursor = 0;

    return tripData.segments.map((segment) => {
      const segmentLength = Math.max(0, segment.path.length - 1);
      const startProgress = cursor;
      const endProgress = cursor + segmentLength;
      cursor = endProgress;

      return {
        segment,
        startProgress,
        endProgress,
      };
    });
  }, [tripData.segments]);

  const segmentStatuses = useMemo(() => {
    const statusMap = new Map<string, 'planned' | 'traveled' | 'skipped'>();

    segmentProgressRanges.forEach(({ segment, endProgress }) => {
      if (segment.status === 'skipped') {
        statusMap.set(segment.id, 'skipped');
      } else if (currentProgress >= endProgress) {
        statusMap.set(segment.id, 'traveled');
      } else {
        statusMap.set(segment.id, 'planned');
      }
    });

    return statusMap;
  }, [segmentProgressRanges, currentProgress]);

  const activeSegmentProgress = useMemo(() => {
    for (const { segment, startProgress, endProgress } of segmentProgressRanges) {
      if (segment.status === 'skipped') continue;
      if (segment.path.length < 2) continue;
      if (currentProgress < startProgress || currentProgress >= endProgress) continue;

      return {
        segmentId: segment.id,
        progress: currentProgress - startProgress,
      };
    }

    return null;
  }, [segmentProgressRanges, currentProgress]);

  const passedNodeIds = useMemo(() => {
    return new Set(
      nodePositions
        .filter(({ position }) => currentProgress >= position)
        .map(({ node }) => node.id),
    );
  }, [nodePositions, currentProgress]);

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

  const currentPlaybackDay = useMemo(() => {
    if (currentProgress <= 0) {
      return tripData.previewNodes[0]?.day ?? activeNode?.day ?? 1;
    }

    return playbackNode?.day ?? activeNode?.day ?? tripData.previewNodes[0]?.day ?? 1;
  }, [currentProgress, playbackNode, activeNode, tripData.previewNodes]);

  const travelerCoord = useMemo(() => {
    return interpolateRouteCoordinate(flattenedRoute, currentProgress);
  }, [flattenedRoute, currentProgress]);

  const activeNodeMemories = useMemo(() => {
    if (!activeNode) return [];
    return tripData.mediaMemories.filter((memory) => memory.keyNodeId === activeNode.id);
  }, [tripData.mediaMemories, activeNode]);

  const currentAutoMedia = mediaQueue[mediaQueueIndex] || null;

  const activePanelMedia = useMemo(() => {
    if (currentAutoMedia && currentAutoMedia.keyNodeId === activeNode?.id) {
      return currentAutoMedia;
    }

    if (!selectedMediaId) {
      return activeNodeMemories[0] || null;
    }

    return activeNodeMemories.find((memory) => memory.id === selectedMediaId) || activeNodeMemories[0] || null;
  }, [currentAutoMedia, activeNode, selectedMediaId, activeNodeMemories]);

  const activePanelIndex = useMemo(() => {
    if (!activePanelMedia) return -1;
    return activeNodeMemories.findIndex((memory) => memory.id === activePanelMedia.id);
  }, [activeNodeMemories, activePanelMedia]);

  const hasPrevPanelMedia = activePanelIndex > 0;
  const hasNextPanelMedia = activePanelIndex !== -1 && activePanelIndex < activeNodeMemories.length - 1;

  const shouldHideTimeline = !isPageHovered;
  const shouldHideRoutePreview = isImmersiveMapMode;
  const shouldHideToolbar = isImmersiveMapMode;

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
    if (!isPlaying || totalRoutePoints <= 1) return;

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
  }, [isPlaying, playbackSpeed, totalRoutePoints]);

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
    if (memory.type === 'photo') {
      const minPhotoMs = Math.max(1500, memory.durationMs || 0);
      return minPhotoMs;
    }
    if (memory.type === 'video') return memory.durationMs || undefined;

    const textLength = (memory.text || memory.description || '').trim().length;
    const estimated = Math.ceil((textLength / 250) * 60 * 1000);
    return Math.max(3000, Math.min(45000, estimated || 3000));
  }, []);

  const beginPlayback = useCallback(() => {
    setIsImmersiveMapMode(true);
    setIsPreparingPlayback(true);
    setIsPlaying(false);

    if (playbackPrepareTimeoutRef.current) {
      window.clearTimeout(playbackPrepareTimeoutRef.current);
    }

    playbackPrepareTimeoutRef.current = window.setTimeout(() => {
      setIsPreparingPlayback(false);
      setIsPlaying(true);
      playbackPrepareTimeoutRef.current = null;
    }, PLAYBACK_PREPARE_TIMEOUT_MS);
  }, []);

  const finishNodeAutoPlayback = useCallback(() => {
    setMediaQueue([]);
    setMediaQueueIndex(0);
    setAutoPlaybackNodeId(null);
    beginPlayback();
  }, [beginPlayback]);

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
    if (!isPlaying || tripData.previewNodes.length === 0) return;

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
    setSelectedMediaId(queue[0].id);
    setAutoPlaybackNodeId(node.id);
    setMediaQueue(queue);
    setMediaQueueIndex(0);
  }, [travelerCoord, isPlaying, tripData.previewNodes, tripData.mediaMemories]);

  const handleSelectNode = useCallback((node: KeyNode) => {
    setIsImmersiveMapMode(true);
    setActiveNode(node);
    const nodeMemories = tripData.mediaMemories.filter((memory) => memory.keyNodeId === node.id);
    setSelectedMediaId(nodeMemories[0]?.id || null);
    const nodeIndex = nodePositions.find((entry) => entry.node.id === node.id)?.position;
    if (nodeIndex !== undefined) {
      setCurrentProgress(nodeIndex);
    }
  }, [nodePositions, tripData.mediaMemories]);

  const handleUpdateTripData = useCallback((newData: TripData) => {
    setTripData(newData);
    setCurrentProgress(0);
    setIsPlaying(false);
    setViewMode('map');
    setIsImmersiveMapMode(false);
    setSelectedMediaId(null);
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
    setSelectedMediaId(memory.id);
  }, []);

  const handlePrevPanelMedia = useCallback(() => {
    if (hasPrevPanelMedia && activePanelIndex > 0) {
      setSelectedMediaId(activeNodeMemories[activePanelIndex - 1].id);
    }
  }, [hasPrevPanelMedia, activeNodeMemories, activePanelIndex]);

  const handleNextPanelMedia = useCallback(() => {
    if (hasNextPanelMedia && activePanelIndex !== -1) {
      setSelectedMediaId(activeNodeMemories[activePanelIndex + 1].id);
    }
  }, [hasNextPanelMedia, activeNodeMemories, activePanelIndex]);

  return (
    <div
      className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden font-sans select-none antialiased"
      onMouseEnter={() => setIsPageHovered(true)}
      onMouseLeave={() => setIsPageHovered(false)}
    >
      <div className="flex-1 flex h-full relative overflow-hidden transition-all duration-700 ease-out opacity-100 scale-100 blur-0 brightness-100">
        <div className="flex-1 min-w-0 h-full flex flex-col">
          <MapContainer
            tripData={tripData}
            flattenedRoute={flattenedRoute}
            currentProgress={currentProgress}
            segmentStatuses={segmentStatuses}
            passedNodeIds={passedNodeIds}
            activeNode={activeNode}
            activeSegmentProgress={activeSegmentProgress}
            currentPlaybackDay={currentPlaybackDay}
            isPlaying={isPlaying}
            isPreparingPlayback={isPreparingPlayback}
            hideRoutePreview={shouldHideRoutePreview}
            hideToolbar={shouldHideToolbar}
            onPlaybackFocusReady={() => {
              if (playbackPrepareTimeoutRef.current) {
                window.clearTimeout(playbackPrepareTimeoutRef.current);
                playbackPrepareTimeoutRef.current = null;
              }
              setIsPreparingPlayback(false);
              setIsPlaying(true);
            }}
            onSelectNode={handleSelectNode}
            dataLoadedSource={dataLoadedSource}
          />
        </div>

        <div className="w-[420px] max-w-[38vw] min-w-[360px] h-full border-l border-slate-800 bg-slate-950/92 backdrop-blur-xl shadow-2xl">
          <NodeMediaPanel
            node={activeNode}
            memories={activeNodeMemories}
            activeMedia={activePanelMedia}
            activeIndex={activePanelIndex}
            autoPlay={Boolean(currentAutoMedia && currentAutoMedia.keyNodeId === activeNode?.id)}
            autoAdvanceMs={currentAutoMedia ? getMediaAutoAdvanceMs(currentAutoMedia) : undefined}
            onAutoAdvance={currentAutoMedia ? handleAutoAdvance : undefined}
            onSelectMedia={handlePhotoClick}
            onPrev={handlePrevPanelMedia}
            onNext={handleNextPanelMedia}
            hasPrev={hasPrevPanelMedia}
            hasNext={hasNextPanelMedia}
          />
        </div>
      </div>

      <div
        className={`transition-all duration-500 ease-out overflow-hidden ${
          shouldHideTimeline
            ? 'max-h-0 opacity-0 translate-y-6 pointer-events-none'
            : 'max-h-64 opacity-100 translate-y-0 pointer-events-auto'
        }`}
      >
        <Timeline
          currentProgress={currentProgress}
          onProgressChange={(progress) => {
            setIsImmersiveMapMode(true);
            setCurrentProgress(progress);
          }}
          isPlaying={isPlaying || isPreparingPlayback}
          setIsPlaying={(playing) => {
            if (playing) {
              beginPlayback();
              return;
            }
            setIsPreparingPlayback(false);
            setIsPlaying(false);
          }}
          playbackSpeed={playbackSpeed}
          setPlaybackSpeed={setPlaybackSpeed}
          routesCount={totalRoutePoints}
          previewNodes={tripData.previewNodes}
          nodePositions={nodePositions}
          onSelectNode={handleSelectNode}
          activeNode={activeNode}
          currentPlaybackDay={currentPlaybackDay}
        />
      </div>

      <AnimatePresence>
        {false && viewMode === 'node-media' && currentAutoMedia && autoPlaybackNodeId && (
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
        className={`absolute top-4 right-4 z-40 px-3 py-2 rounded-full bg-slate-900/85 hover:bg-slate-800 text-slate-100 border border-slate-700 shadow-lg text-xs font-semibold backdrop-blur transition-all duration-300 ease-out ${
          shouldHideToolbar
            ? 'opacity-0 -translate-y-3 pointer-events-none'
            : 'opacity-100 translate-y-0 pointer-events-auto'
        }`}
      >
        打开路线数据控制台
      </button>
    </div>
  );
}
