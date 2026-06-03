/**
 * Геодезические вычисления.
 * Единый источник правды для всех формул Гаверсинуса в проекте.
 */

const EARTH_RADIUS_M  = 6_371_000; // метры
const EARTH_RADIUS_KM = 6_371;     // километры

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Расстояние между двумя точками в **метрах** */
export function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Расстояние между двумя точками в **километрах** */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Общая длина маршрута через массив точек в **километрах** */
export function routeLengthKm(
  points: Array<{ lat: number; lng: number }>,
): number {
  return points.slice(1).reduce((sum, pt, i) =>
    sum + haversineKm(points[i].lat, points[i].lng, pt.lat, pt.lng),
  0);
}
