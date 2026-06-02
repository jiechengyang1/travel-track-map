import React, { useState } from 'react';
import { X, HelpCircle, Code, Edit, Sparkles, Download, Check, AlertCircle, FileJson, CornerDownRight, Plus, Trash2 } from 'lucide-react';
import { TripData, Waypoint } from '../types';

interface DataControllerProps {
  isOpen: boolean;
  onClose: () => void;
  tripData: TripData;
  onUpdateTripData: (newData: TripData) => void;
}

export default function DataController({
  isOpen,
  onClose,
  tripData,
  onUpdateTripData,
}: DataControllerProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'editor' | 'deploy'>('import');
  
  // JSON state
  const [rawJsonText, setRawJsonText] = useState(() => JSON.stringify(tripData, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSuccessImport, setIsSuccessImport] = useState(false);

  // Editor Spot States
  const [selectedEditIndex, setSelectedEditIndex] = useState<number>(0);
  const selectedWaypoint = tripData.waypoints[selectedEditIndex] || null;

  // Editor Inputs
  const [wpName, setWpName] = useState('');
  const [wpDesc, setWpDesc] = useState('');
  const [wpDay, setWpDay] = useState(1);
  const [wpTime, setWpTime] = useState('12:00');
  const [wpLng, setWpLng] = useState(100.0);
  const [wpLat, setWpLat] = useState(27.0);
  const [wpElev, setWpElev] = useState(3000);
  const [wpCategory, setWpCategory] = useState<'scenic' | 'dining' | 'hotel' | 'transit'>('scenic');
  const [wpRating, setWpRating] = useState(5.0);

  // Load waypoint fields on selection
  React.useEffect(() => {
    if (selectedWaypoint) {
      setWpName(selectedWaypoint.name);
      setWpDesc(selectedWaypoint.description);
      setWpDay(selectedWaypoint.day);
      setWpTime(selectedWaypoint.time);
      setWpLng(selectedWaypoint.coordinate[0]);
      setWpLat(selectedWaypoint.coordinate[1]);
      setWpElev(selectedWaypoint.elevation || 3000);
      setWpCategory(selectedWaypoint.category);
      setWpRating(selectedWaypoint.rating || 5.0);
    }
  }, [selectedWaypoint, selectedEditIndex]);

  if (!isOpen) return null;

  // Handle drag and drop upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        validateAndApply(parsed);
      } catch (err: any) {
        setJsonError(`文件解析失败: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyRawJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      validateAndApply(parsed);
    } catch (err: any) {
      setJsonError(`JSON 语法错误: ${err.message}`);
    }
  };

  const validateAndApply = (data: any) => {
    if (!data.tripName || !data.waypoints || !Array.isArray(data.waypoints)) {
      setJsonError('无效的 trip.json 格式。缺少 tripName 或者是 waypoints 数据格式不正确。');
      return;
    }
    
    // Ensure coordinates and arrays are consistent
    const cleanedWaypoints = data.waypoints.map((wp: any, i: number) => ({
      id: wp.id || `wp-${Date.now()}-${i}`,
      name: wp.name || `未命名景点 ${i + 1}`,
      day: Number(wp.day) || 1,
      time: wp.time || '12:00',
      coordinate: Array.isArray(wp.coordinate) ? [Number(wp.coordinate[0]), Number(wp.coordinate[1])] : [100, 27],
      description: wp.description || '',
      category: wp.category || 'scenic',
      rating: wp.rating !== undefined ? Number(wp.rating) : 5,
      elevation: wp.elevation ? Number(wp.elevation) : undefined,
      distanceFromStart: wp.distanceFromStart ? Number(wp.distanceFromStart) : undefined,
      photos: Array.isArray(wp.photos) ? wp.photos : []
    }));

    const cleanedRoutes = Array.isArray(data.routes) ? data.routes : cleanedWaypoints.map((w: any) => w.coordinate);

    const validatedTrip: TripData = {
      tripName: data.tripName,
      startDate: data.startDate || 'YYYY-MM-DD',
      endDate: data.endDate || 'YYYY-MM-DD',
      totalDistance: data.totalDistance || '未知',
      description: data.description || '',
      routes: cleanedRoutes,
      waypoints: cleanedWaypoints,
    };

    onUpdateTripData(validatedTrip);
    setRawJsonText(JSON.stringify(validatedTrip, null, 2));
    setJsonError(null);
    setIsSuccessImport(true);
    setTimeout(() => setIsSuccessImport(false), 2500);
  };

  // Live Point editing submit
  const handleSaveWaypointForm = () => {
    const updatedWaypoints = [...tripData.waypoints];
    if (!selectedWaypoint) return;

    // Build the updated spot
    const updatedSpot: Waypoint = {
      ...selectedWaypoint,
      name: wpName,
      description: wpDesc,
      day: wpDay,
      time: wpTime,
      coordinate: [Number(wpLng), Number(wpLat)],
      elevation: Number(wpElev),
      category: wpCategory,
      rating: Number(wpRating),
    };

    updatedWaypoints[selectedEditIndex] = updatedSpot;

    // Reconstruct route points if they match waypoint sequence to improve rendering
    const updatedRoutes = [...tripData.routes];
    // Option to sync waypoint coordinate into routing list directly
    const updatedTrip: TripData = {
      ...tripData,
      waypoints: updatedWaypoints,
    };

    onUpdateTripData(updatedTrip);
    setRawJsonText(JSON.stringify(updatedTrip, null, 2));
    setIsSuccessImport(true);
    setTimeout(() => setIsSuccessImport(false), 2000);
  };

  const handleAddNewWaypoint = () => {
    const nextId = `wp-${Date.now()}`;
    const defaultSpot: Waypoint = {
      id: nextId,
      name: "新添加的旅行节点",
      day: tripData.waypoints.length > 0 ? Math.max(...tripData.waypoints.map(w => w.day)) : 1,
      time: "12:00",
      coordinate: tripData.routes.length > 0 ? tripData.routes[tripData.routes.length - 1] : [100.22, 26.87],
      description: "在这里输入该节点的游玩描述、美食心得、或者酒店点评。",
      category: "scenic",
      rating: 5.0,
      elevation: 2000,
      photos: []
    };

    const newTrip = {
      ...tripData,
      waypoints: [...tripData.waypoints, defaultSpot]
    };

    onUpdateTripData(newTrip);
    setRawJsonText(JSON.stringify(newTrip, null, 2));
    setSelectedEditIndex(newTrip.waypoints.length - 1);
  };

  const handleDeleteWaypoint = () => {
    if (tripData.waypoints.length <= 1) {
      setJsonError("必须保留至少一个旅行节点！");
      setTimeout(() => setJsonError(null), 3000);
      return;
    }

    const filtered = tripData.waypoints.filter((_, i) => i !== selectedEditIndex);
    const updatedTrip = {
      ...tripData,
      waypoints: filtered
    };

    onUpdateTripData(updatedTrip);
    setRawJsonText(JSON.stringify(updatedTrip, null, 2));
    setSelectedEditIndex(Math.max(0, selectedEditIndex - 1));
  };

  // Download Action
  const downloadTripJson = () => {
    const blob = new Blob([JSON.stringify(tripData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trip.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm shadow-2xl">
      <div className="w-full max-w-4xl h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden text-slate-100 shadow-3xl">
        
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileJson size={18} />
            </div>
            <div>
              <h2 className="text-md font-semibold font-display">旅行路线数据控制台</h2>
              <p className="text-xs text-slate-400">管理、修改轨迹以及准备发布包</p>
            </div>
          </div>
          <button
            id="btn-close-data-console"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navbar */}
        <div className="flex items-center border-b border-slate-800 bg-slate-900 shrink-0">
          <button
            id="tab-import-json"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 transition ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400 bg-slate-850/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code size={15} />
            <span>导入 / 导出 JSON</span>
          </button>

          <button
            id="tab-point-editor"
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 transition ${
              activeTab === 'editor'
                ? 'border-emerald-500 text-emerald-400 bg-slate-850/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit size={15} />
            <span>可视化节点编辑器</span>
            <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">可视化</span>
          </button>

          <button
            id="tab-gh-pages"
            onClick={() => setActiveTab('deploy')}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 transition ${
              activeTab === 'deploy'
                ? 'border-emerald-500 text-emerald-400 bg-slate-850/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={15} />
            <span>部署到 GitHub Pages</span>
          </button>
        </div>

        {/* Console Body contents with vertical scroll */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
          
          {/* TAB 1: IMPORT & EXPORT */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left part: Upload instructions & drag field */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-200">加载您的 trip.json 轨迹文件</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    在这里您可以上传定制的轨迹数据。当被部署在静态环境（如 GitHub Pages）时，程序会默认向服务器请求根目录下的 <b>trip.json</b> 文件。
                  </p>

                  <label className="border-2 border-dashed border-slate-800 hover:border-emerald-500/40 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-900/20 hover:bg-slate-900/40 transition cursor-pointer group">
                    <FileJson size={32} className="text-slate-500 group-hover:text-emerald-400 transition" />
                    <div className="text-xs text-slate-300 font-medium">拖拽或点击本地文件上传</div>
                    <div className="text-[10px] text-slate-500">支持标准的 JSON 格式</div>
                    <input
                      id="input-file-trip-json"
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-xl space-y-2.5">
                    <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Download size={13} className="text-emerald-400" />
                      <span>导出当前数据</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      如果你在此处修改了任何内容，请点击下方按钮，将内容下载为 <b>trip.json</b>，并替换你前端打包目录下的同名文件。
                    </p>
                    <button
                      id="btn-download-trip-json"
                      onClick={downloadTripJson}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition shadow hover:scale-[1.01]"
                    >
                      <Download size={14} />
                      <span>下载 trip.json 轨迹配置文件</span>
                    </button>
                  </div>
                </div>

                {/* Right part: JSON pasting live area */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-200">直接粘贴 JSON 数据代码</h3>
                    {isSuccessImport && (
                      <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 bg-emerald-550/10 px-2 py-0.5 rounded">
                        <Check size={12} />
                        <span>更新应用成功！</span>
                      </span>
                    )}
                  </div>
                  
                  <textarea
                    id="textarea-raw-json-editor"
                    className="flex-1 min-h-[220px] bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-slate-700 leading-normal scrollbar-none"
                    value={rawJsonText}
                    onChange={(e) => setRawJsonText(e.target.value)}
                    placeholder="{ ... }"
                  />

                  {jsonError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg flex items-start gap-2.5 text-xs text-red-400 leading-normal">
                      <AlertCircle className="shrink-0 mt-0.5 animate-bounce" size={14} />
                      <div>{jsonError}</div>
                    </div>
                  )}

                  <button
                    id="btn-apply-raw-json"
                    onClick={handleApplyRawJson}
                    className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/50 transition whitespace-nowrap"
                  >
                    校验并加载该 JSON 代码
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VISUAL POINT EDITOR */}
          {activeTab === 'editor' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  点击左侧管理不同的旅行节点，右侧表单随时调整属性，改动在主地图中实时生效。
                </p>
                <div className="flex gap-2">
                  <button
                    id="btn-editor-add-spot"
                    onClick={handleAddNewWaypoint}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-medium bg-indigo-500 text-white hover:bg-indigo-400 transition"
                  >
                    <Plus size={13} />
                    <span>新增旅行节点</span>
                  </button>

                  <button
                    id="btn-editor-delete-spot"
                    onClick={handleDeleteWaypoint}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                  >
                    <Trash2 size={13} />
                    <span>移去所选</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Spot Picker Side column */}
                <div className="md:col-span-1 rounded-xl border border-slate-850 bg-slate-900/40 p-3 flex flex-col gap-1.5 max-h-[380px] overflow-y-auto">
                  <span className="text-[10px] uppercase text-slate-550 font-bold font-mono tracking-wider mb-1 px-1">当前节点列表:</span>
                  {tripData.waypoints.map((wp, i) => (
                    <button
                      id={`editor-wp-item-${i}`}
                      key={wp.id}
                      onClick={() => setSelectedEditIndex(i)}
                      className={`text-left p-2.5 rounded-lg text-xs transition flex flex-col gap-1 ${
                        selectedEditIndex === i
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium'
                          : 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate max-w-[150px]">{wp.name}</span>
                        <span className="font-mono text-[9px] text-slate-500">Day {wp.day}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 truncate">
                        Lng: {wp.coordinate[0].toFixed(3)}, Lat: {wp.coordinate[1].toFixed(3)}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Spot Form block */}
                <div className="md:col-span-2 bg-slate-900/20 border border-slate-850 p-5 rounded-xl space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-slate-400">景点/落脚点名称</label>
                      <input
                        id="editor-input-name"
                        type="text"
                        value={wpName}
                        onChange={(e) => setWpName(e.target.value)}
                        className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
                      />
                    </div>

                    {/* Category */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-slate-400">类型划分</label>
                      <select
                        id="editor-input-category"
                        value={wpCategory}
                        onChange={(e: any) => setWpCategory(e.target.value)}
                        className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
                      >
                        <option value="scenic">景区景点 (Scenic)</option>
                        <option value="dining">特色餐饮 (Dining)</option>
                        <option value="hotel">野奢酒店 (Hotel)</option>
                        <option value="transit">中途交通 (Transit)</option>
                      </select>
                    </div>

                    {/* Day */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-slate-400">日程天数 (Day)</label>
                      <input
                        id="editor-input-day"
                        type="number"
                        min={1}
                        value={wpDay}
                        onChange={(e) => setWpDay(Number(e.target.value))}
                        className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700 font-mono"
                      />
                    </div>

                    {/* Time */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-slate-400">大约点位访问时间</label>
                      <input
                        id="editor-input-time"
                        type="text"
                        value={wpTime}
                        onChange={(e) => setWpTime(e.target.value)}
                        placeholder="09:30"
                        className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700 font-mono"
                      />
                    </div>

                    {/* Longitude */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-slate-400">经度 Longitude</label>
                      <input
                        id="editor-input-lng"
                        type="number"
                        step={0.0001}
                        value={wpLng}
                        onChange={(e) => setWpLng(Number(e.target.value))}
                        className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700 font-mono"
                      />
                    </div>

                    {/* Latitude */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-slate-400">纬度 Latitude</label>
                      <input
                        id="editor-input-lat"
                        type="number"
                        step={0.0001}
                        value={wpLat}
                        onChange={(e) => setWpLat(Number(e.target.value))}
                        className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700 font-mono"
                      />
                    </div>

                    {/* Elevation */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-slate-400">海拔高度 (公尺)</label>
                      <input
                        id="editor-input-elev"
                        type="number"
                        value={wpElev}
                        onChange={(e) => setWpElev(Number(e.target.value))}
                        className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700 font-mono"
                      />
                    </div>

                    {/* Rating */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-slate-400">推荐指数 rating</label>
                      <input
                        id="editor-input-rating"
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        value={wpRating}
                        onChange={(e) => setWpRating(Number(e.target.value))}
                        className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700 font-mono"
                      />
                    </div>
                  </div>

                  {/* Description text input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-slate-400">游玩记录描述</label>
                    <textarea
                      id="editor-input-desc"
                      value={wpDesc}
                      onChange={(e) => setWpDesc(e.target.value)}
                      className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700 h-20 resize-none font-sans"
                    />
                  </div>

                  {/* Action */}
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-slate-550 italic">
                      ⚠️ 经韩度数值变动将同步调整地图上地标标记的位置
                    </div>
                    <button
                      id="btn-editor-submit-spot"
                      onClick={handleSaveWaypointForm}
                      className="px-5 py-2 rounded-lg bg-emerald-500 font-bold text-xs text-slate-950 hover:bg-emerald-400 hover:scale-[1.01] transition"
                    >
                      保存并应用
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GITHUB PAGES DEPLOYMENT TUTORIAL */}
          {activeTab === 'deploy' && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              <h3 className="text-md font-bold text-slate-100 font-display flex items-center gap-1.5 border-b border-slate-800 pb-2.5">
                <Sparkles className="text-amber-400" size={18} />
                <span>如何轻松部署到 GitHub Pages？</span>
              </h3>

              <div className="space-y-4 text-xs text-slate-400 leading-relaxed font-sans">
                <p>
                  因为这是一个<b>纯静态前端项目</b>，直接使用标准构建输出 (`npm run build`) 就会在 <b>dist/</b> 文件夹中生成所有的静态 HTML、CSS 和 JS 资源。这使得它天然兼容 <b>GitHub Pages</b> 的零成本服务器静态宿主！
                </p>

                <div className="p-4 bg-slate-900/70 border border-slate-850 rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold text-slate-200">🛠 快速分步上手指南：</h4>
                  
                  <div className="space-y-3 border-l-2 border-emerald-500/40 pl-3">
                    <div>
                      <b className="text-slate-200 font-bold">1. 准备你的资源文件夹</b>
                      <p className="mt-0.5 text-slate-400">
                        在你的代码仓库中，确保在静态根文件夹下方有一个 <b>photos/</b> 文件夹：
                        <br />
                        <code className="text-[10px] text-emerald-400 font-mono bg-slate-950 px-1 py-0.5 rounded">public/photos/</code> 或者直接发布好的站点根目录 <code className="text-[10px] text-emerald-400 font-mono bg-slate-950 px-1 py-0.5 rounded">photos/</code>。
                      </p>
                    </div>

                    <div>
                      <b className="text-slate-200 font-bold">2. 放置轨迹 `trip.json` 文件</b>
                      <p className="mt-0.5 text-slate-400">
                        把在 Tab 1 中导出的 <b>trip.json</b> 文件上传至你的网站根目录下（或 <b>public/</b> 目录）。代码加载时会自动发起 HTTP <code>fetch('trip.json')</code> 关联。
                      </p>
                    </div>

                    <div>
                      <b className="text-slate-200 font-bold">3. 设置 Mapbox Access Token 密钥</b>
                      <p className="mt-0.5 text-slate-400">
                        通过注册免费的 Mapbox 账户来生成您的令牌。有两种配置方式：
                        <br />
                        • 在本地 <code>.env</code> 文件中填写：<code>VITE_MAPBOX_ACCESS_TOKEN="你的Token"</code>，这将在打包编译时自动注入。
                        <br />
                        • 为了最大程度便捷，我们的项目在页面顶端或设置中内设一个 <b>"设置密钥"</b> 输入栏。你可以将令牌临时粘贴存于浏览器 <code>localStorage</code>，无需任何代码修改！
                      </p>
                    </div>

                    <div>
                      <b className="text-slate-200 font-bold">4. 部署至 GitHub Pages 仓库</b>
                      <p className="mt-0.5 text-slate-400">
                        你可以把 <b>dist/</b> 下的内容作为 <b>gh-pages</b> 分支提交，或使用 GitHub Actions 设置标准的 Vite 部署流程。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg flex gap-2 text-xs text-indigo-300">
                  <HelpCircle className="shrink-0 mt-0.5" size={14} />
                  <div>
                    <b>关于本地照片读取：</b> 
                    如果 <code>trip.json</code> 中的照片写着像 <code>&quot;photos/photo1.jpg&quot;</code> 这样的相对路径，请把照片保存在打包生成的 <code>photos/</code> 目录下，网页便能百分百无缝解析。
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shadow-inner">
          <div className="text-[10px] text-slate-500 font-mono">
            滇藏公路自驾路线地图生成器 • 完美匹配 GitHub Pages 部署
          </div>
          <button
            id="btn-console-done"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/50 text-xs font-semibold hover:text-white transition"
          >
            完成并返回地图
          </button>
        </div>

      </div>
    </div>
  );
}
