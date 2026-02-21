// ─── Snapping utilities ──────────────────────────────────
import type { Vec2 } from '../geometry/types'
import type { NodeId, TopoNode, TopoEdge, LoteamentoState } from './types'
import { dist } from '../geometry/vec2'
import { closestPointOnSegment } from '../geometry/intersection'
import { flattenBezier } from '../geometry/bezier'

export interface SnapResult {
  type: 'node' | 'edge_point' | 'lot_vertex' | 'block_edge'
  position: Vec2
  nodeId?: NodeId
  edgeId?: string
  lotId?: string
  vertexIndex?: number
  t?: number
}

/**
 * Try to snap a position to an existing node.
 */
export function snapToNode(
  pos: Vec2,
  state: LoteamentoState,
  snapRadius: number,
  excludeNodeIds: Set<NodeId> = new Set(),
): SnapResult | null {
  let bestDist = snapRadius
  let bestResult: SnapResult | null = null

  for (const node of state.nodes.values()) {
    if (excludeNodeIds.has(node.id)) continue
    const d = dist(pos, node.position)
    if (d < bestDist) {
      bestDist = d
      bestResult = { type: 'node', position: { ...node.position }, nodeId: node.id }
    }
  }

  return bestResult
}

/**
 * Try to snap a position onto an existing edge (for creating intersections).
 */
export function snapToEdge(
  pos: Vec2,
  state: LoteamentoState,
  snapRadius: number,
  excludeEdgeIds: Set<string> = new Set(),
): SnapResult | null {
  let bestDist = snapRadius
  let bestResult: SnapResult | null = null

  for (const edge of state.edges.values()) {
    if (excludeEdgeIds.has(edge.id)) continue

    // Flatten bezier to polyline, test each segment
    const polyline = flattenBezier(edge.curve, 32)
    for (let i = 0; i < polyline.length - 1; i++) {
      const p1 = polyline[i]!
      const p2 = polyline[i+1]!
      const pt = closestPointOnSeg(pos, p1, p2)
      const d = dist(pos, pt)
      if (d < bestDist) {
        bestDist = d
        bestResult = {
          type: 'edge_point',
          position: pt,
          edgeId: edge.id,
          t: (i + dist(p1, pt)/dist(p1, p2)) / (polyline.length - 1),
        }
      }
    }
  }

  return bestResult
}

/**
 * Snap to other lots' vertices (for "auto-grudar").
 */
export function snapToLot(
  pos: Vec2,
  state: LoteamentoState,
  snapRadius: number,
  excludeLotId?: string,
): SnapResult | null {
  let bestDist = snapRadius
  let bestResult: SnapResult | null = null

  for (const lot of state.lots.values()) {
    if (lot.id === excludeLotId) continue
    for (let i = 0; i < lot.polygon.length; i++) {
      const p = lot.polygon[i]!
      const d = dist(pos, p)
      if (d < bestDist) {
        bestDist = d
        bestResult = { type: 'lot_vertex', position: { ...p }, lotId: lot.id, vertexIndex: i }
      }
    }
  }

  return bestResult
}

/**
 * Snap to the block polygon boundary (road border, not center).
 */
export function snapToBlockBoundary(
  pos: Vec2,
  state: LoteamentoState,
  snapRadius: number,
): SnapResult | null {
  let bestDist = snapRadius
  let bestResult: SnapResult | null = null

  for (const block of state.blocks.values()) {
    const poly = block.polygon
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!
      const b = poly[(i + 1) % poly.length]!
      const pt = closestPointOnSeg(pos, a, b)
      const d = dist(pos, pt)
      if (d < bestDist) {
        bestDist = d
        bestResult = { type: 'block_edge', position: pt }
      }
    }
  }

  return bestResult
}

/**
 * Combined snap: node > edge > lot
 */
export function snap(
  pos: Vec2,
  state: LoteamentoState,
  snapRadius: number,
  excludeNodeIds: Set<NodeId> = new Set(),
  excludeEdgeIds: Set<string> = new Set(),
  options: { lotId?: string; snapLots?: boolean } = {},
): SnapResult | null {
  const nodeSnap = snapToNode(pos, state, snapRadius, excludeNodeIds)
  if (nodeSnap) return nodeSnap

  const edgeSnap = snapToEdge(pos, state, snapRadius, excludeEdgeIds)
  if (edgeSnap) return edgeSnap

  if (options.snapLots) {
    const lotSnap = snapToLot(pos, state, snapRadius, options.lotId)
    if (lotSnap) return lotSnap
  }

  return null
}

function closestPointOnSeg(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = { x: b.x - a.x, y: b.y - a.y }
  const ap = { x: p.x - a.x, y: p.y - a.y }
  const lenSq = ab.x * ab.x + ab.y * ab.y
  if (lenSq < 1e-10) return { ...a }
  let t = (ap.x * ab.x + ap.y * ab.y) / lenSq
  t = Math.max(0, Math.min(1, t))
  return { x: a.x + ab.x * t, y: a.y + ab.y * t }
}
