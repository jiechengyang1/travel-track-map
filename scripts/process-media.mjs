#!/usr/bin/env node

/**
 * process-media.mjs
 *
 * 扫描 media/ 目录，从照片提取 EXIF GPS 信息，从 .txt 读取旅行感受，
 * 自动更新 public/trip.json 中的 mediaMemories、previewNodes 和 description。
 *
 * 用法:
 *   node scripts/process-media.mjs
 *
 * media/ 目录结构约定:
 *   media/
 *     YYYY-MM-DD/         # 按日期分目录
 *       photo1.jpg        # 照片（支持 .jpg / .jpeg / .png）
 *       feeling.txt       # 旅行感受（该日期目录下可以有多个 .txt）
 *
 * 输出:
 *   更新 public/trip.json（TripData 新 schema）
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, extname, basename, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import exifr from 'exifr';

// ─── 路径 ────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MEDIA_DIR = join(ROOT, 'media');
const TRIP_JSON_PATH = join(ROOT, 'public', 'trip.json');
const TRIP_JSON_OLD_PATH = join(ROOT, 'public', 'trip_old.json');

// ─── 工具函数 ────────────────────────────────────────────

/** 判断是否为旧 schema（有 waypoints 字段） */
function isOldSchema(data) {
  return Array.isArray(data.waypoints) && !Array.isArray(data.previewNodes);
}

/**
 * 将旧 schema（waypoints + photos）转换为新 TripData schema
 */
function convertOldToNew(oldData) {
  const waypoints = oldData.waypoints || [];
  const routes = oldData.routes || [];

  const previewNodes = waypoints.map((wp, i) => {
    const kind = i === 0 ? 'start' : i === waypoints.length - 1 ? 'end' : 'key';
    const wpPhotos = Array.isArray(wp.photos) ? wp.photos : [];
    return {
      id: wp.id ? `node-${wp.id}` : `node-legacy-${i}`,
      name: wp.name || `节点 ${i + 1}`,
      coordinate: wp.coordinate || [100, 27],
      kind,
      highlight: wp.category || undefined,
      day: wp.day,
      mediaIds: wpPhotos.map((_, pi) => `memory-legacy-${wp.id || i}-photo-${pi}`),
    };
  });

  const mediaMemories = waypoints.flatMap((wp, i) => {
    const wpPhotos = Array.isArray(wp.photos) ? wp.photos : [];
    return wpPhotos.map((photo, pi) => ({
      id: `memory-legacy-${wp.id || i}-photo-${pi}`,
      type: 'photo',
      title: photo.title || '未命名照片',
      description: photo.description || undefined,
      url: photo.url || undefined,
      takenAt: photo.takenAt || undefined,
      coordinate: Array.isArray(photo.coordinates)
        ? photo.coordinates
        : wp.coordinate || [100, 27],
      locationName: wp.name || undefined,
      keyNodeId: wp.id ? `node-${wp.id}` : `node-legacy-${i}`,
      day: wp.day,
    }));
  });

  // 用 routes 建 segments
  const segments = [];
  const normalizedRoutes = routes
    .filter((point) => isValidCoordinate(point))
    .map((point) => normalizeCoordinate(point));

  if (normalizedRoutes.length >= 2) {
    // 如果有 waypoints，按相邻节点在主路线上对应的连续索引拆分段
    if (previewNodes.length >= 2) {
      const routeIndices = [];
      let searchStartIndex = 0;

      previewNodes.forEach((node) => {
        const routeIndex = findNearestRouteIndex(normalizedRoutes, node.coordinate, searchStartIndex);
        routeIndices.push(routeIndex);
        if (routeIndex >= 0) {
          searchStartIndex = routeIndex;
        }
      });

      for (let i = 0; i < previewNodes.length - 1; i++) {
        const startNode = previewNodes[i];
        const endNode = previewNodes[i + 1];
        const startCoord = normalizeCoordinate(startNode.coordinate);
        const endCoord = normalizeCoordinate(endNode.coordinate, startCoord);
        const startIndex = routeIndices[i];
        const rawEndIndex = routeIndices[i + 1];
        const endIndex = rawEndIndex >= startIndex ? rawEndIndex : startIndex;

        const slicedPath = startIndex >= 0 && endIndex >= startIndex
          ? normalizedRoutes.slice(startIndex, endIndex + 1)
          : [];

        const path = normalizeSegmentPath(
          slicedPath.length > 0 ? slicedPath : [startCoord, endCoord],
          startCoord,
          endCoord,
        );

        segments.push({
          id: `segment-legacy-${i}`,
          name: `${startNode.name} → ${endNode.name}`,
          roadName: '318国道',
          status: 'planned',
          day: endNode.day || startNode.day,
          startNodeId: startNode.id,
          endNodeId: endNode.id,
          path,
        });
      }
    } else {
      segments.push({
        id: 'segment-legacy-full',
        name: '全程路线',
        roadName: '318国道',
        status: 'planned',
        path: normalizeSegmentPath(normalizedRoutes, normalizedRoutes[0], normalizedRoutes[normalizedRoutes.length - 1]),
      });
    }
  }

  return {
    tripName: oldData.tripName || '未命名旅行',
    startDate: oldData.startDate || '',
    endDate: oldData.endDate || '',
    totalDistance: oldData.totalDistance || '',
    description: oldData.description || '',
    roadName: '318国道',
    previewNodes,
    segments,
    mediaMemories,
  };
}

/** 简单的经纬度距离（度） */
function geoDistance(a, b) {
  const dLng = a[0] - b[0];
  const dLat = a[1] - b[1];
  return Math.sqrt(dLng * dLng + dLat * dLat);
}

function isValidCoordinate(point) {
  return Array.isArray(point)
    && point.length >= 2
    && Number.isFinite(Number(point[0]))
    && Number.isFinite(Number(point[1]));
}

function normalizeCoordinate(point, fallback = [100, 27]) {
  if (!isValidCoordinate(point)) return [...fallback];
  return [Number(point[0]), Number(point[1])];
}

function coordinatesEqual(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function dedupeConsecutiveCoordinates(path) {
  const normalized = path
    .filter((point) => isValidCoordinate(point))
    .map((point) => normalizeCoordinate(point));

  return normalized.filter((point, index) => {
    if (index === 0) return true;
    return !coordinatesEqual(point, normalized[index - 1]);
  });
}

function normalizeSegmentPath(path, startCoord, endCoord) {
  const normalizedStart = normalizeCoordinate(startCoord);
  const normalizedEnd = normalizeCoordinate(endCoord, normalizedStart);
  const deduped = dedupeConsecutiveCoordinates(path);
  const body = deduped.filter((point, index) => {
    if (index === 0 || index === deduped.length - 1) return false;
    return !coordinatesEqual(point, normalizedStart) && !coordinatesEqual(point, normalizedEnd);
  });

  const normalizedPath = [normalizedStart, ...body, normalizedEnd];
  return dedupeConsecutiveCoordinates(normalizedPath);
}

function findNearestRouteIndex(route, coordinate, startIndex = 0) {
  if (!Array.isArray(route) || route.length === 0) return -1;

  const normalizedCoord = normalizeCoordinate(coordinate);
  let bestIndex = Math.min(Math.max(startIndex, 0), route.length - 1);
  let bestDistance = Infinity;

  for (let i = bestIndex; i < route.length; i++) {
    const point = route[i];
    if (!isValidCoordinate(point)) continue;

    const distance = geoDistance(normalizeCoordinate(point), normalizedCoord);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/** 短哈希作为唯一 ID 后缀 */
function shortHash(str) {
  return createHash('md5').update(str).digest('hex').slice(0, 8);
}

/** 从文件名生成友好标题 */
function filenameToTitle(filename) {
  const name = basename(filename, extname(filename));
  // 把下划线和连字符替换为空格，首字母大写
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || '未命名照片';
}

/**
 * 解析日期目录名 "YYYY-MM-DD" → day number
 * 以 tripData.startDate 为 day 1
 */
function dirnameToDay(dirName, startDateStr) {
  if (!startDateStr) return undefined;
  const start = new Date(startDateStr);
  const dir = new Date(dirName);
  if (isNaN(start.getTime()) || isNaN(dir.getTime())) return undefined;
  const diffMs = dir.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

// ─── EXIF 提取 ───────────────────────────────────────────

async function extractExif(filePath) {
  try {
    const data = await exifr.parse(filePath, {
      gps: true,
      tiff: true,
      exif: true,
      pick: ['GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
             'DateTimeOriginal', 'CreateDate', 'ModifyDate',
             'Make', 'Model', 'ImageDescription', 'Description'],
    });
    if (!data) return null;

    let lat = data.GPSLatitude ?? data.latitude;
    let lng = data.GPSLongitude ?? data.longitude;

    // exifr 返回的 GPSLatitude/GPSLongitude 已经是十进制度数
    if (lat == null || lng == null) return null;

    // 有时返回字符串，需要转换
    if (typeof lat === 'string') lat = parseFloat(lat);
    if (typeof lng === 'string') lng = parseFloat(lng);

    if (isNaN(lat) || isNaN(lng)) return null;
    // 验证范围
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    const dateTime = data.DateTimeOriginal || data.CreateDate || data.ModifyDate;
    const takenAt = dateTime instanceof Date
      ? dateTime.toISOString().replace('T', ' ').slice(0, 19)
      : (dateTime ? String(dateTime).replace('T', ' ').slice(0, 19) : undefined);

    const camera = [data.Make, data.Model].filter(Boolean).join(', ') || undefined;

    return {
      coordinate: [Number(lng.toFixed(6)), Number(lat.toFixed(6))],
      takenAt,
      camera,
      imageDescription: data.ImageDescription || data.Description || undefined,
    };
  } catch (err) {
    console.warn(`  ⚠ EXIF 解析失败: ${basename(filePath)} — ${err.message}`);
    return null;
  }
}

// ─── 主流程 ───────────────────────────────────────────────

async function main() {
  console.log('🔍 process-media: 扫描 media/ 目录...\n');

  // 1. 读取 trip.json
  let tripData;
  let rawTripJson;
  try {
    rawTripJson = await readFile(TRIP_JSON_PATH, 'utf-8');
    tripData = JSON.parse(rawTripJson);
    console.log('✅ 已读取 public/trip.json');
  } catch {
    console.log('⚠ public/trip.json 不存在，将使用默认空结构');
    tripData = {
      tripName: '未命名旅行',
      startDate: '',
      endDate: '',
      totalDistance: '',
      description: '',
      roadName: '',
      previewNodes: [],
      segments: [],
      mediaMemories: [],
    };
  }

  // 2. 检测并转换旧 schema
  if (isOldSchema(tripData)) {
    console.log('🔄 检测到旧 schema（waypoints），正在转换为新 TripData 格式...');
    // 备份旧文件
    await writeFile(TRIP_JSON_OLD_PATH, rawTripJson, 'utf-8');
    console.log(`📦 旧 trip.json 已备份为 public/trip_old.json`);
    tripData = convertOldToNew(tripData);
  }

  // 3. 扫描 media/ 目录
  let dateDirs;
  try {
    const entries = await readdir(MEDIA_DIR, { withFileTypes: true });
    dateDirs = entries
      .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
      .map((e) => e.name)
      .sort();
  } catch {
    console.log('⚠ media/ 目录不存在，请先创建并按日期放入照片和 txt');
    return;
  }

  if (dateDirs.length === 0) {
    console.log('⚠ media/ 下没有找到日期子目录（YYYY-MM-DD 格式）');
    return;
  }

  console.log(`📂 发现 ${dateDirs.length} 个日期目录: ${dateDirs.join(', ')}\n`);

  // 4. 收集所有已有的 mediaMemory ID，避免重复
  const existingMemoryIds = new Set((tripData.mediaMemories || []).map((m) => m.id));
  const existingUrls = new Set((tripData.mediaMemories || []).map((m) => m.url).filter(Boolean));
  const newMediaMemories = [];
  const txtContents = [];

  let totalPhotos = 0;
  let photosWithGps = 0;
  let photosWithoutGps = 0;

  for (const dateDir of dateDirs) {
    const dirPath = join(MEDIA_DIR, dateDir);
    const day = dirnameToDay(dateDir, tripData.startDate);

    console.log(`📅 ${dateDir}${day ? ` (Day ${day})` : ''}`);

    let files;
    try {
      files = await readdir(dirPath, { withFileTypes: true });
    } catch {
      console.log(`  ⚠ 无法读取目录: ${dirPath}`);
      continue;
    }

    for (const file of files) {
      if (!file.isFile()) continue;
      const ext = extname(file.name).toLowerCase();
      const filePath = join(dirPath, file.name);

      // ── 照片处理 ──
      if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
        totalPhotos++;
        const relPath = relative(ROOT, filePath); // media/YYYY-MM-DD/photo.jpg
        const url = relPath; // Vite 可配置 serve media/ 目录

        // 跳过已存在的
        if (existingUrls.has(url)) {
          console.log(`  ⏭ 跳过（已存在）: ${file.name}`);
          continue;
        }

        // 提取 EXIF
        const exif = await extractExif(filePath);
        const title = exif?.imageDescription || filenameToTitle(file.name);

        const mediaId = `media-${dateDir}-photo-${shortHash(file.name)}`;
        if (existingMemoryIds.has(mediaId)) continue;

        if (exif && exif.coordinate) {
          photosWithGps++;
          console.log(`  📷 ${file.name}  → GPS: [${exif.coordinate[0]}, ${exif.coordinate[1]}]`);

          // 匹配最近的 previewNode（GPS 就近匹配）
          let matchedNodeId = undefined;
          let matchedNodeName = undefined;
          let minDist = Infinity;
          for (const node of tripData.previewNodes || []) {
            const dist = geoDistance(exif.coordinate, node.coordinate);
            if (dist < minDist && dist < 1.0) { // 约 100km 阈值
              minDist = dist;
              matchedNodeId = node.id;
              matchedNodeName = node.name;
            }
          }

          newMediaMemories.push({
            id: mediaId,
            type: 'photo',
            title,
            url,
            takenAt: exif.takenAt,
            coordinate: exif.coordinate,
            locationName: matchedNodeName || undefined,
            keyNodeId: matchedNodeId,
            day: day || undefined,
          });

          // 如果匹配到了节点，更新节点的 mediaIds
          if (matchedNodeId) {
            const node = (tripData.previewNodes || []).find((n) => n.id === matchedNodeId);
            if (node && !node.mediaIds.includes(mediaId)) {
              node.mediaIds.push(mediaId);
            }
          }
        } else {
          photosWithoutGps++;
          console.log(`  📷 ${file.name}  → 无 GPS 信息，跳过`);
        }
      }

      // ── 文本处理 ──
      if (ext === '.txt') {
        try {
          const content = await readFile(filePath, 'utf-8');
          const trimmed = content.trim();
          if (trimmed) {
            txtContents.push({ date: dateDir, content: trimmed });
            console.log(`  📝 ${file.name}  → 读取到 ${trimmed.length} 字`);
          }
        } catch (err) {
          console.warn(`  ⚠ 读取 txt 失败: ${file.name} — ${err.message}`);
        }
      }
    }

    console.log('');
  }

  // 5. 合并 mediaMemories
  if (newMediaMemories.length > 0) {
    tripData.mediaMemories = [...(tripData.mediaMemories || []), ...newMediaMemories];
  }

  // 6. 更新 description（从 txt 文件）
  if (txtContents.length > 0) {
    const txtDesc = txtContents
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => `【${t.date}】\n${t.content}`)
      .join('\n\n');
    const existingDesc = tripData.description || '';
    tripData.description = existingDesc
      ? `${existingDesc}\n\n---\n\n${txtDesc}`
      : txtDesc;
  }

  // 7. 写入 trip.json
  const outputJson = JSON.stringify(tripData, null, 2);
  await writeFile(TRIP_JSON_PATH, outputJson, 'utf-8');
  console.log(`✅ 已更新 public/trip.json`);

  // 8. 输出统计
  console.log('\n📊 处理统计:');
  console.log(`   照片总数:      ${totalPhotos}`);
  console.log(`   有 GPS:        ${photosWithGps}`);
  console.log(`   无 GPS (跳过):  ${photosWithoutGps}`);
  console.log(`   新增 mediaMem:  ${newMediaMemories.length}`);
  console.log(`   读取 txt:      ${txtContents.length}`);
  console.log(`   previewNodes:  ${(tripData.previewNodes || []).length}`);
  console.log(`   segments:      ${(tripData.segments || []).length}`);
  console.log(`   mediaMemories: ${(tripData.mediaMemories || []).length}`);
}

main().catch((err) => {
  console.error('❌ 处理失败:', err);
  process.exit(1);
});
