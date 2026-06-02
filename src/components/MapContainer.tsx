import React, { useEffect, useRef, useState } from 'react';
import { TripData, Waypoint } from '../types';
import { Layers, Settings, Navigation, Key, HelpCircle, Check, Compass, ShieldCheck } from 'lucide-react';

interface MapContainerProps {
  tripData: TripData;
  currentProgress: number; // Index along routes
  visitedWaypointIds: Set<string>;
  onProgressChange: (progress: number) => void;
  activeWaypoint: Waypoint | null;
  onSelectWaypoint: (waypoint: Waypoint) => void;
}

declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig: any;
  }
}

export default function MapContainer({
  tripData,
  currentProgress,
  visitedWaypointIds,
  onProgressChange,
  activeWaypoint,
  onSelectWaypoint,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRefsRef = useRef<any[]>([]);
  const vehicleMarkerRef = useRef<any>(null);
  const passedRouteRef = useRef<any>(null);
  const remainingRouteRef = useRef<any>(null);
  const polylineShadowRef = useRef<any>(null);
  const satelliteLayerRef = useRef<any>(null);

  // States for Amap API Credentials
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

  // Sync state values to form inputs
  useEffect(() => {
    setKeyInput(savedKey);
    setSecurityInput(savedSecurity);
  }, [savedKey, savedSecurity]);

  // Interpolated traveler coordinate
  const travelerCoord = React.useMemo<[number, number]>(() => {
    const r = tripData.routes;
    if (!r || r.length === 0) return [116.397428, 39.90923]; // Fallback to Beijing Tiananmen
    
    const maxIdx = r.length - 1;
    const progress = Math.max(0, Math.min(maxIdx, currentProgress));
    
    const idxFloor = Math.floor(progress);
    const idxCeil = Math.ceil(progress);
    
    if (idxFloor === idxCeil) {
      return r[idxFloor];
    }
    
    const fract = progress - idxFloor;
    const p1 = r[idxFloor];
    const p2 = r[idxCeil];
    
    const lng = p1[0] + (p2[0] - p1[0]) * fract;
    const lat = p1[1] + (p2[1] - p1[1]) * fract;
    
    return [lng, lat];
  }, [tripData.routes, currentProgress]);

  // Handle Save Credentials
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

  // Dynamic API script builder
  useEffect(() => {
    const keyToLoad = savedKey || '8f5a6b5a8647a56116f8ef1dcedf3dc5'; // Premium Fallback developer preview key
    const securityValue = savedSecurity || '80373ab99bf461ee67ffc1f0103dd3fc'; // Matching security string
    
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

  // Main Map Ground Setup
  useEffect(() => {
    if (!mapLoaded || !window.AMap || !containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.destroy();
      mapRef.current = null;
      vehicleMarkerRef.current = null;
      satelliteLayerRef.current = null;
      passedRouteRef.current = null;
      remainingRouteRef.current = null;
      polylineShadowRef.current = null;
      markerRefsRef.current = [];
    }

    const initialCenter = tripData.routes[0] || [120.153576, 30.287459]; // Fallback to West Lake, Hangzhou

    const map = new window.AMap.Map(containerRef.current, {
      center: initialCenter,
      zoom: 10,
      pitch: 45,
      rotation: -10,
      viewMode: '3D',
      mapStyle: currentMapStyle === 'satellite' ? 'amap://styles/normal' : currentMapStyle,
    });

    mapRef.current = map;

    // Draw route lines once map is configured
    map.on('complete', () => {
      drawTravelRoutes();
      setupInteractiveOverlays();
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [mapLoaded, currentMapStyle]);

  // Setup interactive waypoint layers & custom overlays
  const setupInteractiveOverlays = () => {
    const map = mapRef.current;
    if (!map || !window.AMap) return;

    // Clear previous overlays safely
    markerRefsRef.current.forEach((m) => m.setMap(null));
    markerRefsRef.current = [];

    // Redraw linear tracks
    drawTravelRoutes();

    // Map each spot to custom styled AMap.Marker inside GCJ-02 coordinates
    tripData.waypoints.forEach((wp) => {
      const isSelected = activeWaypoint?.id === wp.id;
      const isVisited = visitedWaypointIds.has(wp.id);
      const markerEl = document.createElement('div');
      markerEl.className = `custom-marker ${isSelected ? 'active' : ''}`;

      let categoryColor = isVisited ? 'bg-emerald-500' : 'bg-slate-500';
      let categoryBorder = isVisited ? 'border-emerald-400' : 'border-slate-400';
      let categoryIcon = '📍';

      if (wp.category === 'hotel') {
        categoryIcon = '🏨';
      } else if (wp.category === 'dining') {
        categoryIcon = '🍲';
      } else if (wp.category === 'transit') {
        categoryIcon = '🚗';
      }

      markerEl.innerHTML = `
        <div class="flex flex-col items-center justify-center transform -translate-y-2 group cursor-pointer">
          <!-- Pulse ripple back effect -->
          <div class="absolute w-5 h-5 rounded-full ${categoryColor}/40 animate-ping -z-10 group-hover:scale-125"></div>
          <!-- Custom Base Bubble -->
          <div class="w-6 h-6 rounded-full border-2 border-white text-md flex items-center justify-center shadow-lg transition duration-200 transform hover:scale-110 ${categoryColor} text-white">
            <span class="text-[10px] font-semibold leading-none">${categoryIcon}</span>
          </div>
          <!-- Pin title box -->
          <div class="mt-1 px-1.5 py-0.5 rounded shadow-md bg-slate-900/90 border border-slate-800 text-[10px] text-slate-100 font-medium whitespace-nowrap opacity-75 group-hover:opacity-100 transition duration-150">
            ${wp.name}
          </div>
        </div>
      `;

      // Mount into Amap
      const marker = new window.AMap.Marker({
        position: wp.coordinate,
        content: markerEl,
        offset: new window.AMap.Pixel(-12, -12),
        extData: wp,
        zIndex: 10,
      });

      marker.on('click', () => {
        onSelectWaypoint(wp);
      });

      marker.setMap(map);
      markerRefsRef.current.push(marker);
    });
  };

  // Redraw path routes
  const drawTravelRoutes = () => {
    const map = mapRef.current;
    if (!map || !window.AMap || tripData.routes.length === 0) return;

    const clampedProgress = Math.max(0, Math.min(tripData.routes.length - 1, currentProgress));
    const progressIndex = Math.floor(clampedProgress);
    const nextIndex = Math.min(progressIndex + 1, tripData.routes.length - 1);
    const splitPoint = tripData.routes[nextIndex] || tripData.routes[progressIndex];
    const passedRoutes = [
      ...tripData.routes.slice(0, progressIndex + 1),
      splitPoint,
    ];
    const remainingRoutes = [
      splitPoint,
      ...tripData.routes.slice(nextIndex + 1),
    ];

    if (passedRouteRef.current) passedRouteRef.current.setMap(null);
    if (remainingRouteRef.current) remainingRouteRef.current.setMap(null);
    if (polylineShadowRef.current) polylineShadowRef.current.setMap(null);

    // Deep casing shadow line underneath
    polylineShadowRef.current = new window.AMap.Polyline({
      path: tripData.routes,
      strokeColor: '#020617',
      strokeWeight: 8,
      strokeOpacity: 0.60,
      strokeStyle: 'solid',
      lineJoin: 'round',
      lineCap: 'round',
    });
    polylineShadowRef.current.setMap(map);

    // Muted remaining route
    remainingRouteRef.current = new window.AMap.Polyline({
      path: remainingRoutes,
      strokeColor: '#475569',
      strokeWeight: 4.5,
      strokeOpacity: 0.70,
      strokeStyle: 'solid',
      lineJoin: 'round',
      lineCap: 'round',
    });
    remainingRouteRef.current.setMap(map);

    // Highlighted passed route
    passedRouteRef.current = new window.AMap.Polyline({
      path: passedRoutes,
      strokeColor: '#10b981',
      strokeWeight: 4.5,
      strokeOpacity: 0.95,
      strokeStyle: 'solid',
      lineJoin: 'round',
      lineCap: 'round',
    });
    passedRouteRef.current.setMap(map);

    // Auto fit viewport bounds
    map.setFitView([polylineShadowRef.current], false, [50, 50, 50, 50]);
  };

  const updateTravelRoutesProgress = () => {
    if (!passedRouteRef.current || !remainingRouteRef.current || tripData.routes.length === 0) return;

    const clampedProgress = Math.max(0, Math.min(tripData.routes.length - 1, currentProgress));
    const progressIndex = Math.floor(clampedProgress);
    const nextIndex = Math.min(progressIndex + 1, tripData.routes.length - 1);
    const progressFraction = clampedProgress - progressIndex;
    const currentPoint = tripData.routes[progressIndex];
    const nextPoint = tripData.routes[nextIndex];

    if (!currentPoint || !nextPoint) return;

    const splitPoint: [number, number] = progressIndex === nextIndex
      ? currentPoint
      : [
          currentPoint[0] + (nextPoint[0] - currentPoint[0]) * progressFraction,
          currentPoint[1] + (nextPoint[1] - currentPoint[1]) * progressFraction,
        ];

    const passedRoutes = [
      ...tripData.routes.slice(0, progressIndex + 1),
      splitPoint,
    ];
    const remainingRoutes = [
      splitPoint,
      ...tripData.routes.slice(nextIndex + 1),
    ];

    passedRouteRef.current.setPath(passedRoutes);
    remainingRouteRef.current.setPath(remainingRoutes);
  };

  // Monitor waypoints updates
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      setupInteractiveOverlays();
    }
  }, [tripData, activeWaypoint, mapLoaded, visitedWaypointIds]);

  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      updateTravelRoutesProgress();
    }
  }, [currentProgress, mapLoaded, tripData.routes]);

  // Handle Satellite Base layer updates
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

  // Synchronize traveler avatar location marker & center view
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.AMap) return;

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
      map.setCenter(travelerCoord);
    }
  }, [travelerCoord, followVehicle]);

  // Direct Fly and sync progress when active spot changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeWaypoint || !window.AMap) return;

    // Use setStatus for smooth 3D fly transition
    map.setStatus({
      center: activeWaypoint.coordinate,
      zoom: 12.5,
      pitch: 55,
      rotation: 15,
    }, true, 1800); // dynamic animated in 1800ms

    // Locate closest index tracker in route list to snap chronological tracker line position!
    let closestIndex = 0;
    let minDistance = Infinity;
    const [tLng, tLat] = activeWaypoint.coordinate;
    
    tripData.routes.forEach((coord, i) => {
      const dist = Math.sqrt(Math.pow(coord[0] - tLng, 2) + Math.pow(coord[1] - tLat, 2));
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    });

    // Snap slider value non-intrusively
    onProgressChange(closestIndex);
  }, [activeWaypoint]);

  return (
    <div className="flex-1 relative bg-slate-950 overflow-hidden h-full flex flex-col min-h-[350px]">
      
      {/* Absolute HUD Header Overlay */}
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

      {/* Floating State Mode Badge */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto">
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

      {/* Amap Settings Panel overlay */}
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
            {/* Key Prompt */}
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
                  placeholder="a1b2c3d4e5f6g7h8..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-slate-700"
                />
                <Key className="absolute right-2.5 top-2.5 text-slate-550" size={13} />
              </div>
            </div>

            {/* Security Config Code */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1 justify-between">
                <span>高德地图安全密钥 (Security Code)</span>
              </label>
              
              <div className="relative">
                <input
                  id="input-amap-security"
                  type="password"
                  value={securityInput}
                  onChange={(e) => setSecurityInput(e.target.value)}
                  placeholder="2021年12月后新Key需要配套此密钥"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-slate-700"
                />
                <ShieldCheck className="absolute right-2.5 top-2.5 text-slate-550" size={13} />
              </div>

              <p className="text-[10px] text-slate-500 leading-normal">
                粘贴您的专属高德控制台 Web API (JS API 2.0) 参数，以便在国内各大主流环境下无限制加载。参数存储于本地 <code>localStorage</code>，保障隐私安全。
              </p>
            </div>

            {/* Form actions */}
            <div className="flex gap-2 justify-end">
              {savedKey && (
                <button
                  id="btn-clear-credentials"
                  type="button"
                  onClick={handleClearCredentials}
                  className="px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition"
                >
                  清除专属 Key
                </button>
              )}
              
              <button
                id="btn-save-credentials"
                type="submit"
                className="px-3.5 py-1.5 text-xs bg-emerald-500 font-bold text-slate-950 rounded-lg hover:bg-emerald-400 transition hover:scale-[1.01] flex items-center gap-1"
              >
                {isSavedMsg ? <Check size={12} /> : null}
                <span>{isSavedMsg ? '保存成功并重载' : '应用保存修改'}</span>
              </button>
            </div>

            <div className="h-px bg-slate-800/60 my-2" />

            {/* Tile Style Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">图层底图样式：</label>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {[
                  { id: 'amap://styles/dark', label: '幻影黑色 (幻影深沉 推荐)' },
                  { id: 'amap://styles/light', label: '优雅灰白 (雅士优雅 细致)' },
                  { id: 'amap://styles/whitesmoke', label: '极简底色 (极简低对比度)' },
                  { id: 'amap://styles/normal', label: '高德标准 (标准彩图 实用)' },
                  { id: 'satellite', label: '卫星混合 (高配卫星 混合线路)' }
                ].map((choice) => (
                  <button
                    id={`map-style-choice-${choice.id}`}
                    key={choice.id}
                    type="button"
                    onClick={() => setCurrentMapStyle(choice.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition flex items-center justify-between ${
                      currentMapStyle === choice.id
                        ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700/60 shadow'
                        : 'hover:bg-slate-850/50 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <span>{choice.label}</span>
                    {currentMapStyle === choice.id && <Check size={12} />}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Loading Loader State Overlay */}
      {!mapLoaded && !loadError && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-slate-350">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-t-2 border-emerald-400 animate-spin"></div>
            <p className="text-xs font-mono tracking-wide text-slate-400 font-medium">
              正在初始化高德地图高精度 (3D) 三维引擎...
            </p>
          </div>
        </div>
      )}

      {/* Loader Error Handler Overlay */}
      {loadError && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 border border-red-950 p-6 text-center text-slate-300">
          <div className="max-w-md space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-900/20 border border-red-500/40 text-red-500 flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <p className="text-sm font-semibold">{loadError}</p>
            <p className="text-xs text-slate-500">
              提示：高德新版本 API Key 需要配制其专属安全校验密钥才能在国内域名解析。您也可以点击右下角设置专属配置，或尝试使用默认公用调试配置。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-white rounded-lg transition"
            >
              重新连接加载
            </button>
          </div>
        </div>
      )}

      {/* Map Canvas Wrapper Container */}
      <div 
        ref={containerRef} 
        id="amap-canvas-container"
        className="w-full flex-1 h-full z-10" 
      />

    </div>
  );
}
