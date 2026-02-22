// ─── Block detection ─────────────────────────────────────
// Given a planar graph of road network, detect closed regions (blocks/quadras).

import type { LoteamentoState, Block, BlockId, EdgeId, NodeId } from './types'
import type { Vec2 } from '../geometry/types'
import { signedArea, pointInPolygon, insetPolygon } from '../geometry/polygon'
import { flattenBezier } from '../geometry/bezier'

let blockCounter = 0

function genBlockId(): BlockId {
  return `block_${++blockCounter}_${Date.now().toString(36)}`
}

/**
 * Given a cycle of edge IDs, compute the polygon boundary by
 * tracing edge curves in sequence. Returns the full polygon and
 * the individual sides.
 */
function cycleToPolygon(edgeCycle: EdgeId[], state: LoteamentoState): { fullPolygon: Vec2[]; sides: Vec2[][] } | null {
  if (edgeCycle.length < 3) return null

  // 1) Find correct starting orientation
  const firstEdge = state.edges.get(edgeCycle[0]!)
  const secondEdge = state.edges.get(edgeCycle[1]!)
  if (!firstEdge || !secondEdge) return null

  let currentNode: NodeId
  // Shared node between 0 and 1
  if (firstEdge.to === secondEdge.from || firstEdge.to === secondEdge.to) {
    currentNode = firstEdge.from
  } else {
    currentNode = firstEdge.to
  }

  const fullPolygon: Vec2[] = []
  const sides: Vec2[][] = []

  for (const edgeId of edgeCycle) {
    const edge = state.edges.get(edgeId)
    if (!edge) continue

    const pts = flattenBezier(edge.curve, 16)
    const side: Vec2[] = []
    
    if (edge.from === currentNode) {
      // Forward
      for (let i = 0; i < pts.length - 1; i++) {
        fullPolygon.push(pts[i]!)
        side.push(pts[i]!)
      }
      side.push(pts[pts.length - 1]!) // Final point
      currentNode = edge.to
    } else {
      // Reverse
      for (let i = pts.length - 1; i > 0; i--) {
        fullPolygon.push(pts[i]!)
        side.push(pts[i]!)
      }
      side.push(pts[0]!) // Final point
      currentNode = edge.from
    }
    sides.push(side)
  }

  if (fullPolygon.length < 3) return null
  return { fullPolygon, sides }
}

/**
 * Detect blocks from the edge cycles found by graph.findMinimalCycles.
 * Filters out the outer (infinite) face and degenerate cycles.
 */
export function detectBlocks(
  edgeCycles: EdgeId[][],
  state: LoteamentoState,
  roadInset = 0,
): Block[] {
  const blocks: Block[] = []

  for (const cycle of edgeCycles) {
    const result = cycleToPolygon(cycle, state)
    if (!result || result.fullPolygon.length < 3) continue

    const { fullPolygon, sides } = result

    // Compute signed area — skip the outer face (largest negative or largest area)
    const areaValue = signedArea(fullPolygon)
    // Very small areas are degenerate
    if (Math.abs(areaValue) < 100) continue

    // Ensure CCW
    let polygon = areaValue < 0 ? [...fullPolygon].reverse() : fullPolygon
    let orientedSides = areaValue < 0 ? [...sides].reverse() : sides
    if (areaValue < 0) {
      orientedSides = orientedSides.map(s => [...s].reverse())
    }

    // Optionally inset the polygon to account for road width
    let finalPolygon = polygon
    let finalSides = orientedSides

    if (roadInset > 0) {
      finalPolygon = insetPolygon(polygon, roadInset)
      
      // Re-calculate sides by splitting the finalPolygon back 
      // into original edge segments based on point counts.
      let currentIdx = 0
      const newSides: Vec2[][] = []
      for (const side of orientedSides) {
        const numPts = side.length - 1 // We don't want to double-count overlap
        const newSide: Vec2[] = []
        for (let i = 0; i <= numPts; i++) {
          newSide.push(finalPolygon[(currentIdx + i) % finalPolygon.length]!)
        }
        newSides.push(newSide)
        currentIdx += numPts
      }
      finalSides = newSides
    }

    blocks.push({
      id: genBlockId(),
      label: `Q${blocks.length + 1}`,
      edgeCycle: cycle,
      polygon: finalPolygon,
      sides: finalSides,
      status: 'detected',
      lots: [],
    })
  }

  // If we got multiple blocks, filter out the outer face
  // (it's typically the one with the largest area)
  if (blocks.length > 1) {
    let maxArea = 0
    let maxIdx = 0
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i]!
      const a = Math.abs(signedArea(b.polygon))
      // Also check if any node of any road is inside this polygon
      // The outer face contains ALL other nodes.
      let insideCount = 0
      const sampleNodes = Array.from(state.nodes.values()).slice(0, 10)
      for (const node of sampleNodes) {
        if (pointInPolygon(node.position, b.polygon)) insideCount++
      }

      if (a > maxArea || insideCount > (sampleNodes.length / 2)) {
        maxArea = a
        maxIdx = i
      }
    }
    blocks.splice(maxIdx, 1)

    // Re-label blocks after splicing to keep numbering sequential
    for (let i = 0; i < blocks.length; i++) {
      blocks[i]!.label = `Q${i + 1}`
    }
  }

  return blocks
}

/**
 * Compute the average edge half-width for a set of edges.
 * Used to inset block polygons from road centerlines.
 */
export function averageRoadHalfWidth(edgeIds: EdgeId[], state: LoteamentoState): number {
  let total = 0
  let count = 0
  for (const eid of edgeIds) {
    const e = state.edges.get(eid)
    if (e && e.style !== 'roundabout_internal') {
      // Walls have very thin width, use their actual width
      total += e.width / 2
      count++
    }
  }
  return count > 0 ? total / count : 10
}
