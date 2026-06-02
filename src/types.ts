export interface Photo {
  url: string;
  title: string;
  description?: string;
  takenAt?: string;
  locationName?: string;
  camera?: string;
  coordinates?: [number, number];
}

export interface Waypoint {
  id: string;
  name: string;
  day: number;
  time: string;
  coordinate: [number, number]; // [lng, lat]
  description: string;
  category: 'scenic' | 'dining' | 'hotel' | 'transit';
  rating?: number;
  photos: Photo[];
  elevation?: number; // Optional elevation in meters
  distanceFromStart?: number; // Optional distance in km
}

export interface TripData {
  tripName: string;
  startDate: string;
  endDate: string;
  totalDistance: string;
  description: string;
  routes: Array<[number, number]>; // list of [lng, lat] points tracing the actual path
  waypoints: Waypoint[];
}
