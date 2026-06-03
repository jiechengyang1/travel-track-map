import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TripData, Coordinate, KeyNode, SegmentStatus } from '../types';
import { interpolateRouteCoordinate } from '../utils/routePlayback';
import { Layers, Settings, Navigation, Compass } from 'lucide-react';

interface MapContainerProps {
  tripData: TripData;
  flattenedRoute: Coordinate[];
  currentProgress: number;
  segmentStatuses: Map<string, SegmentStatus>;
  activeNode: KeyNode | null;
  onSelectNode: (node: KeyNode) => void;
  dataLoadedSource: 'default' | 'fetched';
}

declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig: any;
  }
}

export default function MapContainer({
  tripData,
  flattenedRoute,
  currentProgress,
  segmentStatuses,
  activeNode,
  onSelectNode,
  dataLoadedSource,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const nodeMarkerRefs = useRef<any[]>([]);
  const routeLineRefs = useRef<any[]>([]);
  const labelMarkerRefs = useRef<any[]>([]);
  const vehicleMarkerRef = useRef<any>(null);
  const satelliteLayerRef = useRef<any>(null);
  const lastFollowCenterRef = useRef<Coordinate | null>(null);

  const [keyInput, setKeyInput] = useState('');
  const [securityInput, setSecurityInput] = useState('');

  const [savedKey, setSavedKey] = useState(() => {
    return ((import.meta as any).env?.VITE_AMAP_KEY as string) || localStorage.getItem('amap_key') || '';
  });
  const [savedSecurity, setSavedSecurity] = useState(() => {
    return ((import.meta as any).env?.VITE_AMAP_SECURITY_KEY as string) || localStorage.getItem('amap_security_key') || '';
  });

  const [currentMapStyle, setCurrentMapStyle] = useState<string>('amap://styles/dark');
  const [showConfig, setShowConfig] = useState(false);
  const [isSavedMsg, setIsSavedMsg] = useState(false);
  const [followVehicle, setFollowVehicle] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const travelerCoord = React.useMemo<Coordinate>(() => {
    return interpolateRouteCoordinate(flattenedRoute, currentProgress);
  }, [flattenedRoute, currentProgress]);

  // --- Helper functions ---

  const clearOverlays = useCallback(() => {
    routeLineRefs.current.forEach((overlay: any) => overlay.setMap?.(null));
    labelMarkerRefs.current.forEach((overlay: any) => overlay.setMap?.(null));
    nodeMarkerRefs.current.forEach((overlay: any) => overlay.setMap?.(null));
    routeLineRefs.current = [];
    labelMarkerRefs.current = [];
    nodeMarkerRefs.current = [];
  }, []);

  const drawSegments = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.AMap) return;

    routeLineRefs.current.forEach((overlay: any) => overlay.setMap?.(null));
    routeLineRefs.current = [];

    tripData.segments.forEach((segment) => {
      const effectiveStatus = segmentStatuses.get(segment.id) || segment.status;
      const strokeColor = effectiveStatus === 'traveled' ? '#10b981' : '#64748b';
      const strokeOpacity = effectiveStatus === 'traveled' ? 0.95 : 0.78;
      const strokeStyle = effectiveStatus === 'skipped' ? 'dashed' : 'solid';
      const strokeWeight = effectiveStatus === 'traveled' ? 5 : 4;

      const shadow = new window.AMap.Polyline({
        path: segment.path,
        strokeColor: '#020617',
        strokeWeight: strokeWeight + 3,
        strokeOpacity: 0.5,
        strokeStyle,
        lineJoin: 'round',
        lineCap: 'round',
      });
      shadow.setMap(map);

      const line = new window.AMap.Polyline({
        path: segment.path,
        strokeColor,
        strokeWeight,
        strokeOpacity,
        strokeStyle,
        lineJoin: 'round',
        lineCap: 'round',
      });
      line.setMap(map);

      routeLineRefs.current.push(shadow, line);
    });

    if (routeLineRefs.current.length > 0) {
      map.setFitView(routeLineRefs.current, false, [60, 80, 60, 160]);
    }
  }, [tripData.segments, segmentStatuses]);

  const setupNodeMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.AMap) return;

    nodeMarkerRefs.current.forEach((overlay: any) => overlay.setMap?.(null));
    nodeMarkerRefs.current = [];

    tripData.previewNodes.forEach((node) => {
      const isActive = activeNode?.id === node.id;
      const markerEl = document.createElement('div');
      markerEl.className = `route-node ${isActive ? 'active' : ''}`;

      const nodeColor = node.kind === 'start'
        ? 'bg-cyan-500 border-cyan-300'
        : node.kind === 'end'
        ? 'bg-rose-500 border-rose-300'
        : 'bg-slate-700 border-slate-400';

      markerEl.innerHTML = `
        <div class="flex flex-col items-center justify-center transform -translate-y-2 group cursor-pointer">
          <div class="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-semibold ${nodeColor} ${isActive ? 'scale-110 ring-4 ring-emerald-500/20' : ''}">
            ${node.kind === 'start' ? '起' : node.kind === 'end' ? '终' : '站'}
          </div>
          <div class="mt-1 px-2 py-0.5 rounded shadow-md bg-slate-950/90 border border-slate-800 text-[10px] text-slate-100 font-medium whitespace-nowrap">
            ${node.name}
          </div>
          ${node.highlight ? `<div class="mt-1 text-[9px] text-emerald-300 bg-slate-950/80 px-1.5 py-0.5 rounded whitespace-nowrap">${node.highlight}</div>` : ''}
        </div>
      `;

      const marker = new window.AMap.Marker({
        position: node.coordinate,
        content: markerEl,
        offset: new window.AMap.Pixel(-14, -18),
        zIndex: 10,
      });

      marker.on('click', () => onSelectNode(node));
      marker.setMap(map);
      nodeMarkerRefs.current.push(marker);
    });
  }, [tripData.previewNodes, activeNode, onSelectNode]);

  const setupRoadLabel = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.AMap || flattenedRoute.length === 0) return;

    labelMarkerRefs.current.forEach((overlay: any) => overlay.setMap?.(null));
    labelMarkerRefs.current = [];

    const roadLabelEl = document.createElement('div');
    roadLabelEl.innerHTML = `
      <div class="px-3 py-1.5 rounded-full bg-slate-950/90 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold shadow-lg backdrop-blur whitespace-nowrap">
        ${tripData.roadName}
      </div>
    `;

    const roadLabelMarker = new window.AMap.Marker({
      position: flattenedRoute[Math.floor(flattenedRoute.length / 2)],
      content: roadLabelEl,
      offset: new window.AMap.Pixel(-44, -18),
      zIndex: 6,
    });

    roadLabelMarker.setMap(map);
    labelMarkerRefs.current.push(roadLabelMarker);
  }, [flattenedRoute, tripData.roadName]);

  // --- Effects ---

  useEffect(() => {
    setKeyInput(savedKey);
    setSecurityInput(savedSecurity);
  }, [savedKey, savedSecurity]);

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    const key = keyInput.trim();
    const sec = securityInput.trim();

    localStorage.setItem('amap_key', key);
    localStorage.setItem('amap_security_key', sec);

    setSavedKey(key);
    setSavedSecurity(sec);

    setIsSavedMsg(true);
    setTimeout(() => {
      setIsSavedMsg(false);
      setShowConfig(false);
      window.location.reload();
    }, 1200);
  };

  const handleClearCredentials = () => {
    localStorage.removeItem('amap_key');
    localStorage.removeItem('amap_security_key');
    setSavedKey('');
    setSavedSecurity('');
    setKeyInput('');
    setSecurityInput('');

    setIsSavedMsg(true);
    setTimeout(() => {
      setIsSavedMsg(false);
      setShowConfig(false);
      window.location.reload();
    }, 1200);
  };

  // Load AMap script
  useEffect(() => {
    const keyToLoad = savedKey || '8f5a6b5a8647a56116f8ef1dcedf3dc5';
    const securityValue = savedSecurity || '80373ab99bf461ee67ffc1f0103dd3fc';

    window._AMapSecurityConfig = {
      securityJsCode: securityValue,
    };

    if (window.AMap) {
      setMapLoaded(true);
      return;
    }

    const scriptId = 'amap-api-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const onload = () => {
      if (window.AMap) {
        setMapLoaded(true);
      } else {
        setLoadError('高德地图 JS API 加载异常，window.AMap 尚未就绪。');
      }
    };

    const onerror = () => {
      setLoadError('高德地图脚本加载失败，请检查您的网络连接或 API Key 安全白名单设置。');
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'text/javascript';
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${keyToLoad}`;
      script.addEventListener('load', onload);
      script.addEventListener('error', onerror);
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', onload);
      script.addEventListener('error', onerror);
    }

    return () => {
      script?.removeEventListener('load', onload);
      script?.removeEventListener('error', onerror);
    };
  }, [savedKey, savedSecurity]);

  // Initialize map (only when AMap loads or style changes)
  useEffect(() => {
    if (!mapLoaded || !window.AMap || !containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.destroy();
      mapRef.current = null;
      vehicleMarkerRef.current = null;
      satelliteLayerRef.current = null;
      lastFollowCenterRef.current = null;
      clearOverlays();
    }

    const initialCenter = flattenedRoute[0] || [103.9471, 30.5745];

    const map = new window.AMap.Map(containerRef.current, {
      center: initialCenter,
      zoom: 6.3,
      pitch: 45,
      rotation: -12,
      viewMode: '3D',
      mapStyle: currentMapStyle === 'satellite' ? 'amap://styles/normal' : currentMapStyle,
    });

    mapRef.current = map;

    map.on('complete', () => {
      drawSegments();
      setupNodeMarkers();
      setupRoadLabel();
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
        vehicleMarkerRef.current = null;
        satelliteLayerRef.current = null;
        clearOverlays();
      }
    };
  }, [mapLoaded, currentMapStyle]);

  // Update overlays and traveler position when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.AMap) return;

    drawSegments();
    setupNodeMarkers();

    if (!vehicleMarkerRef.current) {
      const vEl = document.createElement('div');
      vEl.className = 'traveler-avatar z-30 transition-all';
      vEl.innerHTML = `
        <div class="relative flex items-center justify-center h-14 w-14">
          <span class="absolute inline-flex h-11 w-11 rounded-full bg-emerald-400 opacity-60 animate-ping"></span>
          <span class="relative inline-flex rounded-full h-10 w-10 bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center">
            <span class="text-xl">🚗</span>
          </span>
        </div>
      `;

      vehicleMarkerRef.current = new window.AMap.Marker({
        position: travelerCoord,
        content: vEl,
        offset: new window.AMap.Pixel(-28, -28),
        zIndex: 100,
      });
      vehicleMarkerRef.current.setMap(map);
    } else {
      vehicleMarkerRef.current.setPosition(travelerCoord);
    }

    if (followVehicle) {
      const lastCenter = lastFollowCenterRef.current;
      const movedFarEnough = !lastCenter ||
        Math.abs(lastCenter[0] - travelerCoord[0]) > 0.02 ||
        Math.abs(lastCenter[1] - travelerCoord[1]) > 0.02;

      if (movedFarEnough) {
        map.setCenter(travelerCoord);
        lastFollowCenterRef.current = travelerCoord;
      }
    }
  }, [travelerCoord, followVehicle, tripData, segmentStatuses, flattenedRoute, drawSegments, setupNodeMarkers]);

  // Satellite layer toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.AMap) return;

    if (currentMapStyle === 'satellite') {
      if (!satelliteLayerRef.current) {
        satelliteLayerRef.current = new window.AMap.TileLayer.Satellite();
        map.add([satelliteLayerRef.current]);
      } else {
        satelliteLayerRef.current.show();
      }
    } else {
      if (satelliteLayerRef.current) {
        satelliteLayerRef.current.hide();
      }
      map.setMapStyle(currentMapStyle);
    }
  }, [currentMapStyle, mapLoaded]);

  return (
    <div className="flex-1 relative bg-slate-950 overflow-hidden h-full flex flex-col min-h-[350px]">
      <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 pointer-events-auto">
        <button
          id="btn-toggle-follow-view"
          onClick={() => setFollowVehicle(!followVehicle)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur border transition ${
            followVehicle
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700/60'
          }`}
          title="开启/关闭跟随视角，播放时摄像头会自动跟随模拟车辆移动"
        >
          <Navigation size={13} className={followVehicle ? 'rotate-45 fill-slate-950' : 'text-slate-400'} />
          <span>{followVehicle ? '正在跟随车辆 🚗' : '自主环视视角'}</span>
        </button>

        <button
          id="btn-toggle-map-settings"
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition backdrop-blur"
        >
          <Layers size={13} className="text-slate-400" />
          <span>设置地图瓦片</span>
        </button>
      </div>

      <div className="absolute top-4 right-20 z-20 pointer-events-auto">
        <div
          onClick={() => setShowConfig(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-medium shadow-lg hover:brightness-110 cursor-pointer backdrop-blur border ${
            savedKey
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${savedKey ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
          <span>{savedKey ? '高德 3D 专属密钥态' : '高德 3D 演示共享态'}</span>
        </div>
      </div>

      {showConfig && (
        <div className="absolute top-16 left-4 z-30 max-w-sm w-full bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-2xl pointer-events-auto text-slate-200 font-sans">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Settings size={14} />
              <span>高德地图服务设置</span>
            </h4>
            <button
              id="btn-close-map-settings"
              onClick={() => setShowConfig(false)}
              className="text-xs text-slate-500 hover:text-white transition"
            >
              关闭
            </button>
          </div>

          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1 justify-between">
                <span>高德 Web 端 JS API Key (钥匙)</span>
                <a
                  href="https://lbs.amap.com/dev/key/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-0.5 text-[10px]"
                >
                  免费申请 <Compass size={10} />
                </a>
              </label>
              <div className="relative">
                <input
                  id="input-amap-key"
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                  placeholder="输入高德控制台申请的 JS API Key"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400">安全密钥 Security JsCode</label>
              <input
                id="input-amap-security"
                type="password"
                value={securityInput}
                onChange={(e) => setSecurityInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                placeholder="输入安全密钥 Security JsCode"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400">地图瓦片风格</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'amap://styles/dark', label: '深色 3D' },
                  { value: 'amap://styles/normal', label: '标准 2D' },
                  { value: 'satellite', label: '卫星影像' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setCurrentMapStyle(opt.value);
                      setShowConfig(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                      currentMapStyle === opt.value
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                id="btn-save-amap-credentials"
                type="submit"
                className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 transition"
              >
                保存并刷新地图
              </button>
              <button
                id="btn-clear-amap-credentials"
                type="button"
                onClick={handleClearCredentials}
                className="px-3 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition"
              >
                清空
              </button>
            </div>
          </form>

          {isSavedMsg && (
            <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs px-3 py-2">
              地图凭据已更新，正在刷新视图…
            </div>
          )}

          {loadError && (
            <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 text-xs px-3 py-2 leading-relaxed">
              {loadError}
            </div>
          )}
        </div>
      )}

      <div className="absolute left-4 bottom-44 z-20 max-w-sm bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl px-4 py-3 text-slate-200">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">路线预览</div>
        <div className="mt-1 text-sm font-semibold text-white">{tripData.roadName}</div>
        <div className="mt-1 text-xs text-slate-400 leading-relaxed">{tripData.description}</div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-300">起点：{tripData.previewNodes.find((node) => node.kind === 'start')?.name}</span>
          <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-300">终点：{tripData.previewNodes.find((node) => node.kind === 'end')?.name}</span>
          <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">数据源：{dataLoadedSource === 'fetched' ? 'trip.json' : '内置示例'}</span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1" id="amap-render-container" />
    </div>
  );
}