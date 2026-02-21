/* ─── Map Editor Types ───────────────────────── */

export type MapElementType = 'LOT' | 'ROAD' | 'ROUNDABOUT' | 'LAKE' | 'GREEN' | 'LABEL' | 'PATH' | 'POLYGON'
export type GeometryType = 'POLYGON' | 'POLYLINE' | 'CIRCLE' | 'RECT'

export interface Point {
  x: number
  y: number
}

export interface StyleJson {
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  fontSize?: number
  fontFamily?: string
  fontColor?: string
  dash?: number[]
}

export interface GeometryJson {
  /** POLYGON / POLYLINE – flat array [x1,y1,x2,y2,...] */
  points?: number[]
  /** RECT */
  x?: number
  y?: number
  width?: number
  height?: number
  /** CIRCLE */
  radius?: number
  /** Rotation in degrees */
  rotation?: number
}

export interface MapElementData {
  id?: string
  type: MapElementType
  name?: string
  code?: string
  geometryType: GeometryType
  geometryJson: GeometryJson
  styleJson?: StyleJson
  metaJson?: Record<string, any>
}

/**
 * Smart tools: each represents a real-world object the user wants to add.
 * Internally maps to the correct geometry tool + element type.
 */
export type SmartTool =
  | 'select'
  | 'pan'
  | 'lot'
  | 'lot-rect'
  | 'lot-grid'
  | 'road'
  | 'green'
  | 'lake'
  | 'roundabout'
  | 'label'
  | 'polygon'

// Keep backward compat for internal drawing engine
export type EditorTool =
  | 'select'
  | 'pan'
  | 'polygon'
  | 'rect'
  | 'circle'
  | 'polyline'
  | 'label'

/** Info about each smart tool for UI display */
export interface SmartToolInfo {
  key: SmartTool
  label: string
  description: string
  icon: string
  shortcut?: string
  createsType?: MapElementType
  internalTool?: EditorTool
  category: 'navigate' | 'lots' | 'infrastructure' | 'other'
}

export const SMART_TOOLS: SmartToolInfo[] = [
  { key: 'select', label: 'Selecionar', description: 'Clique para selecionar e mover', icon: '🖱️', shortcut: 'V', category: 'navigate' },
  { key: 'pan', label: 'Mover Mapa', description: 'Arraste para navegar pelo mapa', icon: '✋', shortcut: 'H', category: 'navigate' },
  { key: 'lot', label: 'Lote (livre)', description: 'Desenhe um lote clicando nos cantos', icon: '📐', shortcut: 'L', createsType: 'LOT', internalTool: 'polygon', category: 'lots' },
  { key: 'lot-rect', label: 'Lote (retangular)', description: 'Um clique cria um lote retangular', icon: '⬜', shortcut: 'R', createsType: 'LOT', internalTool: 'rect', category: 'lots' },
  { key: 'lot-grid', label: 'Grade de Lotes', description: 'Crie vários lotes de uma vez', icon: '⊞', shortcut: 'G', createsType: 'LOT', internalTool: 'rect', category: 'lots' },
  { key: 'road', label: 'Rua / Caminho', description: 'Desenhe ruas clicando no trajeto', icon: '🛣️', shortcut: 'S', createsType: 'ROAD', internalTool: 'polyline', category: 'infrastructure' },
  { key: 'green', label: 'Área Verde', description: 'Marque praças e áreas verdes', icon: '🌳', shortcut: 'A', createsType: 'GREEN', internalTool: 'polygon', category: 'infrastructure' },
  { key: 'lake', label: 'Lago / Água', description: 'Marque lagos e espelhos d\'água', icon: '💧', shortcut: 'W', createsType: 'LAKE', internalTool: 'polygon', category: 'infrastructure' },
  { key: 'roundabout', label: 'Rotatória', description: 'Um clique cria uma rotatória', icon: '⭕', shortcut: 'O', createsType: 'ROUNDABOUT', internalTool: 'circle', category: 'infrastructure' },
  { key: 'label', label: 'Texto / Rótulo', description: 'Nomeie ruas, quadras e áreas', icon: '🏷️', shortcut: 'T', createsType: 'LABEL', internalTool: 'label', category: 'other' },
  { key: 'polygon', label: 'Área Genérica', description: 'Desenhe qualquer forma livre', icon: '⬡', shortcut: 'P', createsType: 'POLYGON', internalTool: 'polygon', category: 'other' },
]

export const MAP_ELEMENT_COLORS: Record<MapElementType, string> = {
  LOT: '#22c55e',
  ROAD: '#94a3b8',
  ROUNDABOUT: '#a78bfa',
  LAKE: '#38bdf8',
  GREEN: '#4ade80',
  LABEL: '#f59e0b',
  PATH: '#fb923c',
  POLYGON: '#e2e8f0',
}

export const MAP_ELEMENT_LABELS: Record<MapElementType, string> = {
  LOT: 'Lote',
  ROAD: 'Rua',
  ROUNDABOUT: 'Rotatória',
  LAKE: 'Lago',
  GREEN: 'Área Verde',
  LABEL: 'Rótulo',
  PATH: 'Caminho',
  POLYGON: 'Polígono',
}

export const DEFAULT_STYLE: Record<MapElementType, StyleJson> = {
  LOT:        { fill: '#22c55e33', stroke: '#22c55e', strokeWidth: 2, opacity: 1 },
  ROAD:       { fill: '#94a3b833', stroke: '#94a3b8', strokeWidth: 2, opacity: 1 },
  ROUNDABOUT: { fill: '#a78bfa33', stroke: '#a78bfa', strokeWidth: 2, opacity: 1 },
  LAKE:       { fill: '#38bdf833', stroke: '#38bdf8', strokeWidth: 2, opacity: 1 },
  GREEN:      { fill: '#4ade8033', stroke: '#4ade80', strokeWidth: 2, opacity: 1 },
  LABEL:      { fill: 'transparent', stroke: 'transparent', strokeWidth: 0, opacity: 1, fontSize: 16, fontFamily: 'Inter', fontColor: '#1e293b' },
  PATH:       { fill: 'transparent', stroke: '#fb923c', strokeWidth: 3, opacity: 1 },
  POLYGON:    { fill: '#e2e8f033', stroke: '#e2e8f0', strokeWidth: 2, opacity: 1 },
}

/** Lot grid configuration for the quick grid tool */
export interface LotGridConfig {
  rows: number
  cols: number
  lotWidth: number
  lotHeight: number
  gap: number
  startX: number
  startY: number
  blockName: string
  startNumber: number
  rotation: number
}

/** Editor step for the guided workflow */
export type EditorStep = 'image' | 'draw' | 'data'

export const EDITOR_STEPS = [
  { key: 'image' as EditorStep, label: 'Imagem Base', icon: '🖼️', description: 'Envie a planta do loteamento' },
  { key: 'draw' as EditorStep, label: 'Desenhar', icon: '✏️', description: 'Marque lotes, ruas e áreas' },
  { key: 'data' as EditorStep, label: 'Dados', icon: '📋', description: 'Preencha preços e detalhes' },
]
