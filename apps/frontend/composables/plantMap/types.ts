// ─── Enums (mirrors Prisma) ────────────────────────────────

export type PlantHotspotType =
  | 'LOTE'
  | 'PORTARIA'
  | 'QUADRA'
  | 'AREA_COMUM'
  | 'OUTRO'

export type PlantHotspotLinkType =
  | 'LOTE_PAGE'
  | 'PROJECT_PAGE'
  | 'CUSTOM_URL'
  | 'NONE'

export type LotStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD'

// ─── Models ────────────────────────────────────────────────

export interface PlantHotspot {
  id: string
  plantMapId: string
  type: PlantHotspotType
  title: string
  description?: string | null
  x: number // 0..1 normalized
  y: number // 0..1 normalized
  label?: string | null
  labelEnabled: boolean
  labelOffsetX: number
  labelOffsetY: number
  linkType: PlantHotspotLinkType
  linkId?: string | null
  linkUrl?: string | null
  loteStatus?: LotStatus | null
  metaJson?: Record<string, any> | null
  createdAt: string
  updatedAt: string
  /** Dynamic field from linked lot */
  tags?: string[]
}

export interface PlantMap {
  id: string
  projectId: string
  imageUrl: string
  imageWidth?: number | null
  imageHeight?: number | null
  sunPathEnabled: boolean
  sunPathAngleDeg: number
  sunPathLabelEnabled: boolean
  hotspots: PlantHotspot[]
  createdAt: string
  updatedAt: string
}

// ─── DTOs ──────────────────────────────────────────────────

export interface CreatePlantMapPayload {
  imageUrl: string
  imageWidth?: number
  imageHeight?: number
  sunPathEnabled?: boolean
  sunPathAngleDeg?: number
  sunPathLabelEnabled?: boolean
}

export interface UpdatePlantMapPayload extends Partial<CreatePlantMapPayload> {}

export interface CreateHotspotPayload {
  type: PlantHotspotType
  title: string
  description?: string
  x: number
  y: number
  label?: string
  labelEnabled?: boolean
  labelOffsetX?: number
  labelOffsetY?: number
  linkType?: PlantHotspotLinkType
  linkId?: string
  linkUrl?: string
  loteStatus?: LotStatus
  metaJson?: Record<string, any>
}

export interface UpdateHotspotPayload extends Partial<CreateHotspotPayload> {}

// ─── Visual helpers ────────────────────────────────────────

export const HOTSPOT_TYPE_LABELS: Record<PlantHotspotType, string> = {
  LOTE: 'Lote',
  PORTARIA: 'Portaria',
  QUADRA: 'Quadra',
  AREA_COMUM: 'Área Comum',
  OUTRO: 'Outro',
}

export const LOT_STATUS_LABELS: Record<LotStatus, string> = {
  AVAILABLE: 'Disponível',
  RESERVED: 'Reservado',
  SOLD: 'Vendido',
}

export const LOT_STATUS_COLORS: Record<LotStatus, string> = {
  AVAILABLE: '#22c55e',
  RESERVED: '#f59e0b',
  SOLD: '#ef4444',
}

export const HOTSPOT_TYPE_COLORS: Record<PlantHotspotType, string> = {
  LOTE: '#3b82f6',
  PORTARIA: '#8b5cf6',
  QUADRA: '#06b6d4',
  AREA_COMUM: '#10b981',
  OUTRO: '#6b7280',
}

export const HOTSPOT_TYPE_ICONS: Record<PlantHotspotType, string> = {
  LOTE: '🏡',
  PORTARIA: '🏢',
  QUADRA: '⛳',
  AREA_COMUM: '🌳',
  OUTRO: '📍',
}
