import React, { useEffect, useMemo, useState } from 'react';
import { X, HelpCircle, Code, Edit, Sparkles, Download, Check, AlertCircle, FileJson, Plus, Trash2 } from 'lucide-react';
import { TripData, KeyNode, RouteSegment, MediaMemory } from '../types';

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
  const [rawJsonText, setRawJsonText] = useState(() => JSON.stringify(tripData, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSuccessImport, setIsSuccessImport] = useState(false);
  const [selectedEditIndex, setSelectedEditIndex] = useState<number>(0);

  const selectedNode = tripData.previewNodes[selectedEditIndex] || null;

  const [nodeName, setNodeName] = useState('');
  const [nodeHighlight, setNodeHighlight] = useState('');
  const [nodeDay, setNodeDay] = useState(1);
  const [nodeKind, setNodeKind] = useState<'start' | 'key' | 'end'>('key');
  const [nodeLng, setNodeLng] = useState(100.0);
  const [nodeLat, setNodeLat] = useState(27.0);

  useEffect(() => {
    setRawJsonText(JSON.stringify(tripData, null, 2));
  }, [tripData]);

  useEffect(() => {
    if (selectedNode) {
      setNodeName(selectedNode.name);
      setNodeHighlight(selectedNode.highlight || '');
      setNodeDay(selectedNode.day || 1);
      setNodeKind(selectedNode.kind);
      setNodeLng(selectedNode.coordinate[0]);
      setNodeLat(selectedNode.coordinate[1]);
    }
  }, [selectedNode, selectedEditIndex]);

  const tripStats = useMemo(() => {
    return {
      nodeCount: tripData.previewNodes.length,
      segmentCount: tripData.segments.length,
      memoryCount: tripData.mediaMemories.length,
    };
  }, [tripData]);

  if (!isOpen) return null;

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
    if (!data.tripName || !Array.isArray(data.previewNodes) || !Array.isArray(data.segments)) {
      setJsonError('无效的 trip.json 格式。需要包含 tripName、previewNodes[]、segments[]。');
      return;
    }

    const cleanedPreviewNodes: KeyNode[] = data.previewNodes.map((node: any, i: number) => ({
      id: node.id || `node-${Date.now()}-${i}`,
      name: node.name || `未命名节点 ${i + 1}`,
      coordinate: Array.isArray(node.coordinate)
        ? [Number(node.coordinate[0]), Number(node.coordinate[1])]
        : [100, 27],
      kind: node.kind === 'start' || node.kind === 'end' || node.kind === 'key' ? node.kind : 'key',
      highlight: node.highlight || undefined,
      roadLabel: node.roadLabel || undefined,
      day: node.day !== undefined ? Number(node.day) : undefined,
      mediaIds: Array.isArray(node.mediaIds) ? node.mediaIds : [],
    }));

    const cleanedSegments: RouteSegment[] = data.segments.map((segment: any, i: number) => ({
      id: segment.id || `segment-${Date.now()}-${i}`,
      name: segment.name || `未命名路段 ${i + 1}`,
      roadName: segment.roadName || data.roadName || '未命名道路',
      status: segment.status === 'traveled' || segment.status === 'skipped' ? segment.status : 'planned',
      path: Array.isArray(segment.path)
        ? segment.path.map((point: any) => [Number(point[0]), Number(point[1])] as [number, number])
        : [],
      startNodeId: segment.startNodeId || undefined,
      endNodeId: segment.endNodeId || undefined,
      day: segment.day !== undefined ? Number(segment.day) : undefined,
    }));

    const cleanedMediaMemories: MediaMemory[] = Array.isArray(data.mediaMemories)
      ? data.mediaMemories.map((memory: any, i: number) => ({
          id: memory.id || `memory-${Date.now()}-${i}`,
          type: memory.type === 'video' || memory.type === 'note' ? memory.type : 'photo',
          title: memory.title || `未命名内容 ${i + 1}`,
          description: memory.description || undefined,
          url: memory.url || undefined,
          thumbnailUrl: memory.thumbnailUrl || undefined,
          text: memory.text || undefined,
          takenAt: memory.takenAt || undefined,
          coordinate: Array.isArray(memory.coordinate)
            ? [Number(memory.coordinate[0]), Number(memory.coordinate[1])]
            : [100, 27],
          locationName: memory.locationName || undefined,
          keyNodeId: memory.keyNodeId || undefined,
          day: memory.day !== undefined ? Number(memory.day) : undefined,
          durationMs: memory.durationMs !== undefined ? Number(memory.durationMs) : undefined,
        }))
      : [];

    const validatedTrip: TripData = {
      tripName: data.tripName,
      startDate: data.startDate || 'YYYY-MM-DD',
      endDate: data.endDate || 'YYYY-MM-DD',
      totalDistance: data.totalDistance || '未知',
      description: data.description || '',
      roadName: data.roadName || '未命名道路',
      previewNodes: cleanedPreviewNodes,
      segments: cleanedSegments,
      mediaMemories: cleanedMediaMemories,
    };

    onUpdateTripData(validatedTrip);
    setJsonError(null);
    setIsSuccessImport(true);
    setTimeout(() => setIsSuccessImport(false), 2500);
  };

  const handleSaveNodeForm = () => {
    if (!selectedNode) return;

    const updatedNodes = [...tripData.previewNodes];
    updatedNodes[selectedEditIndex] = {
      ...selectedNode,
      name: nodeName,
      highlight: nodeHighlight || undefined,
      day: nodeDay,
      kind: nodeKind,
      coordinate: [Number(nodeLng), Number(nodeLat)],
    };

    const updatedTrip: TripData = {
      ...tripData,
      previewNodes: updatedNodes,
    };

    onUpdateTripData(updatedTrip);
    setIsSuccessImport(true);
    setTimeout(() => setIsSuccessImport(false), 2000);
  };

  const handleAddNewNode = () => {
    const nextId = `node-${Date.now()}`;
    const defaultNode: KeyNode = {
      id: nextId,
      name: '新添加的关键节点',
      coordinate: tripData.previewNodes.length > 0
        ? tripData.previewNodes[tripData.previewNodes.length - 1].coordinate
        : [100.22, 26.87],
      kind: 'key',
      highlight: '在这里输入节点特色',
      day: tripData.previewNodes.length > 0
        ? Math.max(...tripData.previewNodes.map((node) => node.day || 1))
        : 1,
      mediaIds: [],
    };

    const newTrip: TripData = {
      ...tripData,
      previewNodes: [...tripData.previewNodes, defaultNode],
    };

    onUpdateTripData(newTrip);
    setSelectedEditIndex(newTrip.previewNodes.length - 1);
  };

  const handleDeleteNode = () => {
    if (tripData.previewNodes.length <= 1) {
      setJsonError('必须保留至少一个预览节点！');
      setTimeout(() => setJsonError(null), 3000);
      return;
    }

    const filteredNodes = tripData.previewNodes.filter((_, i) => i !== selectedEditIndex);
    const updatedTrip: TripData = {
      ...tripData,
      previewNodes: filteredNodes,
    };

    onUpdateTripData(updatedTrip);
    setSelectedEditIndex(Math.max(0, selectedEditIndex - 1));
  };

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
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileJson size={18} />
            </div>
            <div>
              <h2 className="text-md font-semibold font-display">旅行路线数据控制台</h2>
              <p className="text-xs text-slate-400">管理节点、路段与媒体数据，准备生成预览回放</p>
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
            <span>编辑关键节点</span>
          </button>

          <button
            id="tab-deploy-guide"
            onClick={() => setActiveTab('deploy')}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 transition ${
              activeTab === 'deploy'
                ? 'border-emerald-500 text-emerald-400 bg-slate-850/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={15} />
            <span>新结构说明</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'import' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-xs text-slate-400">关键节点</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{tripStats.nodeCount}</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-xs text-slate-400">路线段</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{tripStats.segmentCount}</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-xs text-slate-400">媒体记忆</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{tripStats.memoryCount}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 cursor-pointer text-sm">
                  <FileJson size={14} />
                  <span>导入 trip.json</span>
                  <input type="file" accept="application/json" className="hidden" onChange={handleFileUpload} />
                </label>
                <button
                  onClick={downloadTripJson}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm"
                >
                  <Download size={14} />
                  <span>导出当前 JSON</span>
                </button>
                <button
                  onClick={handleApplyRawJson}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm"
                >
                  <Check size={14} />
                  <span>应用文本 JSON</span>
                </button>
              </div>

              <textarea
                value={rawJsonText}
                onChange={(e) => setRawJsonText(e.target.value)}
                className="w-full min-h-[360px] rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs font-mono text-slate-200 outline-none focus:border-emerald-500"
                spellCheck={false}
              />
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">关键节点列表</h3>
                  <button
                    onClick={handleAddNewNode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400"
                  >
                    <Plus size={13} /> 添加
                  </button>
                </div>
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  {tripData.previewNodes.map((node, index) => (
                    <button
                      key={node.id}
                      onClick={() => setSelectedEditIndex(index)}
                      className={`w-full text-left rounded-xl border px-3 py-3 transition ${
                        selectedEditIndex === index
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-slate-800 bg-slate-950/40 hover:bg-slate-900'
                      }`}
                    >
                      <div className="text-sm font-medium text-white">{node.name}</div>
                      <div className="mt-1 text-[11px] text-slate-400">{node.kind.toUpperCase()} · Day {node.day || '-'}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">编辑当前关键节点</h3>
                  <button
                    onClick={handleDeleteNode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-300 text-xs hover:bg-rose-500/10"
                  >
                    <Trash2 size={13} /> 删除
                  </button>
                </div>

                {selectedNode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="space-y-1.5 text-sm">
                      <span className="text-slate-400">节点名称</span>
                      <input value={nodeName} onChange={(e) => setNodeName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="text-slate-400">节点类型</span>
                      <select value={nodeKind} onChange={(e) => setNodeKind(e.target.value as 'start' | 'key' | 'end')} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                        <option value="start">起点</option>
                        <option value="key">关键节点</option>
                        <option value="end">终点</option>
                      </select>
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="text-slate-400">亮点文案</span>
                      <input value={nodeHighlight} onChange={(e) => setNodeHighlight(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="text-slate-400">所属天数</span>
                      <input type="number" value={nodeDay} onChange={(e) => setNodeDay(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="text-slate-400">经度</span>
                      <input type="number" value={nodeLng} onChange={(e) => setNodeLng(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="text-slate-400">纬度</span>
                      <input type="number" value={nodeLat} onChange={(e) => setNodeLat(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">当前没有可编辑的关键节点。</div>
                )}

                <button
                  onClick={handleSaveNodeForm}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm"
                >
                  <Check size={14} />
                  <span>保存节点修改</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'deploy' && (
            <div className="space-y-5 text-sm text-slate-300 leading-7">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <HelpCircle size={16} />
                  <span>当前 trip.json 新结构说明</span>
                </div>
                <ul className="mt-4 space-y-2 text-slate-300 list-disc list-inside">
                  <li><code className="text-emerald-300">previewNodes</code>：路线预览态展示的起点、终点和关键节点</li>
                  <li><code className="text-emerald-300">segments</code>：每一段路线的 path 与状态（planned / traveled / skipped）</li>
                  <li><code className="text-emerald-300">mediaMemories</code>：照片、视频、文字感受等节点内容</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="text-sm font-semibold text-white">媒体自动落点设计建议</div>
                <div className="mt-3 text-slate-400">
                  图片 / 视频优先读取 GPS 或 EXIF；没有 GPS 时由用户填写地点名，再通过地理编码换算坐标并回写到 <code className="text-emerald-300">mediaMemories</code>。
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="text-sm font-semibold text-white">预告片式回放链路</div>
                <div className="mt-3 text-slate-400">
                  地图根据 <code className="text-emerald-300">segments</code> 渲染灰/绿路线；小车接近 <code className="text-emerald-300">previewNodes</code> 后，自动切换到节点媒体播放层并按 video → photo → note 顺序展示。
                </div>
              </div>
            </div>
          )}
        </div>

        {(jsonError || isSuccessImport) && (
          <div className={`mx-6 mb-5 rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${
            jsonError
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          }`}>
            {jsonError ? <AlertCircle size={16} /> : <Check size={16} />}
            <span>{jsonError || '数据已成功更新到当前预览！'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
