// ─── Polygon utilities ───────────────────────────────────
import type { Vec2, Polygon, AABB } from './types'
import { sub, cross, normalize, add } from './vec2'

/**
 * Compute signed area of a polygon. Positive = CCW, Negative = CW.
 */
export function signedArea(poly: Vec2[]): number {
  let area = 0
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const pi = poly[i]!
    const pj = poly[j]!
    area += pi.x * pj.y
    area -= pj.x * pi.y
  }
  return area / 2
}

/**
 * Compute area of polygon (always positive).
 */
export function polygonArea(poly: Vec2[]): number {
  return Math.abs(signedArea(poly))
}

/**
 * Ensure polygon is wound counter-clockwise.
 */
export function ensureCCW(poly: Vec2[]): Vec2[] {
  return signedArea(poly) < 0 ? [...poly].reverse() : poly
}

/**
 * Compute centroid of a polygon.
 */
export function centroid(poly: Vec2[]): Vec2 {
  let cx = 0, cy = 0
  const n = poly.length
  for (const p of poly) {
    cx += p.x
    cy += p.y
  }
  return { x: cx / n, y: cy / n }
}

/**
 * Compute AABB of a polygon.
 */
export function polygonAABB(poly: Vec2[]): AABB {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of poly) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } }
}

/**
 * Point-in-polygon test (ray casting).
 */
export function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  let inside = false
  const n = poly.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = poly[i]!
    const pj = poly[j]!
    if (
      (pi.y > p.y) !== (pj.y > p.y) &&
      p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x
    ) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Shrink (inset/offset) a polygon by a distance. Simple approach
 * that moves each edge inward and re-intersects. Works well for
 * convex-ish polygons.
 */
export function insetPolygon(poly: Vec2[], distance: number): Vec2[] {
  const n = poly.length
  if (n < 3 || distance <= 0) return poly

  // Ensure CCW for consistent inward normal (left)
  const pts = ensureCCW(poly)
  const result: Vec2[] = []

  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n]!
    const curr = pts[i]!
    const next = pts[(i + 1) % n]!

    // Edges
    const v1 = normalize(sub(curr, prev))
    const v2 = normalize(sub(next, curr))

    // Inward normals (90deg left rotation in Y-down SVG space for CCW)
    // Formula: {-v.y, v.x}
    const n1 = { x: -v1.y, y: v1.x }
    const n2 = { x: -v2.y, y: v2.x }

    // Bisector (avg of normals)
    const bisector = normalize(add(n1, n2))
    const cosHalf = n1.x * bisector.x + n1.y * bisector.y

    // Distance to the offset corner
    // L = d / cos(angle/2)
    // If cosHalf is very small (nearly 180deg corner), cap it to avoid infinity
    const offset = Math.abs(cosHalf) > 0.01 ? distance / cosHalf : distance

    result.push({
      x: curr.x + bisector.x * offset,
      y: curr.y + bisector.y * offset,
    })
  }

  return result
}

/**
 * Convert polygon points to an SVG path "d" string.
 */
export function polygonToSVGPath(poly: Vec2[], close = true): string {
  if (poly.length === 0) return ''
  const first = poly[0]!
  let d = `M ${first.x} ${first.y}`
  for (let i = 1; i < poly.length; i++) {
    const pt = poly[i]!
    d += ` L ${pt.x} ${pt.y}`
  }
  if (close) d += ' Z'
  return d
}

/**
 * Smooth a polygon by Chaikin's corner cutting.
 */
export function smoothPolygon(poly: Vec2[], iterations = 2): Vec2[] {
  let pts = [...poly]
  for (let iter = 0; iter < iterations; iter++) {
    const next: Vec2[] = []
    const n = pts.length
    for (let i = 0; i < n; i++) {
      const p0 = pts[i]!
      const p1 = pts[(i + 1) % n]!
      next.push({ x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y })
      next.push({ x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y })
    }
    pts = next
  }
  return pts
}
