import zipcodes from "zipcodes";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function zipToCoords(zip: string): Coordinates | null {
  const result = zipcodes.lookup(zip);
  if (!result) return null;
  return { latitude: result.latitude, longitude: result.longitude };
}

export function cityStateToCoords(city: string, state: string): Coordinates | null {
  const results = zipcodes.lookupByName(city, state);
  if (!results || results.length === 0) return null;
  return { latitude: results[0].latitude, longitude: results[0].longitude };
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
