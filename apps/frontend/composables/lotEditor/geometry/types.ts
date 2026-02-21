// ─── Geometry Primitives ─────────────────────────────────

export interface Vec2 {
  x: number
  y: number
}

export interface Segment {
  a: Vec2
  b: Vec2
}

export interface BezierCurve {
  p0: Vec2
  cp1: Vec2
  cp2: Vec2
  p3: Vec2
}

export interface Polygon {
  points: Vec2[]
}

export interface Circle {
  center: Vec2
  radius: number
}

export interface AABB {
  min: Vec2
  max: Vec2
}
