/* ─── LEGO-Style Map Editor Types ──────────────────────── */

// ─── Backend-compatible enums ─────────────────────────
export type MapElementType = 'LOT' | 'ROAD' | 'ROUNDABOUT' | 'LAKE' | 'GREEN' | 'LABEL' | 'PATH' | 'POLYGON'
export type GeometryType = 'POLYGON' | 'POLYLINE' | 'CIRCLE' | 'RECT'

// ─── Core data types ─────────────────────────────────
export interface Point { x: number; y: number }

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
  points?: number[]
  x?: number
  y?: number
  width?: number
  height?: number
  radius?: number
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

// ─── Tile System ─────────────────────────────────────
export type TileCategory = 'road' | 'lot' | 'nature' | 'structure'

export interface TileDefinition {
  id: string
  name: string
  icon: string
  category: TileCategory
  gridW: number
  gridH: number
  rotatable: boolean
  rotationStep: number
  mapType: MapElementType
  geometryType: GeometryType
  defaultStyle: StyleJson
  description: string
}

export type KonvaShapeType = 'rect' | 'circle' | 'line' | 'arc' | 'text' | 'ellipse' | 'ring'

export interface TileRenderShape {
  type: KonvaShapeType
  config: Record<string, any>
}

// ─── Editor State Types ──────────────────────────────
export type EditorMode = 'place' | 'select' | 'pan' | 'erase'
export type EditorStep = 'image' | 'build' | 'data'

export const EDITOR_STEPS = [
  { key: 'image' as EditorStep, label: 'Imagem', icon: 'IMG', description: 'Envie planta base (opcional)' },
  { key: 'build' as EditorStep, label: 'Montar', icon: 'BUILD', description: 'Monte o loteamento' },
  { key: 'data' as EditorStep, label: 'Dados', icon: 'DATA', description: 'Preencha preços e detalhes' },
]

// ─── Tile Catalog ────────────────────────────────────
export const TILE_CATALOG: TileDefinition[] = [
  // Roads
  { id: 'road-straight', name: 'Rua Reta', icon: '━', category: 'road', gridW: 1, gridH: 1, rotatable: true, rotationStep: 90, mapType: 'ROAD', geometryType: 'RECT', defaultStyle: { fill: '#475569', stroke: '#334155', strokeWidth: 0.5 }, description: 'Segmento de rua reta' },
  { id: 'road-curve', name: 'Curva', icon: '╮', category: 'road', gridW: 1, gridH: 1, rotatable: true, rotationStep: 90, mapType: 'ROAD', geometryType: 'RECT', defaultStyle: { fill: '#475569', stroke: '#334155', strokeWidth: 0.5 }, description: 'Curva de 90°' },
  { id: 'road-t', name: 'Entroncamento T', icon: '┳', category: 'road', gridW: 1, gridH: 1, rotatable: true, rotationStep: 90, mapType: 'ROAD', geometryType: 'RECT', defaultStyle: { fill: '#475569', stroke: '#334155', strokeWidth: 0.5 }, description: 'Interseção em T' },
  { id: 'road-cross', name: 'Cruzamento', icon: '╋', category: 'road', gridW: 1, gridH: 1, rotatable: false, rotationStep: 90, mapType: 'ROAD', geometryType: 'RECT', defaultStyle: { fill: '#475569', stroke: '#334155', strokeWidth: 0.5 }, description: 'Cruzamento de 4 vias' },
  { id: 'road-deadend', name: 'Cul-de-sac', icon: '╸', category: 'road', gridW: 1, gridH: 1, rotatable: true, rotationStep: 90, mapType: 'ROAD', geometryType: 'RECT', defaultStyle: { fill: '#475569', stroke: '#334155', strokeWidth: 0.5 }, description: 'Final de rua' },
  { id: 'roundabout', name: 'Rotatória', icon: '◎', category: 'road', gridW: 2, gridH: 2, rotatable: false, rotationStep: 90, mapType: 'ROUNDABOUT', geometryType: 'RECT', defaultStyle: { fill: '#475569', stroke: '#334155', strokeWidth: 0.5 }, description: 'Rotatória com ilha central' },
  { id: 'sidewalk', name: 'Calçada', icon: '▪', category: 'road', gridW: 1, gridH: 1, rotatable: false, rotationStep: 90, mapType: 'PATH', geometryType: 'RECT', defaultStyle: { fill: '#d6d3d1', stroke: '#a8a29e', strokeWidth: 0.5 }, description: 'Calçada para pedestres' },

  // Lots
  { id: 'lot-small', name: 'Lote P', icon: '▬', category: 'lot', gridW: 2, gridH: 2, rotatable: true, rotationStep: 90, mapType: 'LOT', geometryType: 'RECT', defaultStyle: { fill: '#86efac', stroke: '#16a34a', strokeWidth: 1.5 }, description: 'Lote pequeno (2×2)' },
  { id: 'lot-medium', name: 'Lote M', icon: '▬', category: 'lot', gridW: 2, gridH: 3, rotatable: true, rotationStep: 90, mapType: 'LOT', geometryType: 'RECT', defaultStyle: { fill: '#86efac', stroke: '#16a34a', strokeWidth: 1.5 }, description: 'Lote médio (2×3)' },
  { id: 'lot-large', name: 'Lote G', icon: '▬', category: 'lot', gridW: 3, gridH: 3, rotatable: true, rotationStep: 90, mapType: 'LOT', geometryType: 'RECT', defaultStyle: { fill: '#86efac', stroke: '#16a34a', strokeWidth: 1.5 }, description: 'Lote grande (3×3)' },
  { id: 'lot-wide', name: 'Lote Largo', icon: '▬', category: 'lot', gridW: 3, gridH: 2, rotatable: true, rotationStep: 90, mapType: 'LOT', geometryType: 'RECT', defaultStyle: { fill: '#86efac', stroke: '#16a34a', strokeWidth: 1.5 }, description: 'Lote largo (3×2)' },
  { id: 'lot-commercial', name: 'Lote Comercial', icon: '▬', category: 'lot', gridW: 3, gridH: 4, rotatable: true, rotationStep: 90, mapType: 'LOT', geometryType: 'RECT', defaultStyle: { fill: '#fde68a', stroke: '#d97706', strokeWidth: 1.5 }, description: 'Lote comercial (3×4)' },

  // Nature
  { id: 'tree', name: 'Arvore', icon: 'T', category: 'nature', gridW: 1, gridH: 1, rotatable: false, rotationStep: 90, mapType: 'GREEN', geometryType: 'RECT', defaultStyle: { fill: '#4ade80', stroke: '#16a34a', strokeWidth: 0.5 }, description: 'Árvore individual' },
  { id: 'tree-cluster', name: 'Bosque', icon: 'TT', category: 'nature', gridW: 2, gridH: 2, rotatable: false, rotationStep: 90, mapType: 'GREEN', geometryType: 'RECT', defaultStyle: { fill: '#4ade80', stroke: '#16a34a', strokeWidth: 0.5 }, description: 'Grupo de árvores' },
  { id: 'park', name: 'Praca', icon: 'PQ', category: 'nature', gridW: 3, gridH: 3, rotatable: false, rotationStep: 90, mapType: 'GREEN', geometryType: 'RECT', defaultStyle: { fill: '#bbf7d0', stroke: '#16a34a', strokeWidth: 1 }, description: 'Praça / parque' },
  { id: 'lake-small', name: 'Lago P', icon: 'LP', category: 'nature', gridW: 2, gridH: 2, rotatable: false, rotationStep: 90, mapType: 'LAKE', geometryType: 'RECT', defaultStyle: { fill: '#7dd3fc', stroke: '#0ea5e9', strokeWidth: 1 }, description: 'Lago pequeno' },
  { id: 'lake-large', name: 'Lago G', icon: 'LG', category: 'nature', gridW: 4, gridH: 3, rotatable: true, rotationStep: 90, mapType: 'LAKE', geometryType: 'RECT', defaultStyle: { fill: '#7dd3fc', stroke: '#0ea5e9', strokeWidth: 1 }, description: 'Lago grande' },
  { id: 'grass', name: 'Grama', icon: 'GR', category: 'nature', gridW: 1, gridH: 1, rotatable: false, rotationStep: 90, mapType: 'GREEN', geometryType: 'RECT', defaultStyle: { fill: '#bbf7d0', stroke: '#86efac', strokeWidth: 0.5 }, description: 'Área gramada' },

  // Structures
  { id: 'gate', name: 'Portaria', icon: 'PT', category: 'structure', gridW: 1, gridH: 2, rotatable: true, rotationStep: 90, mapType: 'POLYGON', geometryType: 'RECT', defaultStyle: { fill: '#fbbf24', stroke: '#b45309', strokeWidth: 1 }, description: 'Portaria de entrada' },
  { id: 'guardhouse', name: 'Guarita', icon: 'GU', category: 'structure', gridW: 1, gridH: 1, rotatable: true, rotationStep: 90, mapType: 'POLYGON', geometryType: 'RECT', defaultStyle: { fill: '#fed7aa', stroke: '#c2410c', strokeWidth: 1 }, description: 'Guarita de segurança' },
  { id: 'parking', name: 'Estacionamento', icon: 'ES', category: 'structure', gridW: 3, gridH: 2, rotatable: true, rotationStep: 90, mapType: 'POLYGON', geometryType: 'RECT', defaultStyle: { fill: '#94a3b8', stroke: '#64748b', strokeWidth: 1 }, description: 'Estacionamento' },
  { id: 'playground', name: 'Playground', icon: 'PG', category: 'structure', gridW: 2, gridH: 2, rotatable: false, rotationStep: 90, mapType: 'GREEN', geometryType: 'RECT', defaultStyle: { fill: '#fde68a', stroke: '#f59e0b', strokeWidth: 1 }, description: 'Área de playground' },
  { id: 'dirt', name: 'Terra', icon: 'TE', category: 'structure', gridW: 1, gridH: 1, rotatable: false, rotationStep: 90, mapType: 'POLYGON', geometryType: 'RECT', defaultStyle: { fill: '#d4a574', stroke: '#b8860b', strokeWidth: 0.5 }, description: 'Área de terra' },
  { id: 'label', name: 'Texto', icon: 'TX', category: 'structure', gridW: 2, gridH: 1, rotatable: true, rotationStep: 90, mapType: 'LABEL', geometryType: 'RECT', defaultStyle: { fill: 'transparent', stroke: 'transparent', strokeWidth: 0, fontSize: 14, fontFamily: 'Inter', fontColor: '#1e293b' }, description: 'Rótulo de texto' },
]

export const TILE_CATEGORIES: { key: TileCategory; label: string; icon: string }[] = [
  { key: 'road', label: 'Ruas', icon: 'RUA' },
  { key: 'lot', label: 'Lotes', icon: 'LOT' },
  { key: 'nature', label: 'Natureza', icon: 'NAT' },
  { key: 'structure', label: 'Estruturas', icon: 'STR' },
]

export function getTileById(id: string): TileDefinition | undefined {
  return TILE_CATALOG.find(t => t.id === id)
}

export const MAP_ELEMENT_LABELS: Record<MapElementType, string> = {
  LOT: 'Lote', ROAD: 'Rua', ROUNDABOUT: 'Rotatória', LAKE: 'Lago',
  GREEN: 'Área Verde', LABEL: 'Rótulo', PATH: 'Caminho', POLYGON: 'Polígono',
}

export const MAP_ELEMENT_COLORS: Record<MapElementType, string> = {
  LOT: '#22c55e', ROAD: '#475569', ROUNDABOUT: '#a78bfa', LAKE: '#0ea5e9',
  GREEN: '#4ade80', LABEL: '#f59e0b', PATH: '#fb923c', POLYGON: '#94a3b8',
}

export const DEFAULT_STYLE: Record<MapElementType, StyleJson> = {
  LOT:        { fill: '#86efac', stroke: '#16a34a', strokeWidth: 1.5, opacity: 1 },
  ROAD:       { fill: '#475569', stroke: '#334155', strokeWidth: 0.5, opacity: 1 },
  ROUNDABOUT: { fill: '#475569', stroke: '#334155', strokeWidth: 0.5, opacity: 1 },
  LAKE:       { fill: '#7dd3fc', stroke: '#0ea5e9', strokeWidth: 1, opacity: 1 },
  GREEN:      { fill: '#4ade80', stroke: '#16a34a', strokeWidth: 0.5, opacity: 1 },
  LABEL:      { fill: 'transparent', stroke: 'transparent', strokeWidth: 0, opacity: 1, fontSize: 14, fontFamily: 'Inter', fontColor: '#1e293b' },
  PATH:       { fill: '#d6d3d1', stroke: '#a8a29e', strokeWidth: 0.5, opacity: 1 },
  POLYGON:    { fill: '#e2e8f033', stroke: '#94a3b8', strokeWidth: 1, opacity: 1 },
}

export interface LotGridConfig {
  rows: number
  cols: number
  tileId: string
  blockName: string
  startNumber: number
}

// Backward compat aliases
export type SmartTool = string
export type EditorTool = string
