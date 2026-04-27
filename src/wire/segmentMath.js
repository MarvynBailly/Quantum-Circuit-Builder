/**
 * Project (x,y) onto the segment from a to b. Returns
 * { t, px, py, d } where t∈[0,1] is the clamped parameter,
 * (px,py) is the foot of the perpendicular, and d is the distance
 * from (x,y) to (px,py).
 */
export function projectPointOnSegment(a, b, x, y) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) {
    return { t: 0, px: a.x, py: a.y, d: Math.hypot(x - a.x, y - a.y) };
  }
  let t = ((x - a.x) * dx + (y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return { t, px, py, d: Math.hypot(x - px, y - py) };
}
