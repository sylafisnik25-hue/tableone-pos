function toRadians(deg) {
  return (Number(deg) * Math.PI) / 180
}

/**
 * Distance between coordinates in meters (Haversine).
 */
export function distanceMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000
  const dLat = toRadians(bLat - aLat)
  const dLng = toRadians(bLng - aLng)
  const lat1 = toRadians(aLat)
  const lat2 = toRadians(bLat)

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}
