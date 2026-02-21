// ─── Topology domain types ───────────────────────────────
import type { Vec2, BezierCurve } from '../geometry/types'

// ─── IDs ─────────────────────────────────────────────────
export type NodeId = string
export type EdgeId = string
export type BlockId = string
export type LotId = string
export type RoundaboutId = string
export type NaturalElementId = string
export type TextLabelId = string

// ─── NODE ────────────────────────────────────────────────
export type NodeType = 'endpoint' | 'intersection' | 'roundabout_port'

export interface TopoNode {
  id: NodeId
  position: Vec2
  type: NodeType
  /** If roundabout_port, which roundabout it belongs to */
  roundaboutId?: RoundaboutId
}

// ─── EDGE (road segment) ────────────────────────────────
export interface TopoEdge {
  id: EdgeId
  from: NodeId
  to: NodeId
  curve: BezierCurve
  width: number  // pixels (full width)
  style: RoadStyle
}

export type RoadStyle = 'asphalt' | 'dirt' | 'cobblestone' | 'boulevard' | 'wall' | 'roundabout_internal'

// ─── ROUNDABOUT ──────────────────────────────────────────
export interface Roundabout {
  id: RoundaboutId
  center: Vec2
  radius: number
  ports: NodeId[]  // nodes sitting on the perimeter
}

// ─── BLOCK (quadra) ──────────────────────────────────────
export type BlockStatus = 'detected' | 'lots_generated'

export interface BlockGrid {
  /** Generation mode used */
  mode: 'dimensions' | 'grid'
  /** Frontage side index */
  frontSideIndex: number
  /** Width of each column (m) */
  frontage: number
  /** Depth of each row (m) */
  depths: number[]
  /** Number of columns */
  numCols: number
  /** Whether lots should automatically fit the perimeter exactly */
  autoFrame: boolean
  /** Whether lots should snap to each other when manually moved */
  autoSnap: boolean
}

export interface Block {
  id: BlockId
  /** Ordered list of edge IDs that form the boundary cycle */
  edgeCycle: EdgeId[]
  /** Computed polygon of the block interior (shrunk from road centerlines) */
  polygon: Vec2[]
  /** Logical sides (each is a flattened curve) for better lot generation */
  sides?: Vec2[][]
  status: BlockStatus
  lots: LotId[]
  /** Persisted generation settings for grid editing */
  grid?: BlockGrid
  /** When true, lots were manually edited and should NOT be auto-regenerated */
  manuallyEdited?: boolean
}

// ─── LOT ─────────────────────────────────────────────────
export type LotStatus = 'available' | 'reserved' | 'sold'

export interface Lot {
  id: LotId
  blockId: BlockId
  polygon: Vec2[]
  /** Area in square pixels (convert to m² on display) */
  area: number
  /** Front edge length in pixels */
  frontage: number
  /** Optional metadata overrides for real-world labeling */
  manualFrontage?: number
  manualDepth?: number
  status: LotStatus
  price: number | null
  conditions: string
  notes: string
  label: string
}

// ─── NATURAL ELEMENT ─────────────────────────────────────
export type NaturalElementKind = 'lake' | 'green_area' | 'institutional'

export interface NaturalElement {
  id: NaturalElementId
  kind: NaturalElementKind
  /** Control polygon (will be smoothed for display) */
  polygon: Vec2[]
  label: string
}

// ─── TEXT LABEL ──────────────────────────────────────────

export interface TextLabel {
  id: TextLabelId
  position: Vec2
  text: string
  fontSize: number
  color: string
  rotation: number
}

// ─── COMPLETE PROJECT STATE ──────────────────────────────
export interface LoteamentoState {
  nodes: Map<NodeId, TopoNode>
  edges: Map<EdgeId, TopoEdge>
  roundabouts: Map<RoundaboutId, Roundabout>
  blocks: Map<BlockId, Block>
  lots: Map<LotId, Lot>
  naturalElements: Map<NaturalElementId, NaturalElement>
  textLabels: Map<TextLabelId, TextLabel>
}
