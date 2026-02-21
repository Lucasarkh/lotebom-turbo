// ─── Core Vector Math ────────────────────────────────────
import type { Vec2 } from './types'

export function vec(x: number, y: number): Vec2 {
  return { x, y }
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s }
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x
}

export function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

export function lengthSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v)
  if (len < 1e-10) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

export function perpCW(v: Vec2): Vec2 {
  return { x: v.y, y: -v.x }
}

export function perpCCW(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x }
}

export function dist(a: Vec2, b: Vec2): number {
  return length(sub(b, a))
}

export function distSq(a: Vec2, b: Vec2): number {
  return lengthSq(sub(b, a))
}

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export function mid(a: Vec2, b: Vec2): Vec2 {
  return lerp(a, b, 0.5)
}

export function rotate(v: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }
}

export function rotateAround(point: Vec2, center: Vec2, angle: number): Vec2 {
  return add(rotate(sub(point, center), angle), center)
}

export function angleBetween(a: Vec2, b: Vec2): number {
  return Math.atan2(b.y - a.y, b.x - a.x)
}

/** Clamp a value between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}
