// ─── Polygon clipping utilities ──────────────────────────
// Robust Sutherland-Hodgman half-plane clipping and polygon operations.
// All operations are fully deterministic (no randomness).
import type { Vec2 } from './types'

const EPS = 1e-8

// ─── Half-plane clipping ─────────────────────────────────

/**
 * Signed distance from point P to an infinite line defined by
 * a point on the line (`linePoint`) and its outward normal (`lineNormal`).
 * Positive = "inside" (same side as normal), Negative = "outside".
 */
function signedDistToLine(p: Vec2, linePoint: Vec2, lineNormal: Vec2): number {
  return (p.x - linePoint.x) * lineNormal.x + (p.y - linePoint.y) * lineNormal.y
}

/**
 * Intersect segment A→B with the line defined by (linePoint, lineNormal).
 * Returns the interpolation parameter t ∈ [0,1].
 */
function segLineT(a: Vec2, b: Vec2, linePoint: Vec2, lineNormal: Vec2): number {
  const dA = signedDistToLine(a, linePoint, lineNormal)
  const dB = signedDistToLine(b, linePoint, lineNormal)
  const denom = dA - dB
  if (Math.abs(denom) < EPS) return 0
  return dA / denom
}

/**
 * Linear interpolation between two points.
 */
function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/**
 * Sutherland-Hodgman: clip a polygon against a single half-plane.
 *
 * The half-plane is defined by a `linePoint` and `lineNormal`.
 * Points with signedDist >= -EPS are considered "inside".
 *
 * This is always correct for clipping against a single line,
 * even if the input polygon is concave.
 *
 * @returns The clipped polygon (may be empty if entirely outside).
 */
export function clipPolygonByHalfPlane(
  polygon: Vec2[],
  linePoint: Vec2,
  lineNormal: Vec2,
): Vec2[] {
  if (polygon.length < 3) return []

  const output: Vec2[] = []
  const n = polygon.length

  for (let i = 0; i < n; i++) {
    const curr = polygon[i]!
    const next = polygon[(i + 1) % n]!

    const dCurr = signedDistToLine(curr, linePoint, lineNormal)
    const dNext = signedDistToLine(next, linePoint, lineNormal)

    const currInside = dCurr >= -EPS
    const nextInside = dNext >= -EPS

    if (currInside && nextInside) {
      // Both inside → emit next
      output.push(next)
    } else if (currInside && !nextInside) {
      // Going out → emit intersection
      const t = segLineT(curr, next, linePoint, lineNormal)
      output.push(lerpVec(curr, next, Math.max(0, Math.min(1, t))))
    } else if (!currInside && nextInside) {
      // Coming in → emit intersection + next
      const t = segLineT(curr, next, linePoint, lineNormal)
      output.push(lerpVec(curr, next, Math.max(0, Math.min(1, t))))
      output.push(next)
    }
    // Both outside → emit nothing
  }

  return output
}

/**
 * Clip a polygon by a strip between two parallel lines.
 * `linePoint1` + `lineNormal1` defines one edge of the strip (inside = toward strip center).
 * `linePoint2` + `lineNormal2` defines the other edge (inside = toward strip center).
 */
export function clipPolygonByStrip(
  polygon: Vec2[],
  linePoint1: Vec2, lineNormal1: Vec2,
  linePoint2: Vec2, lineNormal2: Vec2,
): Vec2[] {
  const after1 = clipPolygonByHalfPlane(polygon, linePoint1, lineNormal1)
  if (after1.length < 3) return []
  return clipPolygonByHalfPlane(after1, linePoint2, lineNormal2)
}

/**
 * Clip a polygon by an axis-aligned cell defined by four half-planes.
 * This clips the polygon to the intersection of all four half-planes,
 * producing the polygon fragment inside the rectangular cell.
 *
 * @param polygon - Input polygon
 * @param planes - Array of { point, normal } defining the cell walls
 * @returns Clipped polygon (may be empty if no intersection)
 */
export function clipPolygonByCell(
  polygon: Vec2[],
  planes: { point: Vec2; normal: Vec2 }[],
): Vec2[] {
  let result = polygon
  for (const { point, normal } of planes) {
    result = clipPolygonByHalfPlane(result, point, normal)
    if (result.length < 3) return []
  }
  return result
}

// ─── Polygon normalization ───────────────────────────────

/**
 * Remove near-duplicate consecutive vertices (within epsilon distance).
 */
export function removeNearDuplicates(poly: Vec2[], epsilon = 1e-4): Vec2[] {
  if (poly.length < 2) return [...poly]
  const result: Vec2[] = [poly[0]!]
  for (let i = 1; i < poly.length; i++) {
    const prev = result[result.length - 1]!
    const curr = poly[i]!
    const dx = curr.x - prev.x
    const dy = curr.y - prev.y
    if (dx * dx + dy * dy > epsilon * epsilon) {
      result.push(curr)
    }
  }
  // Check if last == first
  if (result.length > 1) {
    const first = result[0]!
    const last = result[result.length - 1]!
    const dx = last.x - first.x
    const dy = last.y - first.y
    if (dx * dx + dy * dy <= epsilon * epsilon) {
      result.pop()
    }
  }
  return result
}

/**
 * Remove collinear vertices (vertices that lie on the line between neighbors).
 */
export function removeCollinear(poly: Vec2[], epsilon = 1e-6): Vec2[] {
  if (poly.length < 3) return [...poly]
  const result: Vec2[] = []
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n]!
    const curr = poly[i]!
    const next = poly[(i + 1) % n]!
    // Cross product of (curr-prev) × (next-curr)
    const cross = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x)
    if (Math.abs(cross) > epsilon) {
      result.push(curr)
    }
  }
  return result.length >= 3 ? result : poly
}

/**
 * Compute the signed area of a polygon (Shoelace formula).
 * Positive = CCW, Negative = CW.
 */
export function signedAreaOf(poly: Vec2[]): number {
  let area = 0
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += poly[i]!.x * poly[j]!.y
    area -= poly[j]!.x * poly[i]!.y
  }
  return area / 2
}

/**
 * Check if a polygon is wound counter-clockwise.
 */
export function isCCW(poly: Vec2[]): boolean {
  return signedAreaOf(poly) > 0
}

/**
 * Ensure CCW winding. Returns a new array if reversal is needed.
 */
export function ensureCCW(poly: Vec2[]): Vec2[] {
  return signedAreaOf(poly) < 0 ? [...poly].reverse() : poly
}

/**
 * Check if a simple polygon is valid (no self-intersections).
 * Uses the O(n²) brute-force segment intersection check.
 * Suitable for polygons with <200 vertices.
 */
export function isSimplePolygon(poly: Vec2[]): boolean {
  const n = poly.length
  if (n < 3) return false

  for (let i = 0; i < n; i++) {
    const a1 = poly[i]!
    const b1 = poly[(i + 1) % n]!

    for (let j = i + 2; j < n; j++) {
      // Skip adjacent edges (they share a vertex)
      if (j === (i + n - 1) % n) continue
      if ((j + 1) % n === i) continue

      const a2 = poly[j]!
      const b2 = poly[(j + 1) % n]!

      if (segmentsIntersect(a1, b1, a2, b2)) return false
    }
  }
  return true
}

/**
 * Test if two segments properly intersect (not counting shared endpoints).
 */
function segmentsIntersect(a1: Vec2, b1: Vec2, a2: Vec2, b2: Vec2): boolean {
  const d1x = b1.x - a1.x, d1y = b1.y - a1.y
  const d2x = b2.x - a2.x, d2y = b2.y - a2.y

  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < EPS) return false // Parallel

  const dx = a2.x - a1.x, dy = a2.y - a1.y
  const t = (dx * d2y - dy * d2x) / denom
  const u = (dx * d1y - dy * d1x) / denom

  // Proper intersection: strictly inside both segments (not at endpoints)
  return t > EPS && t < 1 - EPS && u > EPS && u < 1 - EPS
}

/**
 * Full polygon normalization pipeline:
 * 1) Remove near-duplicate vertices
 * 2) Ensure CCW winding
 * 3) Remove collinear vertices
 *
 * @returns The normalized polygon, or null if invalid (< 3 vertices).
 */
export function normalizePolygon(poly: Vec2[]): Vec2[] | null {
  let result = removeNearDuplicates(poly)
  if (result.length < 3) return null
  result = ensureCCW(result)
  result = removeCollinear(result)
  if (result.length < 3) return null
  return result
}

/**
 * Compute the absolute area of a polygon.
 */
export function polygonAreaAbs(poly: Vec2[]): number {
  return Math.abs(signedAreaOf(poly))
}

/**
 * Round polygon vertices to a fixed precision to avoid floating-point drift.
 */
export function roundPolygon(poly: Vec2[], decimals = 4): Vec2[] {
  const factor = Math.pow(10, decimals)
  return poly.map(p => ({
    x: Math.round(p.x * factor) / factor,
    y: Math.round(p.y * factor) / factor,
  }))
}

/**
 * Check if all vertices of `inner` are inside or on the boundary of `outer`.
 * Uses ray-casting point-in-polygon with epsilon tolerance.
 */
export function allVerticesInside(inner: Vec2[], outer: Vec2[], tolerance = 0.5): boolean {
  for (const p of inner) {
    if (!pointInPolygonTolerant(p, outer, tolerance)) return false
  }
  return true
}

/**
 * Point-in-polygon with boundary tolerance.
 * Returns true if the point is inside OR within `tolerance` distance of the boundary.
 */
function pointInPolygonTolerant(p: Vec2, poly: Vec2[], tolerance: number): boolean {
  // First check standard PIP
  let inside = false
  const n = poly.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = poly[i]!, pj = poly[j]!
    if (
      (pi.y > p.y) !== (pj.y > p.y) &&
      p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x
    ) {
      inside = !inside
    }
  }
  if (inside) return true

  // Check distance to boundary
  for (let i = 0; i < n; i++) {
    const a = poly[i]!, b = poly[(i + 1) % n]!
    const d = pointToSegmentDistance(p, a, b)
    if (d <= tolerance) return true
  }
  return false
}

/**
 * Distance from a point to a segment.
 */
function pointToSegmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x, aby = b.y - a.y
  const apx = p.x - a.x, apy = p.y - a.y
  const abLenSq = abx * abx + aby * aby
  if (abLenSq < EPS) {
    return Math.sqrt(apx * apx + apy * apy)
  }
  let t = (apx * abx + apy * aby) / abLenSq
  t = Math.max(0, Math.min(1, t))
  const closestX = a.x + abx * t
  const closestY = a.y + aby * t
  const dx = p.x - closestX
  const dy = p.y - closestY
  return Math.sqrt(dx * dx + dy * dy)
}
