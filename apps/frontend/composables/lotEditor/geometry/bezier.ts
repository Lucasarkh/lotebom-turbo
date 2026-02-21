// ─── Bezier curve utilities ──────────────────────────────
import type { Vec2, BezierCurve } from './types'
import { add, sub, scale, perpCW, normalize } from './vec2'

/**
 * Evaluate a cubic bezier at parameter t ∈ [0,1].
 */
export function bezierPoint(c: BezierCurve, t: number): Vec2 {
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t
  return {
    x: mt3 * c.p0.x + 3 * mt2 * t * c.cp1.x + 3 * mt * t2 * c.cp2.x + t3 * c.p3.x,
    y: mt3 * c.p0.y + 3 * mt2 * t * c.cp1.y + 3 * mt * t2 * c.cp2.y + t3 * c.p3.y,
  }
}

/**
 * Tangent (derivative) of cubic bezier at t.
 */
export function bezierTangent(c: BezierCurve, t: number): Vec2 {
  const mt = 1 - t
  const mt2 = mt * mt
  const t2 = t * t
  return {
    x: 3 * mt2 * (c.cp1.x - c.p0.x) + 6 * mt * t * (c.cp2.x - c.cp1.x) + 3 * t2 * (c.p3.x - c.cp2.x),
    y: 3 * mt2 * (c.cp1.y - c.p0.y) + 6 * mt * t * (c.cp2.y - c.cp1.y) + 3 * t2 * (c.p3.y - c.cp2.y),
  }
}

/**
 * Create a straight-line bezier (control points = ⅓ and ⅔ interpolations).
 */
export function straightBezier(a: Vec2, b: Vec2): BezierCurve {
  const d = sub(b, a)
  return {
    p0: { ...a },
    cp1: add(a, scale(d, 1 / 3)),
    cp2: add(a, scale(d, 2 / 3)),
    p3: { ...b },
  }
}

/**
 * Flatten a bezier curve to a polyline with the given number of segments.
 */
export function flattenBezier(c: BezierCurve, segments = 32): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i <= segments; i++) {
    pts.push(bezierPoint(c, i / segments))
  }
  return pts
}

/**
 * Offset a bezier curve to one side by the given distance.
 * Returns a polyline (exact offset of a bezier is not a bezier).
 */
export function offsetBezier(c: BezierCurve, distance: number, segments = 32): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const pt = bezierPoint(c, t)
    const tan = bezierTangent(c, t)
    const n = normalize(perpCW(tan))
    pts.push(add(pt, scale(n, distance)))
  }
  return pts
}

/**
 * Generate road surface polygon from a bezier centerline and half-width.
 */
export function roadSurfaceFromBezier(
  curve: BezierCurve,
  halfWidth: number,
  segments = 32,
): Vec2[] {
  const left = offsetBezier(curve, -halfWidth, segments)
  const right = offsetBezier(curve, halfWidth, segments)
  // Concatenate left forward + right reversed to form closed polygon
  return [...left, ...right.reverse()]
}

/**
 * Approximate bezier arc length via polyline sampling.
 */
export function bezierLength(c: BezierCurve, segments = 64): number {
  let length = 0
  let prev = bezierPoint(c, 0)
  for (let i = 1; i <= segments; i++) {
    const pt = bezierPoint(c, i / segments)
    const dx = pt.x - prev.x
    const dy = pt.y - prev.y
    length += Math.sqrt(dx * dx + dy * dy)
    prev = pt
  }
  return length
}

/**
 * Split a bezier at parameter t using De Casteljau's algorithm.
 */
export function splitBezier(c: BezierCurve, t: number): [BezierCurve, BezierCurve] {
  const { p0, cp1, cp2, p3 } = c

  const a = lerpV(p0, cp1, t)
  const b = lerpV(cp1, cp2, t)
  const cc = lerpV(cp2, p3, t)
  const d = lerpV(a, b, t)
  const e = lerpV(b, cc, t)
  const f = lerpV(d, e, t)

  return [
    { p0, cp1: a, cp2: d, p3: f },
    { p0: f, cp1: e, cp2: cc, p3 },
  ]
}

function lerpV(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}
