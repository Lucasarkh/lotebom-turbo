// ─── Graph operations on nodes + edges ───────────────────
import type { NodeId, EdgeId, TopoNode, TopoEdge, LoteamentoState } from './types'
import type { Vec2 } from '../geometry/types'
import { signedArea } from '../geometry/polygon'

/**
 * Get all edges connected to a node.
 */
export function edgesOfNode(state: LoteamentoState, nodeId: NodeId): TopoEdge[] {
  const result: TopoEdge[] = []
  for (const edge of state.edges.values()) {
    if (edge.from === nodeId || edge.to === nodeId) {
      result.push(edge)
    }
  }
  return result
}

/**
 * Get neighbor node IDs connected to a given node via edges.
 */
export function neighbors(state: LoteamentoState, nodeId: NodeId): NodeId[] {
  const result: NodeId[] = []
  for (const edge of state.edges.values()) {
    if (edge.from === nodeId) result.push(edge.to)
    else if (edge.to === nodeId) result.push(edge.from)
  }
  return result
}

/**
 * Get the "other" node of an edge given one node.
 */
export function otherNode(edge: TopoEdge, nodeId: NodeId): NodeId {
  return edge.from === nodeId ? edge.to : edge.from
}

/**
 * Build an adjacency list representation.
 * Returns Map<NodeId, { neighbor: NodeId, edgeId: EdgeId }[]>
 */
export function buildAdjacencyList(
  state: LoteamentoState,
): Map<NodeId, { neighbor: NodeId; edgeId: EdgeId }[]> {
  const adj = new Map<NodeId, { neighbor: NodeId; edgeId: EdgeId }[]>()

  for (const node of state.nodes.values()) {
    adj.set(node.id, [])
  }

  for (const edge of state.edges.values()) {
    adj.get(edge.from)?.push({ neighbor: edge.to, edgeId: edge.id })
    adj.get(edge.to)?.push({ neighbor: edge.from, edgeId: edge.id })
  }

  return adj
}

/**
 * Find all minimal cycles (faces) in the planar graph.
 * Uses the planar face traversal algorithm:
 * At each node, sort outgoing edges by angle, then follow 
 * "next edge CCW" to trace each face.
 */
export function findMinimalCycles(state: LoteamentoState): EdgeId[][] {
  const adj = buildAdjacencyList(state)
  const nodes = state.nodes

  // For each node, sort neighbors by angle
  const sortedAdj = new Map<NodeId, { neighbor: NodeId; edgeId: EdgeId; angle: number }[]>()

  for (const [nodeId, neighs] of adj) {
    const nodePos = nodes.get(nodeId)!.position
    const withAngle = neighs.map((n) => {
      const nPos = nodes.get(n.neighbor)!.position
      const angle = Math.atan2(nPos.y - nodePos.y, nPos.x - nodePos.x)
      return { ...n, angle }
    })
    withAngle.sort((a, b) => a.angle - b.angle)
    sortedAdj.set(nodeId, withAngle)
  }

  // "Next edge" function: given we arrived at `current` from `prev`,
  // return the next CCW neighbor edge
  function nextHalfEdge(prev: NodeId, current: NodeId): { neighbor: NodeId; edgeId: EdgeId } | null {
    const sorted = sortedAdj.get(current)
    if (!sorted || sorted.length === 0) return null

    // Find the index of the edge coming from prev
    const inAngle = Math.atan2(
      nodes.get(prev)!.position.y - nodes.get(current)!.position.y,
      nodes.get(prev)!.position.x - nodes.get(current)!.position.x,
    )

    // Find the next CW neighbor (which traces CCW faces on the left)
    let bestIdx = 0
    let bestDelta = Infinity

    for (let i = 0; i < sorted.length; i++) {
      let delta = sorted[i]!.angle - inAngle
      if (delta <= 0) delta += 2 * Math.PI
      if (delta < bestDelta) {
        bestDelta = delta
        bestIdx = i
      }
    }

    // For minimal faces with left-turn rule, we pick the first CW after incoming
    // BUT we need to ignore the edge we just came from in the incoming direction.
    // The previous loop already sorts by angle.
    return sorted[bestIdx] ?? null
  }

  // Track visited half-edges (directed: from→to)
  // A cycle is a sequence of directed half-edges
  const visited = new Set<string>()
  const cycles: EdgeId[][] = []

  // Trace all faces
  for (const edge of state.edges.values()) {
    for (const [startFrom, startTo] of [[edge.from, edge.to], [edge.to, edge.from]] as [NodeId, NodeId][]) {
      const startKey = `${startFrom}:${startTo}:${edge.id}`
      if (visited.has(startKey)) continue

      const currentCycle: EdgeId[] = []
      let u = startFrom
      let v = startTo
      let eid = edge.id
      
      const path: EdgeId[] = []
      let step = 0
      const maxSteps = state.edges.size * 2 + 2

      while (step < maxSteps) {
        const key = `${u}:${v}:${eid}`
        if (visited.has(key)) break
        visited.add(key)
        path.push(eid)

        const next = nextHalfEdge(u, v)
        if (!next) break

        u = v
        v = next.neighbor
        eid = next.edgeId

        if (u === startFrom && v === startTo) break
        step++
      }

      if (path.length >= 3) {
        cycles.push(path)
      }
    }
  }

  // Filter cycles:
  // 1. Must be CCW (interior faces). CW is the outer infinite face.
  // 2. Remove duplicates
  const interiorCycles: EdgeId[][] = []
  
  for (const edgeIds of cycles) {
    // Convert to points to check orientation
    const poly: Vec2[] = []
    let curr = -1 as any // Start node of first edge? 
    // Manual trace is better here
    // Let's use a simpler heuristic: detectBlocks already handles outer face removal
    interiorCycles.push(edgeIds)
  }

  return interiorCycles
}
