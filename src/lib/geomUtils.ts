export function decodePolyline(encoded: string): {lat: number, lng: number}[] {
  let points: {lat: number, lng: number}[] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charAt(index++).charCodeAt(0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    
    shift = 0;
    result = 0;
    do {
      b = encoded.charAt(index++).charCodeAt(0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push({ lat: (lat / 1E5), lng: (lng / 1E5) });
  }
  return points;
}

export function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371000;
  var dLat = deg2rad(lat2-lat1);  
  var dLon = deg2rad(lon2-lon1); 
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
          Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}
function deg2rad(deg: number) { return deg * (Math.PI/180); }

export function distanceToSegment(p: {lat: number, lng: number}, v: {lat: number, lng: number}, w: {lat: number, lng: number}) {
  const l2 = Math.pow(v.lat - w.lat, 2) + Math.pow(v.lng - w.lng, 2);
  if (l2 === 0) return getDistanceFromLatLonInM(p.lat, p.lng, v.lat, v.lng);
  let t = ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = { lat: v.lat + t * (w.lat - v.lat), lng: v.lng + t * (w.lng - v.lng) };
  return getDistanceFromLatLonInM(p.lat, p.lng, proj.lat, proj.lng);
}

export function getDistanceToPolyline(point: {lat: number, lng: number}, polylineCoords: {lat: number, lng: number}[]) {
  if (!polylineCoords || polylineCoords.length === 0) return 0;
  let minDistance = Infinity;
  for (let i = 0; i < polylineCoords.length - 1; i++) {
    const d = distanceToSegment(point, polylineCoords[i], polylineCoords[i+1]);
    if (d < minDistance) minDistance = d;
  }
  return minDistance;
}
