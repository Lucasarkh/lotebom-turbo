// ─── Segment & Line intersection ─────────────────────────
import type { Vec2, Segment } from './types'
import { sub, cross, add, scale } from './vec2'

export interface IntersectionResult {
  point: Vec2
  t: number // parameter on segment1 [0..1]
  u: number // parameter on segment2 [0..1]
}

/**
 * Find the intersection point of two line segments.
 * Returns null if segments are parallel or do not intersect.
 */
export function segmentIntersection(
  s1: Segment,
  s2: Segment,
  epsilon = 1e-8
): IntersectionResult | null {
  const d1 = sub(s1.b, s1.a)
  const d2 = sub(s2.b, s2.a)
  const denom = cross(d1, d2)

  if (Math.abs(denom) < epsilon) return null // parallel

  const d = sub(s2.a, s1.a)
  const t = cross(d, d2) / denom
  const u = cross(d, d1) / denom

  if (t < -epsilon || t > 1 + epsilon || u < -epsilon || u > 1 + epsilon) {
    return null
  }

  return {
    point: add(s1.a, scale(d1, t)),
    t: Math.max(0, Math.min(1, t)),
    u: Math.max(0, Math.min(1, u)),
  }
}

/**
 * Find closest point on a segment to a given point.
 */
export function closestPointOnSegment(p: Vec2, seg: Segment): { point: Vec2; t: number } {
  const ab = sub(seg.b, seg.a)
  const ap = sub(p, seg.a)
  const abLenSq = ab.x * ab.x + ab.y * ab.y

  if (abLenSq < 1e-12) {
    return { point: { ...seg.a }, t: 0 }
  }

  let t = (ap.x * ab.x + ap.y * ab.y) / abLenSq
  t = Math.max(0, Math.min(1, t))

  return {
    point: add(seg.a, scale(ab, t)),
    t,
  }
}

/**
 * Distance from a point to a segment.
 */
export function pointToSegmentDist(p: Vec2, seg: Segment): number {
  const { point } = closestPointOnSegment(p, seg)
  const dx = p.x - point.x
  const dy = p.y - point.y
  return Math.sqrt(dx * dx + dy * dy)
}
