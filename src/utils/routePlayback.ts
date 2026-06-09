import { Coordinate } from '../types';

export function interpolateRouteCoordinate(route: Coordinate[], currentProgress: number): Coordinate {
  if (!route || route.length === 0) {
    return [103.9471, 30.5745];
  }

  const maxIdx = route.length - 1;
  const progress = Math.max(0, Math.min(maxIdx, currentProgress));
  const idxFloor = Math.floor(progress);
  const idxCeil = Math.ceil(progress);

  if (idxFloor === idxCeil) {
    return route[idxFloor];
  }

  const fraction = progress - idxFloor;
  const p1 = route[idxFloor];
  const p2 = route[idxCeil];

  return [
    p1[0] + (p2[0] - p1[0]) * fraction,
    p1[1] + (p2[1] - p1[1]) * fraction,
  ];
}

export function splitRouteAtProgress(route: Coordinate[], currentProgress: number) {
  if (!route || route.length === 0) {
    return {
      traveledPath: [] as Coordinate[],
      remainingPath: [] as Coordinate[],
      splitPoint: [103.9471, 30.5745] as Coordinate,
    };
  }

  if (route.length === 1) {
    return {
      traveledPath: [route[0]],
      remainingPath: [route[0]],
      splitPoint: route[0],
    };
  }

  const maxIdx = route.length - 1;
  const progress = Math.max(0, Math.min(maxIdx, currentProgress));
  const idxFloor = Math.floor(progress);
  const idxCeil = Math.ceil(progress);
  const splitPoint = interpolateRouteCoordinate(route, progress);

  if (idxFloor === idxCeil) {
    return {
      traveledPath: route.slice(0, idxFloor + 1),
      remainingPath: route.slice(idxFloor),
      splitPoint,
    };
  }

  const traveledPath = [...route.slice(0, idxFloor + 1), splitPoint];
  const remainingPath = [splitPoint, ...route.slice(idxCeil)];

  return {
    traveledPath,
    remainingPath,
    splitPoint,
  };
}

export function geoDistanceMeters([lng1, lat1]: Coordinate, [lng2, lat2]: Coordinate): number {
  const earthRadius = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const avgLat = (((lat1 + lat2) / 2) * Math.PI) / 180;

  return earthRadius * Math.sqrt(
    dLat * dLat +
    (Math.cos(avgLat) * dLng) * (Math.cos(avgLat) * dLng)
  );
}
