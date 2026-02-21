// ─── Loteamento Editor Store (Pinia) ─────────────────────
import { defineStore } from 'pinia'
import { ref, computed, reactive, shallowRef, triggerRef } from 'vue'
import type {
  NodeId, EdgeId, BlockId, LotId, RoundaboutId, NaturalElementId, TextLabelId,
  TopoNode, TopoEdge, Block, Lot, Roundabout, NaturalElement, TextLabel,
  LoteamentoState, NodeType, RoadStyle, LotStatus,
  NaturalElementKind,
} from './topology/types'
import type { Vec2, BezierCurve } from './geometry/types'
import { straightBezier, splitBezier, bezierPoint } from './geometry/bezier'
import { dist, add, scale, normalize, sub, angleBetween } from './geometry/vec2'
import { segmentIntersection } from './geometry/intersection'
import { snap, snapToNode, snapToLot, snapToBlockBoundary } from './topology/snapping'
import { findMinimalCycles, buildAdjacencyList } from './topology/graph'
import { detectBlocks, averageRoadHalfWidth } from './topology/blockDetection'
import { generateLots } from './topology/lotGeneration'
import { polygonArea, pointInPolygon } from './geometry/polygon'
import { getTheme, type ThemeName } from './themes'

// ─── Editor modes / tools ────────────────────────────────
export type EditorTool =
  | 'select'
  | 'road'
  | 'wall'
  | 'roundabout'
  | 'prefab_block'
  | 'natural_lake'
  | 'natural_green'
  | 'natural_institutional'
  | 'lot_draw'
  | 'text'
  | 'pan'

export type SelectionTarget =
  | { type: 'node'; id: NodeId }
  | { type: 'edge'; id: EdgeId }
  | { type: 'block'; id: BlockId }
  | { type: 'lot'; id: LotId }
  | { type: 'roundabout'; id: RoundaboutId }
  | { type: 'natural'; id: NaturalElementId }
  | { type: 'text'; id: TextLabelId }
  | null

// ─── ID generator ────────────────────────────────────────
let _idCounter = 0
function uid(prefix: string): string {
  return `${prefix}_${++_idCounter}_${Date.now().toString(36)}`
}

// ─── Store ───────────────────────────────────────────────
export const useLoteamentoStore = defineStore('loteamento', () => {
  // ─── Core state (topology) ─────────────────────────────
  const nodes = reactive(new Map<NodeId, TopoNode>())
  const edges = reactive(new Map<EdgeId, TopoEdge>())
  const roundabouts = reactive(new Map<RoundaboutId, Roundabout>())
  const blocks = reactive(new Map<BlockId, Block>())
  const lots = reactive(new Map<LotId, Lot>())
  const naturalElements = reactive(new Map<NaturalElementId, NaturalElement>())
  const textLabels = reactive(new Map<TextLabelId, TextLabel>())

  // ─── View state ────────────────────────────────────────
  const viewOffset = ref<Vec2>({ x: 0, y: 0 })
  const viewZoom = ref(1)
  const themeName = ref<ThemeName>('maquete')
  const theme = computed(() => getTheme(themeName.value))

  // ─── Tool state ────────────────────────────────────────
  const activeTool = ref<EditorTool>('select')
  const selection = ref<SelectionTarget>(null)
  const selectedTargets = ref<NonNullable<SelectionTarget>[]>([]) // Use list of targets with types
  const roadWidth = ref(30)      // default road width in px
  const roadStyle = ref<RoadStyle>('asphalt')
  const wallWidth = ref(4)       // default wall width in px (thin line)
  const snapRadius = ref(20)
  const pixelsPerMeter = ref(10) // 10px = 1m
  const autoSnap = ref(false)
  const autoFrame = ref(false)

  // Prefab block settings (meters)
  const prefabWidth = ref(120)
  const prefabHeight = ref(50)

  // ─── Drawing state ─────────────────────────────────────
  const isDrawingRoad = ref(false)
  const roadDrawNodes = ref<NodeId[]>([]) 
  const isDrawingNatural = ref(false)
  const naturalDrawPoints = ref<Vec2[]>([])
  const isDrawingLot = ref(false)
  const lotDrawPoints = ref<Vec2[]>([])

  const cursorPos = ref<Vec2>({ x: 0, y: 0 })
  const snapIndicator = ref<Vec2 | null>(null)

  // ─── Roundabout placement ──────────────────────────────
  const roundaboutRadius = ref(50)
  const roundaboutPorts = ref(4)

  // ─── Selection targeting ────────────────────────────────
  const selectionTargetId = computed(() => selection.value?.id || null)

  // ─── Undo/Redo ─────────────────────────────────────────
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])

  // ─── Convenience: state snapshot for topology functions ─
  function getState(): LoteamentoState {
    return { nodes, edges, roundabouts, blocks, lots, naturalElements, textLabels }
  }

  // ─── SNAPSHOT/RESTORE for undo ─────────────────────────
  function takeSnapshot(): string {
    const data = {
      nodes: Array.from(nodes.entries()),
      edges: Array.from(edges.entries()),
      roundabouts: Array.from(roundabouts.entries()),
      blocks: Array.from(blocks.entries()),
      lots: Array.from(lots.entries()),
      naturalElements: Array.from(naturalElements.entries()),
      textLabels: Array.from(textLabels.entries()),
    }
    return JSON.stringify(data)
  }

  function restoreSnapshot(json: string) {
    const data = JSON.parse(json)
    nodes.clear()
    edges.clear()
    roundabouts.clear()
    blocks.clear()
    lots.clear()
    naturalElements.clear()
    textLabels.clear()
    for (const [k, v] of data.nodes) nodes.set(k, v)
    for (const [k, v] of data.edges) edges.set(k, v)
    for (const [k, v] of data.roundabouts) roundabouts.set(k, v)
    for (const [k, v] of data.blocks) blocks.set(k, v)
    for (const [k, v] of data.lots) lots.set(k, v)
    for (const [k, v] of data.naturalElements) naturalElements.set(k, v)
    if (data.textLabels) for (const [k, v] of data.textLabels) textLabels.set(k, v)
  }

  function pushUndo() {
    undoStack.value.push(takeSnapshot())
    redoStack.value = []
    // Keep stack bounded
    if (undoStack.value.length > 50) undoStack.value.shift()
  }

  function undo() {
    if (undoStack.value.length === 0) return
    redoStack.value.push(takeSnapshot())
    restoreSnapshot(undoStack.value.pop()!)
    // Snapshot already contains complete lot geometry — skip regeneration
    redetectBlocks(/* skipLotRegeneration */ true)
  }

  function redo() {
    if (redoStack.value.length === 0) return
    undoStack.value.push(takeSnapshot())
    restoreSnapshot(redoStack.value.pop()!)
    redetectBlocks(/* skipLotRegeneration */ true)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NODE OPERATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function addNode(pos: Vec2, type: NodeType = 'endpoint', roundaboutId?: RoundaboutId): NodeId {
    const id = uid('node')
    nodes.set(id, { id, position: { ...pos }, type, roundaboutId })
    return id
  }

  function moveNode(id: NodeId, pos: Vec2) {
    const node = nodes.get(id)
    if (!node) return
    const delta = sub(pos, node.position)
    node.position = { ...pos }
    
    // Update connected edges' bezier endpoints
    for (const edge of edges.values()) {
      if (edge.from === id) {
        edge.curve.p0 = { ...pos }
        edge.curve.cp1 = add(edge.curve.cp1, delta) // Translate control point to preserve curve character
      }
      if (edge.to === id) {
        edge.curve.p3 = { ...pos }
        edge.curve.cp2 = add(edge.curve.cp2, delta) // Translate control point
      }
    }
  }

  function removeNode(id: NodeId) {
    // Remove connected edges first
    const toRemove: EdgeId[] = []
    for (const edge of edges.values()) {
      if (edge.from === id || edge.to === id) toRemove.push(edge.id)
    }
    for (const eid of toRemove) edges.delete(eid)
    nodes.delete(id)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EDGE OPERATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function addEdge(fromId: NodeId, toId: NodeId, width?: number, style?: RoadStyle): EdgeId {
    const from = nodes.get(fromId)
    const to = nodes.get(toId)
    if (!from || !to) return ''

    const id = uid('edge')
    const curve = straightBezier(from.position, to.position)

    edges.set(id, {
      id,
      from: fromId,
      to: toId,
      curve,
      width: width ?? roadWidth.value,
      style: style ?? roadStyle.value,
    })

    // Update node types
    updateNodeType(fromId)
    updateNodeType(toId)

    return id
  }

  function removeEdge(id: EdgeId) {
    const edge = edges.get(id)
    if (!edge) return
    edges.delete(id)
    updateNodeType(edge.from)
    updateNodeType(edge.to)
  }

  function setEdgeStyle(id: EdgeId, style: RoadStyle, width?: number) {
    const edge = edges.get(id)
    if (!edge) return
    pushUndo()
    edge.style = style
    if (width !== undefined) edge.width = width
    redetectBlocks()
  }

  function toggleEdgeWall(id: EdgeId) {
    const edge = edges.get(id)
    if (!edge) return
    if (edge.style === 'wall') {
      setEdgeStyle(id, 'asphalt', roadWidth.value)
    } else {
      setEdgeStyle(id, 'wall', wallWidth.value)
    }
  }

  function updateNodeType(nodeId: NodeId) {
    const node = nodes.get(nodeId)
    if (!node || node.roundaboutId) return

    let count = 0
    for (const edge of edges.values()) {
      if (edge.from === nodeId || edge.to === nodeId) count++
    }
    node.type = count >= 3 ? 'intersection' : (count === 0 ? 'endpoint' : 'endpoint')
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ROAD DRAWING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function startRoadDraw(worldPos: Vec2) {
    pushUndo()
    isDrawingRoad.value = true

    // Check for snap
    const snapResult = snapToNode(worldPos, getState(), snapRadius.value)

    let nodeId: NodeId
    if (snapResult) {
      nodeId = snapResult.nodeId!
    } else {
      nodeId = addNode(worldPos)
    }

    roadDrawNodes.value = [nodeId]
  }

  function continueRoadDraw(worldPos: Vec2) {
    if (!isDrawingRoad.value || roadDrawNodes.value.length === 0) return

    const lastNodeId = roadDrawNodes.value[roadDrawNodes.value.length - 1]
    if (!lastNodeId) return

    // Check snap
    const snapResult = snap(
      worldPos,
      getState(),
      snapRadius.value,
      new Set([lastNodeId]),
    )

    let newNodeId: NodeId

    if (snapResult?.type === 'node') {
      newNodeId = snapResult.nodeId!
    } else if (snapResult?.type === 'edge_point') {
      // Split the edge and create intersection
      newNodeId = splitEdgeAtPoint(snapResult.edgeId!, snapResult.t!, snapResult.position)
    } else {
      newNodeId = addNode(worldPos)
    }

    // Create edge from last node to new node
    const isWall = activeTool.value === 'wall'
    addEdge(lastNodeId, newNodeId, isWall ? wallWidth.value : undefined, isWall ? 'wall' : undefined)

    roadDrawNodes.value.push(newNodeId)

    // Check for auto-intersection with existing edges
    checkAutoIntersections()

    // Re-detect blocks
    redetectBlocks()
  }

  function finishRoadDraw() {
    isDrawingRoad.value = false
    roadDrawNodes.value = []
    redetectBlocks()
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EDGE SPLITTING (for auto-intersection)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function splitEdgeAtPoint(edgeId: EdgeId, t: number, position: Vec2): NodeId {
    const edge = edges.get(edgeId)
    if (!edge) return addNode(position, 'intersection')

    // Create intersection node
    const nodeId = addNode(position, 'intersection')

    // Split the bezier
    const [curve1, curve2] = splitBezier(edge.curve, t)

    // Remove old edge
    const fromId = edge.from
    const toId = edge.to
    const width = edge.width
    const style = edge.style
    edges.delete(edgeId)

    // Create two new edges
    const e1Id = uid('edge')
    edges.set(e1Id, { id: e1Id, from: fromId, to: nodeId, curve: curve1, width, style })

    const e2Id = uid('edge')
    edges.set(e2Id, { id: e2Id, from: nodeId, to: toId, curve: curve2, width, style })

    updateNodeType(fromId)
    updateNodeType(toId)
    updateNodeType(nodeId)

    return nodeId
  }

  function checkAutoIntersections() {
    // For each pair of edges, check if they intersect
    const edgeList = Array.from(edges.values())

    for (let i = 0; i < edgeList.length; i++) {
      for (let j = i + 1; j < edgeList.length; j++) {
        const e1 = edgeList[i]!
        const e2 = edgeList[j]!

        // Skip edges that share a node
        if (e1.from === e2.from || e1.from === e2.to ||
            e1.to === e2.from || e1.to === e2.to) continue

        // Simple segment intersection (using endpoints as approximation)
        const n1a = nodes.get(e1.from)
        const n1b = nodes.get(e1.to)
        const n2a = nodes.get(e2.from)
        const n2b = nodes.get(e2.to)
        if (!n1a || !n1b || !n2a || !n2b) continue

        const result = segmentIntersection(
          { a: n1a.position, b: n1b.position },
          { a: n2a.position, b: n2b.position },
        )

        if (result && result.t > 0.01 && result.t < 0.99 && result.u > 0.01 && result.u < 0.99) {
          // Split both edges at the intersection
          const intNodeId = addNode(result.point, 'intersection')

          // Split edge 1
          const [c1a, c1b] = splitBezier(e1.curve, result.t)
          const e1from = e1.from, e1to = e1.to
          edges.delete(e1.id)
          const ne1a = uid('edge')
          edges.set(ne1a, { id: ne1a, from: e1from, to: intNodeId, curve: c1a, width: e1.width, style: e1.style })
          const ne1b = uid('edge')
          edges.set(ne1b, { id: ne1b, from: intNodeId, to: e1to, curve: c1b, width: e1.width, style: e1.style })

          // Split edge 2
          const [c2a, c2b] = splitBezier(e2.curve, result.u)
          const e2from = e2.from, e2to = e2.to
          edges.delete(e2.id)
          const ne2a = uid('edge')
          edges.set(ne2a, { id: ne2a, from: e2from, to: intNodeId, curve: c2a, width: e2.width, style: e2.style })
          const ne2b = uid('edge')
          edges.set(ne2b, { id: ne2b, from: intNodeId, to: e2to, curve: c2b, width: e2.width, style: e2.style })

          // Recursion needed since we modified the list
          return checkAutoIntersections()
        }
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BEZIER HANDLE EDITING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function setEdgeCurveHandle(edgeId: EdgeId, handleIndex: 1 | 2, pos: Vec2) {
    const edge = edges.get(edgeId)
    if (!edge) return
    if (handleIndex === 1) edge.curve.cp1 = { ...pos }
    else edge.curve.cp2 = { ...pos }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ROUNDABOUT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function addRoundabout(center: Vec2, radius?: number, numPorts?: number): RoundaboutId {
    pushUndo()
    const r = radius ?? roundaboutRadius.value
    const nPorts = numPorts ?? roundaboutPorts.value

    const rabId = uid('rab')
    const portIds: NodeId[] = []

    for (let i = 0; i < nPorts; i++) {
      const angle = (2 * Math.PI * i) / nPorts - Math.PI / 2
      const portPos: Vec2 = {
        x: center.x + r * Math.cos(angle),
        y: center.y + r * Math.sin(angle),
      }
      const nodeId = addNode(portPos, 'roundabout_port', rabId)
      portIds.push(nodeId)
    }

    // Internal edges between adjacent ports (for graph cycle detection).
    // These are marked as 'roundabout_internal' so RoadLayer skips them.
    for (let i = 0; i < portIds.length; i++) {
      const next = portIds[(i + 1) % portIds.length]!
      addEdge(portIds[i]!, next, 1, 'roundabout_internal')
    }

    roundabouts.set(rabId, {
      id: rabId,
      center: { ...center },
      radius: r,
      ports: portIds,
    })

    redetectBlocks()
    return rabId
  }

  function updateRoundabout(rabId: RoundaboutId, radius?: number) {
    const rab = roundabouts.get(rabId)
    if (!rab) return
    pushUndo()

    if (radius !== undefined) {
      rab.radius = radius
      // Reposition port nodes
      const nPorts = rab.ports.length
      for (let i = 0; i < nPorts; i++) {
        const angle = (2 * Math.PI * i) / nPorts - Math.PI / 2
        const portPos: Vec2 = {
          x: rab.center.x + radius * Math.cos(angle),
          y: rab.center.y + radius * Math.sin(angle),
        }
        moveNode(rab.ports[i]!, portPos)
      }
    }

    redetectBlocks()
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BLOCK DETECTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Create a rectangular block with specific dimensions in meters.
   * This simplifies making standard quadras.
   */
  function addPrefabBlock(center: Vec2, widthM: number, heightM: number) {
    pushUndo()
    const ppm = pixelsPerMeter.value
    const w = widthM * ppm
    const h = heightM * ppm

    // Snap radius: if a corner is within this distance of an existing node, reuse it.
    // This makes adjacent blocks share edges (roads) instead of duplicating them.
    const snapR = roadWidth.value * 1.5

    const corners: Vec2[] = [
      { x: center.x - w/2, y: center.y - h/2 },
      { x: center.x + w/2, y: center.y - h/2 },
      { x: center.x + w/2, y: center.y + h/2 },
      { x: center.x - w/2, y: center.y + h/2 },
    ]

    // For each corner, try to reuse an existing node within snap radius
    const nodeIds: NodeId[] = corners.map(pos => {
      let bestDist = snapR
      let bestId: NodeId | null = null
      for (const node of nodes.values()) {
        if (node.roundaboutId) continue // don't snap to roundabout ports
        const d = dist(pos, node.position)
        if (d < bestDist) {
          bestDist = d
          bestId = node.id
        }
      }
      return bestId ?? addNode(pos)
    })

    // Create edges only if they don't already exist between the same pair of nodes
    for (let i = 0; i < 4; i++) {
      const a = nodeIds[i]!
      const b = nodeIds[(i + 1) % 4]!
      if (a === b) continue
      // Check if edge already exists between a and b (in either direction)
      let exists = false
      for (const e of edges.values()) {
        if ((e.from === a && e.to === b) || (e.from === b && e.to === a)) {
          exists = true
          break
        }
      }
      if (!exists) addEdge(a, b)
    }

    // Detect new block
    redetectBlocks()
  }

  /**
   * Re-detect blocks from the planar graph.
   *
   * @param skipLotRegeneration  If true, do NOT auto-regenerate lots for blocks
   *   that already have saved lots.  Used after importData() / restoreSnapshot()
   *   so that a reload never silently mutates saved lot geometry.
   *   When called after a topology edit (move node, add road, etc.) the default
   *   behaviour (false) regenerates lots so they follow the new boundary.
   */
  function redetectBlocks(skipLotRegeneration = false) {
    try {
      // Preserve existing blocks that have lots
      const existingWithLots = new Map<string, Block>()
      for (const block of blocks.values()) {
        if (block.lots.length > 0) {
          const key = [...block.edgeCycle].sort().join(',')
          existingWithLots.set(key, block)
        }
      }

      blocks.clear()

      const cycles = findMinimalCycles(getState())
      const rawBlocks = detectBlocks(cycles, getState())

      for (const block of rawBlocks) {
        const key = [...block.edgeCycle].sort().join(',')
        const existing = existingWithLots.get(key)

        // Always calculate inset to get accurate boundary
        const insetAmount = averageRoadHalfWidth(block.edgeCycle, getState())
        const insetBlock = detectBlocks([block.edgeCycle], getState(), insetAmount)[0] || block

        if (existing) {
          // Update existing block boundary to follow current road geometry
          existing.polygon = insetBlock.polygon
          existing.sides = insetBlock.sides
          blocks.set(existing.id, existing)

          // If the block was manually edited, keep lots exactly where they are.
          // moveSelection already moves lots together with the block, so no
          // additional translation is needed here.
          if (existing.manuallyEdited || skipLotRegeneration) {
            // Do nothing — lots are already positioned correctly
          } else if (
            existing.grid &&
            (existing.grid.autoFrame || autoFrame.value)
          ) {
            // Auto-regenerate lots to follow the new boundary
            const currentOptions = {
              mode: existing.grid.mode || 'grid',
              frontage: existing.grid.frontage,
              depth: existing.grid.depths[0] ?? 20,
              rows: existing.grid.depths.length,
              cols: existing.grid.numCols,
              pixelsPerMeter: pixelsPerMeter.value,
            }
            const newLots = generateLots(existing, currentOptions)

            // Remove old lots
            for (const lid of existing.lots) lots.delete(lid)
            existing.lots = []

            // Add new lots
            for (const lot of newLots) {
              lots.set(lot.id, lot)
              existing.lots.push(lot.id)
            }
          }
        } else {
          blocks.set(insetBlock.id, insetBlock)
        }
      }

      // Clean up orphaned lots
      const activeBlockIds = new Set(blocks.keys())
      for (const [lotId, lot] of lots) {
        if (!activeBlockIds.has(lot.blockId)) {
          lots.delete(lotId)
        }
      }
    } catch (e) {
      console.error('Error during block detection:', e)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LOT GENERATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function generateBlockLots(
    blockId: BlockId,
    options: any = {},
  ) {
    const block = blocks.get(blockId)
    if (!block) return

    pushUndo()

    // Remove existing lots for this block
    const toRemove = Array.from(lots.values()).filter(l => l.blockId === blockId).map(l => l.id)
    for (const lid of toRemove) lots.delete(lid)

    const finalOptions = {
      ...options,
      pixelsPerMeter: pixelsPerMeter.value,
    }

    // Use preserved grid options if re-opening (no mode/frontage provided)
    if (block.grid && !options.mode && !options.frontage && !options.cols) {
      finalOptions.mode = block.grid.mode || 'grid'
      finalOptions.frontage = block.grid.frontage
      finalOptions.rows = block.grid.depths.length
      finalOptions.cols = block.grid.numCols
      finalOptions.depth = block.grid.depths[0] // fallback
    }

    const newLots = generateLots(block, finalOptions)

    block.lots = []
    for (const lot of newLots) {
      lots.set(lot.id, lot)
      block.lots.push(lot.id)
    }

    block.status = 'lots_generated'
    // Fresh generation resets manuallyEdited; user can choose to edit again
    block.manuallyEdited = false
  }

  function startLotDraw() {
    activeTool.value = 'lot_draw'
    isDrawingLot.value = true
    lotDrawPoints.value = []
  }

  function addLotDrawPoint(pos: Vec2) {
    // Snap to block boundary or nodes
    const snapResult = snap(pos, getState(), snapRadius.value)
    lotDrawPoints.value.push(snapResult ? snapResult.position : { ...pos })
  }

  function finishLotDraw() {
    if (lotDrawPoints.value.length < 3) {
      isDrawingLot.value = false
      lotDrawPoints.value = []
      return
    }

    // Find which block this corresponds to
    const c = lotDrawPoints.value[0]! // Using first point as proxy
    let foundBlockId: BlockId | null = null
    for (const block of blocks.values()) {
      if (pointInPolygon(c, block.polygon)) {
        foundBlockId = block.id
        break
      }
    }

    if (!foundBlockId) {
      isDrawingLot.value = false
      lotDrawPoints.value = []
      return
    }

    pushUndo()
    const block = blocks.get(foundBlockId)!
    const id = uid('lot')
    const area = polygonArea(lotDrawPoints.value)
    
    // Add lot
    const newLot: Lot = {
      id,
      blockId: foundBlockId,
      polygon: [...lotDrawPoints.value],
      area,
      frontage: 0, // Manual lot
      status: 'available',
      price: null,
      conditions: '',
      notes: '',
      label: `Lote ${block.lots.length + 1}`,
    }
    
    lots.set(id, newLot)
    block.lots.push(id)
    block.status = 'lots_generated'
    block.manuallyEdited = true

    isDrawingLot.value = false
    lotDrawPoints.value = []
    activeTool.value = 'select'
  }

  function updateBlockGridDepth(blockId: BlockId, rowIndex: number, deltaM: number) {
    const block = blocks.get(blockId)
    if (!block || !block.grid) return

    const depths = [...block.grid.depths]
    if (rowIndex < 0 || rowIndex >= depths.length) return

    // Limit delta so we don't zero out rows
    let safeDelta = deltaM
    if (depths[rowIndex]! + safeDelta < 2) safeDelta = 2 - depths[rowIndex]!
    if (rowIndex + 1 < depths.length) {
      if (depths[rowIndex + 1]! - safeDelta < 2) safeDelta = depths[rowIndex + 1]! - 2
    }

    // Apply delta to current row
    depths[rowIndex] = (depths[rowIndex] ?? 0) + safeDelta
    // If there's a next row, slide the divider (subtract from next)
    if (rowIndex + 1 < depths.length) {
      depths[rowIndex + 1] = (depths[rowIndex + 1] ?? 0) - safeDelta
    }
    
    block.grid.depths = depths
    generateBlockLots(blockId, {
      mode: block.grid.mode || 'grid',
      frontage: block.grid.frontage,
      rows: depths.length,
      cols: block.grid.numCols,
      depth: depths[0]!,
    })
  }

  function moveLotVertex(lotId: LotId, vertexIndex: number, pos: Vec2) {
    const lot = lots.get(lotId)
    if (!lot) return
    if (vertexIndex < 0 || vertexIndex >= lot.polygon.length) return

    // Mark the parent block as manually edited so auto-regen won't overwrite
    const parentBlock = blocks.get(lot.blockId)
    if (parentBlock) parentBlock.manuallyEdited = true

    let finalPos = { ...pos }
    if (autoSnap.value) {
      // For lot vertices, snap to other lots and block boundaries — NOT to road centerlines
      const lotSnap = snapToLot(pos, getState(), snapRadius.value, lot.id)
      if (lotSnap) {
        finalPos = lotSnap.position
      } else {
        const blockSnap = snapToBlockBoundary(pos, getState(), snapRadius.value)
        if (blockSnap) finalPos = blockSnap.position
      }
    }

    // Allow vertex to move freely — no hard block-boundary clamping

    lot.polygon[vertexIndex] = finalPos
    lot.area = polygonArea(lot.polygon)
  }

  /**
   * Move an entire lot by a delta vector.
   * Lots can be freely moved — no hard block-boundary constraint.
   */
  function moveLot(lotId: LotId, delta: Vec2) {
    const lot = lots.get(lotId)
    if (!lot) return
    const block = blocks.get(lot.blockId)

    // Mark the parent block as manually edited
    if (block) block.manuallyEdited = true

    // Apply the translation directly — user has full control
    for (let i = 0; i < lot.polygon.length; i++) {
      lot.polygon[i] = { x: lot.polygon[i]!.x + delta.x, y: lot.polygon[i]!.y + delta.y }
    }
    lot.area = polygonArea(lot.polygon)
  }

  function updateLot(lotId: LotId, updates: Partial<Pick<Lot, 'label' | 'status' | 'price' | 'conditions' | 'notes' | 'manualFrontage' | 'manualDepth'>>) {
    const lot = lots.get(lotId)
    if (!lot) return
    Object.assign(lot, updates)
  }

  /**
   * Duplicate a lot, placing the copy slightly offset from the original.
   */
  function duplicateLot(lotId: LotId): LotId | null {
    const lot = lots.get(lotId)
    if (!lot) return null
    const block = blocks.get(lot.blockId)
    if (!block) return null

    pushUndo()
    const newId = uid('lot')
    const offset = 10 // slight pixel offset
    const newPolygon = lot.polygon.map(p => ({ x: p.x + offset, y: p.y + offset }))
    const newLot: Lot = {
      id: newId,
      blockId: lot.blockId,
      polygon: newPolygon,
      area: lot.area,
      frontage: lot.frontage,
      manualFrontage: lot.manualFrontage,
      manualDepth: lot.manualDepth,
      status: 'available',
      price: null,
      conditions: lot.conditions,
      notes: '',
      label: `Lote ${block.lots.length + 1}`,
    }
    lots.set(newId, newLot)
    block.lots.push(newId)
    block.manuallyEdited = true
    return newId
  }

  /**
   * Create a new empty rectangular lot in the center of a block.
   */
  function addLotToBlock(blockId: BlockId): LotId | null {
    const block = blocks.get(blockId)
    if (!block || block.polygon.length < 3) return null

    pushUndo()

    // Compute block centroid
    let cx = 0, cy = 0
    for (const p of block.polygon) { cx += p.x; cy += p.y }
    cx /= block.polygon.length
    cy /= block.polygon.length

    // Create a small rectangular lot around the centroid
    const ppm = pixelsPerMeter.value
    const halfW = 5 * ppm  // 5m half-width → 10m frontage
    const halfH = 10 * ppm // 10m half-height → 20m depth
    const polygon: Vec2[] = [
      { x: cx - halfW, y: cy - halfH },
      { x: cx + halfW, y: cy - halfH },
      { x: cx + halfW, y: cy + halfH },
      { x: cx - halfW, y: cy + halfH },
    ]

    const newId = uid('lot')
    const newLot: Lot = {
      id: newId,
      blockId,
      polygon,
      area: polygonArea(polygon),
      frontage: halfW * 2,
      status: 'available',
      price: null,
      conditions: '',
      notes: '',
      label: `Lote ${block.lots.length + 1}`,
    }
    lots.set(newId, newLot)
    block.lots.push(newId)
    block.status = 'lots_generated'
    block.manuallyEdited = true
    return newId
  }

  /**
   * Remove a single lot by ID (with proper block cleanup).
   */
  function removeLot(lotId: LotId) {
    const lot = lots.get(lotId)
    if (!lot) return
    pushUndo()
    const block = blocks.get(lot.blockId)
    if (block) {
      block.lots = block.lots.filter(id => id !== lotId)
      block.manuallyEdited = true
      if (block.lots.length === 0) {
        block.grid = undefined
        block.status = 'detected'
        block.manuallyEdited = false
      }
    }
    lots.delete(lotId)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NATURAL ELEMENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function startNaturalDraw(kind: NaturalElementKind) {
    activeTool.value = `natural_${kind}` as EditorTool
    isDrawingNatural.value = true
    naturalDrawPoints.value = []
  }

  function addNaturalPoint(pos: Vec2) {
    naturalDrawPoints.value.push({ ...pos })
  }

  function finishNaturalDraw() {
    if (naturalDrawPoints.value.length < 3) {
      isDrawingNatural.value = false
      naturalDrawPoints.value = []
      return
    }

    pushUndo()
    const rawKind = activeTool.value.replace('natural_', '')
    // Map tool name fragment to NaturalElementKind
    const kindMap: Record<string, NaturalElementKind> = {
      'lake': 'lake',
      'green': 'green_area',
      'institutional': 'institutional',
    }
    const kind: NaturalElementKind = kindMap[rawKind] ?? 'institutional'
    const id = uid('nat')
    naturalElements.set(id, {
      id,
      kind,
      polygon: [...naturalDrawPoints.value],
      label: kind === 'lake' ? 'Lago' : kind === 'green_area' ? 'Área Verde' : 'Área Institucional',
    })

    isDrawingNatural.value = false
    naturalDrawPoints.value = []
    activeTool.value = 'select'
  }

  function updateNaturalElement(id: NaturalElementId, data: Partial<Pick<NaturalElement, 'polygon' | 'label'>>) {
    const el = naturalElements.get(id)
    if (!el) return
    Object.assign(el, data)
  }

  function removeNaturalElement(id: NaturalElementId) {
    pushUndo()
    naturalElements.delete(id)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEXT LABELS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const textFontSize = ref(16)
  const textColor = ref('#333333')

  function addTextLabel(position: Vec2, text: string): TextLabelId {
    pushUndo()
    const id = uid('txt')
    textLabels.set(id, {
      id,
      position: { ...position },
      text,
      fontSize: textFontSize.value,
      color: textColor.value,
      rotation: 0,
    })
    return id
  }

  function updateTextLabel(id: TextLabelId, data: Partial<Pick<TextLabel, 'text' | 'fontSize' | 'color' | 'rotation' | 'position'>>) {
    const label = textLabels.get(id)
    if (!label) return
    Object.assign(label, data)
  }

  function removeTextLabel(id: TextLabelId) {
    pushUndo()
    textLabels.delete(id)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VIEW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function pan(dx: number, dy: number) {
    viewOffset.value = {
      x: viewOffset.value.x + dx,
      y: viewOffset.value.y + dy,
    }
  }

  function zoom(factor: number, center: Vec2) {
    const newZoom = Math.max(0.1, Math.min(5, viewZoom.value * factor))
    const ratio = newZoom / viewZoom.value

    viewOffset.value = {
      x: center.x - (center.x - viewOffset.value.x) * ratio,
      y: center.y - (center.y - viewOffset.value.y) * ratio,
    }
    viewZoom.value = newZoom
  }

  function screenToWorld(screenPos: Vec2): Vec2 {
    return {
      x: (screenPos.x - viewOffset.value.x) / viewZoom.value,
      y: (screenPos.y - viewOffset.value.y) / viewZoom.value,
    }
  }

  function worldToScreen(worldPos: Vec2): Vec2 {
    return {
      x: worldPos.x * viewZoom.value + viewOffset.value.x,
      y: worldPos.y * viewZoom.value + viewOffset.value.y,
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SELECTION / TOOL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function selectTool(tool: EditorTool) {
    // Finish any ongoing draw
    if (isDrawingRoad.value) finishRoadDraw()
    if (isDrawingNatural.value) finishNaturalDraw()
    activeTool.value = tool
    if (tool !== 'select') {
      selection.value = null
      selectedTargets.value = []
    }
  }

  function select(target: SelectionTarget, multi = false, force = false) {
    if (!target) {
      selection.value = null
      selectedTargets.value = []
      return
    }

    if (multi) {
      const idx = selectedTargets.value.findIndex(t => t.id === target.id)
      if (idx >= 0) {
        if (!force) {
          selectedTargets.value.splice(idx, 1)
          if (selection.value?.id === target.id) {
            selection.value = selectedTargets.value.length > 0 ? selectedTargets.value[0]! : null
          }
        }
      } else {
        selectedTargets.value.push(target)
        selection.value = target
      }
    } else {
      selectedTargets.value = [target]
      selection.value = target
    }
  }

  function clearSelection() {
    selection.value = null
    selectedTargets.value = []
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MOVEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function moveSelection(delta: Vec2) {
    const nodesToMove = new Set<NodeId>()
    const rabsToMove = new Set<RoundaboutId>()
    const naturalToMove = new Set<NaturalElementId>()
    const lotsToMove = new Set<LotId>()
    const textsToMove = new Set<TextLabelId>()

    for (const target of selectedTargets.value) {
      if (target.type === 'node') nodesToMove.add(target.id)
      else if (target.type === 'edge') {
        const e = edges.get(target.id)
        if (e) { nodesToMove.add(e.from); nodesToMove.add(e.to) }
      } else if (target.type === 'block') {
        const b = blocks.get(target.id)
        if (b) {
          for (const eId of b.edgeCycle) {
            const e = edges.get(eId)
            if (e) { nodesToMove.add(e.from); nodesToMove.add(e.to) }
          }
          // Also move all child lots with the block
          for (const lid of b.lots) {
            lotsToMove.add(lid)
          }
        }
      } else if (target.type === 'roundabout') {
        rabsToMove.add(target.id)
      } else if (target.type === 'natural') {
        naturalToMove.add(target.id)
      } else if (target.type === 'lot') {
        lotsToMove.add(target.id)
      } else if (target.type === 'text') {
        textsToMove.add(target.id)
      }
    }

    // Nodes and connected road segments
    for (const nid of nodesToMove) {
      const n = nodes.get(nid)
      if (n) {
        n.position = add(n.position, delta)
        // Sync connected edges WITHOUT resetting hand-drawn curvature
        for (const e of edges.values()) {
          if (e.from === nid) {
            e.curve.p0 = { ...n.position }
            e.curve.cp1 = add(e.curve.cp1, delta) // Move handle with endpoint to preserve angle
          }
          if (e.to === nid) {
            e.curve.p3 = { ...n.position }
            e.curve.cp2 = add(e.curve.cp2, delta) // Move handle with endpoint
          }
        }
      }
    }

    // Roundabouts (move center and all ports + their connected edges)
    for (const rid of rabsToMove) {
      const rab = roundabouts.get(rid)
      if (rab) {
        rab.center = add(rab.center, delta)
        for (const pid of rab.ports) {
          const n = nodes.get(pid)
          if (n) {
            n.position = add(n.position, delta)
            // Update connected edges' bezier endpoints
            for (const e of edges.values()) {
              if (e.from === pid) {
                e.curve.p0 = { ...n.position }
                e.curve.cp1 = add(e.curve.cp1, delta)
              }
              if (e.to === pid) {
                e.curve.p3 = { ...n.position }
                e.curve.cp2 = add(e.curve.cp2, delta)
              }
            }
          }
        }
      }
    }

    // Natural
    for (const natid of naturalToMove) {
      const nat = naturalElements.get(natid)
      if (nat) {
        nat.polygon = nat.polygon.map(p => add(p, delta))
      }
    }

    // Lots
    for (const lid of lotsToMove) {
      const lot = lots.get(lid)
      if (lot) {
        lot.polygon = lot.polygon.map(p => add(p, delta))
        lot.area = polygonArea(lot.polygon)
      }
    }

    // Text labels
    for (const tid of textsToMove) {
      const label = textLabels.get(tid)
      if (label) {
        label.position = add(label.position, delta)
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DELETE SELECTED
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function deleteSelected() {
    if (selectedTargets.value.length === 0) return
    pushUndo()

    let deletedLots = false
    let deletedTopology = false
    for (const sel of selectedTargets.value) {
      if (sel.type === 'node') {
        deletedTopology = true
        removeNode(sel.id)
      } else if (sel.type === 'edge') {
        deletedTopology = true
        removeEdge(sel.id)
      } else if (sel.type === 'natural') {
        removeNaturalElement(sel.id)
      } else if (sel.type === 'roundabout') {
        const rab = roundabouts.get(sel.id)
        if (rab) {
          deletedTopology = true
          for (const portId of rab.ports) removeNode(portId)
          roundabouts.delete(sel.id)
        }
      } else if (sel.type === 'block') {
        const block = blocks.get(sel.id)
        if (block) {
          // Remove all lots belonging to this block
          for (const lotId of block.lots) {
            lots.delete(lotId)
          }
          blocks.delete(sel.id)
        }
      } else if (sel.type === 'lot') {
        deletedLots = true
        const lot = lots.get(sel.id)
        if (lot) {
          const b = blocks.get(lot.blockId)
          if (b) {
            b.lots = b.lots.filter(id => id !== sel.id)
            b.manuallyEdited = true
            // If all lots removed, clear grid so auto-regeneration won't recreate them
            if (b.lots.length === 0) {
              b.grid = undefined
              b.status = 'detected'
              b.manuallyEdited = false
            }
          }
          lots.delete(sel.id)
        }
      } else if (sel.type === 'text') {
        textLabels.delete(sel.id)
      }
    }

    clearSelection()
    // Only redetect blocks if we changed topology (nodes/edges/roundabouts), not just lots
    if (deletedTopology) redetectBlocks()
  }



  function isSelected(type: string, id: string) {
    return selectedTargets.value.some(t => t.type === type && t.id === id)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMPUTED
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const selectedLot = computed(() => {
    if (selection.value?.type === 'lot') return lots.get(selection.value.id) ?? null
    return null
  })

  const selectedBlock = computed(() => {
    if (selection.value?.type === 'block') return blocks.get(selection.value.id) ?? null
    return null
  })

  const selectedBlocksCount = computed(() => {
    return selectedTargets.value.filter(t => t.type === 'block').length
  })

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  const stats = computed(() => ({
    nodes: nodes.size,
    edges: edges.size,
    blocks: blocks.size,
    lots: lots.size,
    totalArea: Array.from(lots.values()).reduce((sum, l) => sum + l.area, 0),
  }))

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EXPORT / IMPORT (serialization)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function exportData(): string {
    return takeSnapshot()
  }

  function importData(json: string) {
    pushUndo()
    restoreSnapshot(json)
    // Skip lot regeneration: use the persisted lot polygons as-is.
    // This guarantees lots don't change on reload.
    redetectBlocks(/* skipLotRegeneration */ true)
  }

  function clearAll() {
    pushUndo()
    nodes.clear()
    edges.clear()
    roundabouts.clear()
    blocks.clear()
    lots.clear()
    naturalElements.clear()
    textLabels.clear()
  }

  // ─── Return ────────────────────────────────────────────
  return {
    // State
    nodes, edges, roundabouts, blocks, lots, naturalElements, textLabels,
    viewOffset, viewZoom, themeName, theme,
    activeTool, selection, roadWidth, roadStyle, wallWidth, snapRadius,
    pixelsPerMeter, prefabWidth, prefabHeight,
    isDrawingRoad, roadDrawNodes, cursorPos, snapIndicator,
    isDrawingNatural, naturalDrawPoints,
    roundaboutRadius, roundaboutPorts,
    textFontSize, textColor,

    // Computed
    selectedLot, selectedBlock, selectedBlocksCount, canUndo, canRedo, stats,

    // Node ops
    addNode, moveNode, removeNode,

    // Edge ops
    addEdge, removeEdge, setEdgeCurveHandle, splitEdgeAtPoint,
    setEdgeStyle, toggleEdgeWall,

    // Road drawing
    startRoadDraw, continueRoadDraw, finishRoadDraw,

    // Roundabout
    addRoundabout, updateRoundabout,

    // Blocks
    redetectBlocks, addPrefabBlock,

    // Lots
    generateBlockLots, moveLotVertex, moveLot, updateLot,
    duplicateLot, addLotToBlock, removeLot,
    isDrawingLot, lotDrawPoints,
    startLotDraw, addLotDrawPoint, finishLotDraw,

    // Natural
    startNaturalDraw, addNaturalPoint, finishNaturalDraw,
    updateNaturalElement, removeNaturalElement,

    // Text labels
    addTextLabel, updateTextLabel, removeTextLabel,

    // View
    pan, zoom, screenToWorld, worldToScreen,

    // Selection / Tool
    selectTool, select, clearSelection, deleteSelected,
    selectedTargets, moveSelection, isSelected,
    autoSnap, autoFrame, updateBlockGridDepth,

    // Undo / Redo
    undo, redo, pushUndo,

    // Import / Export
    exportData, importData, clearAll,
  }
})
