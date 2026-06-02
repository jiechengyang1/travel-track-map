import React, { useEffect } from 'react';
import { Waypoint, Photo } from '../types';
import { MapPin, Compass, Eye, Heart, Camera, Upload, Award, Footprints } from 'lucide-react';

interface SidebarProps {
  tripName: string;
  tripDesc: string;
  waypoints: Waypoint[];
  activeWaypoint: Waypoint | null;
  playbackWaypoint: Waypoint | null;
  isPlaying: boolean;
  visitedWaypointIds: Set<string>;
  onSelectWaypoint: (waypoint: Waypoint) => void;
  onPhotoClick: (photo: Photo, waypoint: Waypoint) => void;
  totalDistance: string;
  startDate: string;
  endDate: string;
  onOpenImporter: () => void;
}

export default function Sidebar({
  tripName,
  tripDesc,
  waypoints,
  activeWaypoint,
  playbackWaypoint,
  isPlaying,
  visitedWaypointIds,
  onSelectWaypoint,
  onPhotoClick,
  totalDistance,
  startDate,
  endDate,
  onOpenImporter,
}: SidebarProps) {

  useEffect(() => {
    if (!activeWaypoint) return;

    const cardEl = document.getElementById(`waypoint-card-${activeWaypoint.id}`);
    cardEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeWaypoint]);

  useEffect(() => {
    if (!isPlaying || !playbackWaypoint) return;

    const cardEl = document.getElementById(`waypoint-card-${playbackWaypoint.id}`);
    cardEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [isPlaying, playbackWaypoint]);

  // Category visual customizers
  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'scenic':
        return {
          bg: 'bg-emerald-550/10 border-emerald-500/20 text-emerald-400',
          dot: 'bg-emerald-400 ring-emerald-500/10',
          label: '景区景点'
        };
      case 'dining':
        return {
          bg: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
          dot: 'bg-orange-400 ring-orange-500/10',
          label: '特色餐饮'
        };
      case 'hotel':
        return {
          bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
          dot: 'bg-indigo-400 ring-indigo-500/10',
          label: '野奢酒店'
        };
      default:
        return {
          bg: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
          dot: 'bg-slate-400 ring-slate-500/10',
          label: '中途交通'
        };
    }
  };

  return (
    <div className="w-full lg:w-[420px] bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden text-slate-100 shrink-0">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="text-emerald-400 animate-spin-slow" size={20} />
            <span className="text-xs font-mono tracking-wider text-emerald-400 uppercase font-semibold">TRAVEL TRACK MAP</span>
          </div>
          <button
            id="btn-open-importer"
            onClick={onOpenImporter}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded font-medium bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 transition shadow hover:border-slate-700"
          >
            <Upload size={12} />
            <span>数据导入/导出</span>
          </button>
        </div>

        <div className="group">
          <h1 className="text-lg font-bold font-display tracking-tight text-white group-hover:text-emerald-400 transition-colors">
            {tripName}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 font-mono">
            <span>📅 {startDate} 至 {endDate}</span>
            <span className="w-1 h-1 bg-slate-800 rounded-full" />
            <span className="flex items-center gap-0.5 text-emerald-400">
              <Footprints size={12} />
              <b className="font-semibold">{totalDistance}</b>
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed max-h-[80px] overflow-y-auto pr-1">
          {tripDesc}
        </p>
      </div>

      {/* Chronological Scenic Spots List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6" id="scenic-spots-timeline-list">
        <div className="relative border-l border-slate-800 pl-5 space-y-8 py-2">
          {waypoints.map((wp, idx) => {
            const isActive = activeWaypoint?.id === wp.id;
            const isVisited = visitedWaypointIds.has(wp.id);
            const theme = getCategoryTheme(wp.category);

            return (
              <div
                id={`waypoint-card-${wp.id}`}
                key={wp.id}
                className="relative group cursor-pointer transition-all duration-300"
                onClick={() => onSelectWaypoint(wp)}
              >
                {/* Timeline connector circle dot */}
                <span className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ring-4 ${
                  isActive
                    ? 'bg-red-500 border-slate-900 ring-red-500/20 scale-125 z-10'
                    : isVisited
                    ? 'bg-emerald-400 border-slate-900 ring-emerald-500/20'
                    : 'bg-slate-600 border-slate-900 ring-transparent group-hover:border-slate-400'
                }`} />

                {/* Day flag floating pill */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                      DAY {wp.day} &nbsp;{wp.time}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] rounded-full border ${theme.bg} font-medium`}>
                      {theme.label}
                    </span>
                  </div>
                  {wp.rating && (
                    <div className="flex items-center gap-0.5 text-[10px] text-amber-400 font-mono font-medium">
                      <Award size={10} className="fill-amber-400" />
                      <span>{wp.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Main Card */}
                <div className={`p-4 rounded-xl border transition-all duration-300 ${
                  isActive
                    ? 'bg-slate-850/90 border-slate-700 shadow-xl shadow-slate-950/40 translate-x-1'
                    : 'bg-slate-900/40 border-slate-850/80 hover:bg-slate-850/40 hover:border-slate-800'
                }`}>
                  {/* Spot title and fly indicator */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-sm font-semibold tracking-tight transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-slate-200 group-hover:text-emerald-400'
                    }`}>
                      {wp.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      {wp.elevation && <span>🏔️ {wp.elevation}m</span>}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 leading-relaxed mb-3 whitespace-pre-wrap">
                    {wp.description}
                  </p>

                  {/* Spot mini photo layout */}
                  {wp.photos && wp.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {wp.photos.map((p, pIdx) => (
                        <div
                          id={`photo-thumb-wp-${wp.id}-${pIdx}`}
                          key={p.url + pIdx}
                          onClick={(e) => {
                            e.stopPropagation(); // Avoid triggering card click
                            onPhotoClick(p, wp);
                          }}
                          className="relative aspect-square rounded-lg overflow-hidden group/photo ring-1 ring-slate-800 bg-slate-950 hover:ring-emerald-400/50 transition-all duration-300 cursor-zoom-in"
                        >
                          <img
                            src={p.url}
                            alt={p.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              if (wp.category === 'hotel') {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
                              } else if (wp.category === 'dining') {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80";
                              } else {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80";
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye size={12} className="text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Simple footer with status checks */}
      <div className="p-4 bg-slate-950/40 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-500 font-mono shrink-0">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          <span>轨迹地图数据已加载</span>
        </span>
        <span>共辖 {waypoints.length} 个落脚点</span>
      </div>
    </div>
  );
}
