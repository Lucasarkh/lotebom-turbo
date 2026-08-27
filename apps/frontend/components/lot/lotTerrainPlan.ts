export type SideMetric = {
  meters?: number | string | null
  value?: number | string | null
}

export type LotDetailsLike = {
  areaM2?: number | string | null
  frontage?: number | string | null
  depth?: number | string | null
  sideLeft?: number | string | null
  sideRight?: number | string | null
  sideMetricsJson?: SideMetric[] | null
  slope?: string | null
  recuoFrontal?: number | string | null
  recuoLateral?: number | string | null
  recuoFundos?: number | string | null
  taxaOcupacao?: number | string | null
  gabaritoMaximo?: number | string | null
  hasViela?: boolean | null
  vielaWidth?: number | string | null
  vielaSide?: string | null
}

export type RawPoint = {
  x?: number | string | null
  y?: number | string | null
}

export type LotDataLike = {
  polygon?: RawPoint[] | null
  geometryJson?: {
    points?: number[] | null
    x?: number | null
    y?: number | null
  } | null
  sideMetrics?: SideMetric[] | null
  manualFrontage?: number | string | null
  manualBack?: number | string | null
  frontEdgeIndex?: number | string | null
  frontAngleDeg?: number | string | null
}

export type PlanPoint = {
  x: number
  z: number
}

export type TerrainSpec = {
  area: number | null
  frontage: number
  depth: number
  sideLeft: number
  sideRight: number
  backWidth: number
  slopeKey: string
  source: 'plant' | 'measures'
}

export const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '')
  const full = sanitized.length === 3
    ? sanitized.split('').map((c) => c + c).join('')
    : sanitized
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const toNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
export const normalizeDegrees = (value: number) => ((value % 360) + 360) % 360
export const angleDistanceDeg = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180)

export const rotateArray = <T,>(items: T[], startIndex: number) => {
  if (!items.length) return [] as T[]
  const normalizedStart = ((startIndex % items.length) + items.length) % items.length
  return [...items.slice(normalizedStart), ...items.slice(0, normalizedStart)]
}

export const distance2d = (a: PlanPoint, b: PlanPoint) => Math.hypot(b.x - a.x, b.z - a.z)

export const polygonArea = (points: PlanPoint[]) => {
  if (points.length < 3) return 0
  let area = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!
    const next = points[(index + 1) % points.length]!
    area += current.x * next.z - next.x * current.z
  }
  return Math.abs(area) / 2
}

export const edgeIndexToAngle = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return null
  const normalizedIndex = ((parsed % 4) + 4) % 4
  return [270, 0, 90, 180][normalizedIndex] ?? null
}

export const deriveFrontEdgeIndexFromPolygon = (points: PlanPoint[], desiredAngleDeg: number) => {
  if (points.length < 2) return null

  const centroid = points.reduce(
    (sum, point) => ({ x: sum.x + point.x, z: sum.z + point.z }),
    { x: 0, z: 0 },
  )
  centroid.x /= points.length
  centroid.z /= points.length

  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < points.length; index += 1) {
    const start = points[index]!
    const end = points[(index + 1) % points.length]!
    const dx = end.x - start.x
    const dz = end.z - start.z
    const midpoint = { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 }
    const outwardA = { x: dz, z: -dx }
    const outwardB = { x: -dz, z: dx }
    const centerToMid = { x: midpoint.x - centroid.x, z: midpoint.z - centroid.z }
    const outward = (outwardA.x * centerToMid.x + outwardA.z * centerToMid.z) >= (outwardB.x * centerToMid.x + outwardB.z * centerToMid.z)
      ? outwardA
      : outwardB

    const normalAngle = normalizeDegrees((Math.atan2(outward.z, outward.x) * 180) / Math.PI)
    const distance = angleDistanceDeg(normalAngle, desiredAngleDeg)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }

  return bestIndex
}

export const edgeMidpoint = (start: PlanPoint, end: PlanPoint) => ({
  x: (start.x + end.x) / 2,
  z: (start.z + end.z) / 2,
})

export const polygonCentroid = (points: PlanPoint[]) => {
  if (!points.length) return { x: 0, z: 0 }
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, z: acc.z + point.z }), { x: 0, z: 0 })
  return { x: sum.x / points.length, z: sum.z / points.length }
}

export const outwardNormalForEdge = (points: PlanPoint[], startIndex: number) => {
  const start = points[startIndex]!
  const end = points[(startIndex + 1) % points.length]!
  const midpoint = edgeMidpoint(start, end)
  const centroid = polygonCentroid(points)
  const dx = end.x - start.x
  const dz = end.z - start.z
  const normalA = { x: dz, z: -dx }
  const normalB = { x: -dz, z: dx }
  const centerToMid = { x: midpoint.x - centroid.x, z: midpoint.z - centroid.z }
  const chosen = (normalA.x * centerToMid.x + normalA.z * centerToMid.z) >= (normalB.x * centerToMid.x + normalB.z * centerToMid.z)
    ? normalA
    : normalB
  const length = Math.hypot(chosen.x, chosen.z) || 1
  return {
    x: chosen.x / length,
    z: chosen.z / length,
  }
}

/**
 * Perfil do desnivel ao longo da profundidade. A curva em S evita a rampa
 * retilinea de plano inclinado: o terreno sai plano na divisa, ganha caimento no
 * meio e volta a assentar no fundo, como um lote terraplenado.
 */
export const slopeProfile = (ratio: number) => {
  const t = clamp(ratio, 0, 1)
  return t * t * (3 - 2 * t)
}

export const createSlopeSampler = (minZ: number, spanZ: number, slopeHeight: number) =>
  (z: number) => (spanZ > 0 ? slopeHeight * slopeProfile((z - minZ) / spanZ) : 0)

export const formatMeters = (value: number) => `${Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} m`

export const resolvePlanShape = (normalizedPolygon: PlanPoint[], spec: TerrainSpec): PlanPoint[] => {
  if (normalizedPolygon.length >= 3) {
    return normalizedPolygon
  }

  const { frontage, backWidth, depth, sideLeft, sideRight } = spec
  const halfFront = frontage / 2
  const halfBack = backWidth / 2
  const frontBackDelta = (frontage - backWidth) / 2

  let offsetX = 0
  if (Math.abs(frontage - backWidth) > 0.001) {
    offsetX = (sideLeft ** 2 - sideRight ** 2) / (2 * (frontage - backWidth))
  } else {
    offsetX = clamp((sideLeft - sideRight) * 0.35, -depth * 0.18, depth * 0.18)
  }

  const maxLeftDrift = Math.sqrt(Math.max(sideLeft ** 2 - depth ** 2, 0))
  const maxRightDrift = Math.sqrt(Math.max(sideRight ** 2 - depth ** 2, 0))
  const minOffset = Math.max(-maxLeftDrift - frontBackDelta, -maxRightDrift + frontBackDelta)
  const maxOffset = Math.min(maxLeftDrift - frontBackDelta, maxRightDrift + frontBackDelta)
  offsetX = clamp(
    offsetX,
    Number.isFinite(minOffset) ? minOffset : -depth * 0.12,
    Number.isFinite(maxOffset) ? maxOffset : depth * 0.12,
  )

  return [
    { x: -halfFront, z: 0 },
    { x: halfFront, z: 0 },
    { x: offsetX + halfBack, z: depth },
    { x: offsetX - halfBack, z: depth },
  ] as PlanPoint[]
}
