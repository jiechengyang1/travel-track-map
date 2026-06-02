import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TripData, Waypoint, Photo } from './types';
import { defaultTrip } from './data/defaultTrip';
import MapContainer from './components/MapContainer';
import Timeline from './components/Timeline';
import Sidebar from './components/Sidebar';
import PhotoLightbox from './components/PhotoLightbox';
import DataController from './components/DataController';

export default function App() {
  // 1. Data Schema Base State
  const [tripData, setTripData] = useState<TripData>(defaultTrip);
  const [dataLoadedSource, setDataLoadedSource] = useState<'default' | 'fetched'>('default');

  // 2. Playback state
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // 3. Selection focus state
  const [activeWaypoint, setActiveWaypoint] = useState<Waypoint | null>(null);
  
  // 4. Modal and Layer visual states
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  const [activePhotoWaypoint, setActivePhotoWaypoint] = useState<Waypoint | null>(null);
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);

  // Fetch true dynamic trip.json on start
  useEffect(() => {
    const fetchTripJson = async () => {
      try {
        const response = await fetch('trip.json');
        if (response.ok) {
          const parsed = await response.json();
          // Simple key structure validator
          if (parsed.tripName && Array.isArray(parsed.waypoints)) {
            setTripData(parsed);
            setDataLoadedSource('fetched');
            // Select first waypoint. Same behavior as user navigation
            if (parsed.waypoints.length > 0) {
              setActiveWaypoint(parsed.waypoints[0]);
            }
          }
        } else {
          console.log('未找到默认部署的 trip.json 配置文件，使用内置云南高保真演示数据。');
          // Select default
          if (defaultTrip.waypoints.length > 0) {
            setActiveWaypoint(defaultTrip.waypoints[0]);
          }
        }
      } catch (e) {
        console.warn('获取 trip.json 失败或跨域被拦截，已自动启动内置路线引擎:', e);
        if (defaultTrip.waypoints.length > 0) {
          setActiveWaypoint(defaultTrip.waypoints[0]);
        }
      }
    };

    fetchTripJson();
  }, []);

  // Sync animation ticking delta calculations (Frame loop)
  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const routesCount = tripData.routes.length;

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      setCurrentProgress((prev) => {
        // Delta time progressive stepping - completely FPS-independent scale
        const step = 0.85 * playbackSpeed * delta;
        const next = prev + step;
        
        if (next >= routesCount - 1) {
          setIsPlaying(false);
          return routesCount - 1; // Cap at path terminal end
        }
        return next;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, playbackSpeed, tripData.routes.length]);

  // Waypoints selector handler
  const handleSelectWaypoint = useCallback((wp: Waypoint) => {
    setActiveWaypoint(wp);
  }, []);

  // Update trip state changes from controller
  const handleUpdateTripData = useCallback((newData: TripData) => {
    setTripData(newData);
    setCurrentProgress(0);
    setIsPlaying(false);
    if (newData.waypoints.length > 0) {
      setActiveWaypoint(newData.waypoints[0]);
    } else {
      setActiveWaypoint(null);
    }
  }, []);

  // Triggering photo detailed lightbox
  const handlePhotoClick = useCallback((photo: Photo, wp: Waypoint) => {
    // Inject position tags if missing to enhance spatial link inside lightbox
    const enriched: Photo = {
      ...photo,
      locationName: wp.name,
      coordinates: wp.coordinate
    };
    setActivePhoto(enriched);
    setActivePhotoWaypoint(wp);
  }, []);

  // Lightbox Slide Navigators
  const waypointPhotos = useMemo(() => {
    return activePhotoWaypoint?.photos || [];
  }, [activePhotoWaypoint]);

  const activePhotoIndex = useMemo(() => {
    if (!activePhoto) return -1;
    return waypointPhotos.findIndex(p => p.url === activePhoto.url);
  }, [waypointPhotos, activePhoto]);

  const hasPrevPhoto = activePhotoIndex > 0;
  const hasNextPhoto = activePhotoIndex !== -1 && activePhotoIndex < waypointPhotos.length - 1;

  const handlePrevPhoto = useCallback(() => {
    if (hasPrevPhoto && activePhotoWaypoint) {
      const targetPhoto = waypointPhotos[activePhotoIndex - 1];
      setActivePhoto({
        ...targetPhoto,
        locationName: activePhotoWaypoint.name,
        coordinates: activePhotoWaypoint.coordinate
      });
    }
  }, [hasPrevPhoto, activePhotoIndex, waypointPhotos, activePhotoWaypoint]);

  const handleNextPhoto = useCallback(() => {
    if (hasNextPhoto && activePhotoWaypoint) {
      const targetPhoto = waypointPhotos[activePhotoIndex + 1];
      setActivePhoto({
        ...targetPhoto,
        locationName: activePhotoWaypoint.name,
        coordinates: activePhotoWaypoint.coordinate
      });
    }
  }, [hasNextPhoto, activePhotoIndex, waypointPhotos, activePhotoWaypoint]);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-slate-950 overflow-hidden font-sans select-none antialiased">
      
      {/* 1. Sidebar Panel: Scenic Spots Chronology timeline */}
      <Sidebar
        tripName={tripData.tripName}
        tripDesc={tripData.description}
        waypoints={tripData.waypoints}
        activeWaypoint={activeWaypoint}
        onSelectWaypoint={handleSelectWaypoint}
        onPhotoClick={handlePhotoClick}
        totalDistance={tripData.totalDistance}
        startDate={tripData.startDate}
        endDate={tripData.endDate}
        onOpenImporter={() => setIsImporterOpen(true)}
      />

      {/* 2. Map & Timeline Layout Column */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Upper Mapbox container */}
        <MapContainer
          tripData={tripData}
          currentProgress={currentProgress}
          onProgressChange={setCurrentProgress}
          activeWaypoint={activeWaypoint}
          onSelectWaypoint={handleSelectWaypoint}
        />

        {/* Bottom Horizontal HUD Scrubbing Timeline */}
        <Timeline
          currentProgress={currentProgress}
          onProgressChange={setCurrentProgress}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          playbackSpeed={playbackSpeed}
          setPlaybackSpeed={setPlaybackSpeed}
          routesCount={tripData.routes.length}
          waypoints={tripData.waypoints}
          onSelectWaypoint={handleSelectWaypoint}
          activeWaypoint={activeWaypoint}
        />
        
      </div>

      {/* Photo Lightbox Dialog */}
      <PhotoLightbox
        photo={activePhoto}
        onClose={() => {
          setActivePhoto(null);
          setActivePhotoWaypoint(null);
        }}
        onPrev={handlePrevPhoto}
        onNext={handleNextPhoto}
        hasPrev={hasPrevPhoto}
        hasNext={hasNextPhoto}
      />

      {/* JSON importer/editor setup controller */}
      <DataController
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        tripData={tripData}
        onUpdateTripData={handleUpdateTripData}
      />

    </div>
  );
}
