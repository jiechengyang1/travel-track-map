export type Coordinate = [number, number];

export type SegmentStatus = 'planned' | 'traveled' | 'skipped';
export type NodeKind = 'start' | 'end' | 'key';
export type MediaType = 'photo' | 'video' | 'note';

export interface MediaMemory {
  id: string;
  type: MediaType;
  title: string;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  text?: string;
  takenAt?: string;
  coordinate: Coordinate;
  locationName?: string;
  keyNodeId?: string;
  day?: number;
  durationMs?: number;
}

export interface KeyNode {
  id: string;
  name: string;
  coordinate: Coordinate;
  kind: NodeKind;
  highlight?: string;
  roadLabel?: string;
  day?: number;
  mediaIds: string[];
}

export interface RouteSegment {
  id: string;
  name?: string;
  roadName?: string;
  status: SegmentStatus;
  path: Coordinate[];
  startNodeId?: string;
  endNodeId?: string;
  day?: number;
}

export interface TripData {
  tripName: string;
  startDate: string;
  endDate: string;
  totalDistance: string;
  description: string;
  roadName: string;
  previewNodes: KeyNode[];
  segments: RouteSegment[];
  mediaMemories: MediaMemory[];
}
