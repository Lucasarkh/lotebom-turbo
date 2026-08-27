import { computed } from 'vue'
import {
  angleDistanceDeg,
  clamp,
  deriveFrontEdgeIndexFromPolygon,
  distance2d,
  edgeIndexToAngle,
  normalizeDegrees,
  polygonArea,
  rotateArray,
  toNumber,
  type LotDataLike,
  type LotDetailsLike,
  type PlanPoint,
  type TerrainSpec,
} from './lotTerrainPlan'

export type LotTerrainPresetProps = {
  details?: LotDetailsLike | null
  lotLabel?: string | null
  lotData?: LotDataLike | null
  sunPathAngleDeg?: number | null
}

export const useLotTerrainData = (props: LotTerrainPresetProps) => {
  const rawSideMetrics = computed(() => {
    const raw = props.details?.sideMetricsJson ?? props.lotData?.sideMetrics
    return Array.isArray(raw) ? raw : []
  })

  const frontAngleDeg = computed(() => {
    const rawAngle = Number(props.lotData?.frontAngleDeg)
    if (Number.isFinite(rawAngle)) return normalizeDegrees(rawAngle)
    return edgeIndexToAngle(props.lotData?.frontEdgeIndex)
  })

  const frontEdgeIndex = computed(() => {
    const edgeCount = Math.max(rawPolygon.value.length, rawSideMetrics.value.length)
    if (edgeCount < 1) return 0

    if (frontAngleDeg.value !== null) {
      const derivedFromPolygon = deriveFrontEdgeIndexFromPolygon(rawPolygon.value, frontAngleDeg.value)
      if (derivedFromPolygon !== null) {
        return ((derivedFromPolygon % edgeCount) + edgeCount) % edgeCount
      }

      const fallbackAngles = [270, 0, 90, 180]
      let bestIndex = 0
      let bestDistance = Number.POSITIVE_INFINITY
      fallbackAngles.forEach((targetAngle, index) => {
        const distance = angleDistanceDeg(frontAngleDeg.value!, targetAngle)
        if (distance < bestDistance) {
          bestDistance = distance
          bestIndex = index
        }
      })
      return ((bestIndex % edgeCount) + edgeCount) % edgeCount
    }

    const rawValue = Number(props.lotData?.frontEdgeIndex)
    if (!Number.isInteger(rawValue)) return 0
    return ((rawValue % edgeCount) + edgeCount) % edgeCount
  })

  const sideMetrics = computed(() => rotateArray(rawSideMetrics.value, frontEdgeIndex.value))

  const readSideMetric = (index: number) => {
    const metric = sideMetrics.value[index]
    return toNumber(metric?.meters ?? metric?.value ?? metric)
  }

  const rawPolygon = computed<PlanPoint[]>(() => {
    const sourcePolygon = Array.isArray(props.lotData?.polygon) ? props.lotData?.polygon : []
    const parsedPolygon = sourcePolygon
      .map((point) => ({ x: Number(point?.x), z: Number(point?.y) }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.z))

    if (parsedPolygon.length >= 3) return parsedPolygon

    const rawPoints = props.lotData?.geometryJson?.points
    if (!Array.isArray(rawPoints) || rawPoints.length < 6) return []

    const points: PlanPoint[] = []
    for (let index = 0; index < rawPoints.length - 1; index += 2) {
      const x = Number(rawPoints[index])
      const z = Number(rawPoints[index + 1])
      if (Number.isFinite(x) && Number.isFinite(z)) {
        points.push({ x, z })
      }
    }
    return points.length >= 3 ? points : []
  })

  const frontOrientedPolygon = computed<PlanPoint[]>(() => rotateArray(rawPolygon.value, frontEdgeIndex.value))

  const normalizedPolygon = computed<PlanPoint[]>(() => {
    const points = frontOrientedPolygon.value
    if (points.length < 3) return []

    const lengths = points.map((point, index) => distance2d(point, points[(index + 1) % points.length]!))
    const explicitFrontage = toNumber(props.lotData?.manualFrontage) ?? toNumber(props.details?.frontage)
    const explicitBack = toNumber(props.lotData?.manualBack) ?? readSideMetric(2)
    const scales: number[] = []

    lengths.forEach((length, index) => {
      const meters = readSideMetric(index)
      if (meters && length > 0) {
        scales.push(meters / length)
      }
    })

    const frontLength = lengths[0] ?? 0
    const backLength = lengths[2] ?? 0

    if (explicitFrontage && frontLength > 0) {
      scales.push(explicitFrontage / frontLength)
    }
    if (explicitBack && lengths.length >= 3 && backLength > 0) {
      scales.push(explicitBack / backLength)
    }

    if (!scales.length) {
      const rawArea = polygonArea(points)
      const targetArea = toNumber(props.details?.areaM2)
      if (rawArea > 0 && targetArea) {
        scales.push(Math.sqrt(targetArea / rawArea))
      }
    }

    const scale = scales.length
      ? (scales.reduce((sum, current) => sum + current, 0) / scales.length)
      : 1

    const scaled = points.map((point) => ({ x: point.x * scale, z: point.z * scale }))
    const frontStart = scaled[0]!
    const frontEnd = scaled[1]!
    const frontMid = {
      x: (frontStart.x + frontEnd.x) / 2,
      z: (frontStart.z + frontEnd.z) / 2,
    }
    const angle = Math.atan2(frontEnd.z - frontStart.z, frontEnd.x - frontStart.x)
    const cos = Math.cos(-angle)
    const sin = Math.sin(-angle)

    let rotated = scaled.map((point) => {
      const dx = point.x - frontMid.x
      const dz = point.z - frontMid.z
      return {
        x: dx * cos - dz * sin,
        z: dx * sin + dz * cos,
      }
    })

    const interiorAverage = rotated.slice(2).reduce((sum, point) => sum + point.z, 0) / Math.max(rotated.length - 2, 1)
    if (interiorAverage < 0) {
      // Rotacao de 180°, nunca espelhamento: refletir em z inverteria a
      // quiralidade do lote e trocaria nascente com poente no guia solar.
      rotated = rotated.map((point) => ({ x: -point.x, z: -point.z }))
    }

    const frontZ = (rotated[0]!.z + rotated[1]!.z) / 2
    rotated = rotated.map((point) => ({ x: point.x, z: point.z - frontZ }))

    const centerX = (Math.min(...rotated.map((point) => point.x)) + Math.max(...rotated.map((point) => point.x))) / 2
    return rotated.map((point) => ({ x: point.x - centerX, z: point.z }))
  })

  const terrainSpec = computed<TerrainSpec>(() => {
    const area = toNumber(props.details?.areaM2)
    const rawFrontage = toNumber(props.details?.frontage) ?? toNumber(props.lotData?.manualFrontage) ?? toNumber(rawSideMetrics.value[0]?.meters ?? rawSideMetrics.value[0]?.value)
    const rawBackWidth = toNumber(props.lotData?.manualBack) ?? toNumber(props.details?.depth) ?? toNumber(rawSideMetrics.value[2]?.meters ?? rawSideMetrics.value[2]?.value)
    const rawSideLeft = toNumber(props.details?.sideLeft) ?? toNumber(rawSideMetrics.value[1]?.meters ?? rawSideMetrics.value[1]?.value)
    const rawSideRight = toNumber(props.details?.sideRight) ?? toNumber(rawSideMetrics.value[3]?.meters ?? rawSideMetrics.value[3]?.value)
    const frontage = rawFrontage ?? 12
    const explicitBackWidth = rawBackWidth
    const sideLeft = rawSideLeft ?? 25
    const sideRight = rawSideRight ?? sideLeft

    if (normalizedPolygon.value.length >= 3) {
      const points = normalizedPolygon.value
      const front = distance2d(points[0]!, points[1]!)
      const back = points.length >= 4 ? distance2d(points[2]!, points[3]!) : explicitBackWidth ?? front
      const depth = clamp(Math.max(...points.map((point) => point.z)), 1, 999)
      return {
        area: area ?? polygonArea(points),
        frontage: front,
        depth,
        sideLeft: points.length >= 4 ? distance2d(points[0]!, points[points.length - 1]!) : sideLeft,
        sideRight: points.length >= 3 ? distance2d(points[1]!, points[2]!) : sideRight,
        backWidth: back,
        slopeKey: String(props.details?.slope || 'FLAT').trim().toUpperCase(),
        source: 'plant',
      }
    }

    let depth = toNumber(props.details?.depth)
    const backWidth = explicitBackWidth ?? frontage

    if ((!depth || (area && depth <= Math.max(frontage, backWidth))) && area) {
      const inferredDepth = (2 * area) / Math.max(frontage + backWidth, 0.0001)
      if (Number.isFinite(inferredDepth) && inferredDepth > 0) {
        depth = inferredDepth
      }
    }

    if (!depth) {
      depth = (sideLeft + sideRight) / 2
    }

    return {
      area,
      frontage,
      depth,
      sideLeft,
      sideRight,
      backWidth,
      slopeKey: String(props.details?.slope || 'FLAT').trim().toUpperCase(),
      source: 'measures',
    }
  })

  const heading = computed(() => {
    const label = String(props.lotLabel || '').trim()
    return label ? `Terreno ${label}` : 'Terreno do lote'
  })

  const slopeText = computed(() => {
    const map: Record<string, string> = {
      FLAT: 'Plano',
      UPHILL: 'Aclive',
      DOWNHILL: 'Declive',
      UP: 'Aclive',
      DOWN: 'Declive',
    }
    return map[terrainSpec.value.slopeKey] || terrainSpec.value.slopeKey || 'Plano'
  })

  const geometryModeLabel = computed(() => terrainSpec.value.source === 'plant' ? 'Baseado na planta' : 'Baseado nas medidas')

  const solarGuideAngleDeg = computed(() => {
    const rawSunAngle = Number(props.sunPathAngleDeg)
    if (!Number.isFinite(rawSunAngle)) return null
    const frontWorldAngle = frontAngleDeg.value ?? 270
    return normalizeDegrees(rawSunAngle - frontWorldAngle + 270)
  })

  const hasSolarGuide = computed(() => solarGuideAngleDeg.value !== null)

  const buildingParams = computed(() => ({
    recuoFrontal: toNumber(props.details?.recuoFrontal) ?? 0,
    recuoLateral: toNumber(props.details?.recuoLateral) ?? 0,
    recuoFundos: toNumber(props.details?.recuoFundos) ?? 0,
    taxaOcupacao: toNumber(props.details?.taxaOcupacao) ?? null,
    gabaritoMaximo: toNumber(props.details?.gabaritoMaximo) ?? null,
    hasViela: Boolean(props.details?.hasViela),
    vielaWidth: toNumber(props.details?.vielaWidth) ?? 0,
    vielaSide: (props.details?.vielaSide as string) || '',
  }))

  const hasBuildingData = computed(() => {
    const p = buildingParams.value
    return p.recuoFrontal > 0 || p.recuoLateral > 0 || p.recuoFundos > 0
      || p.taxaOcupacao !== null || p.gabaritoMaximo !== null
  })

  const displayArea = computed(() => {
    if (!terrainSpec.value.area) return null
    return Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(terrainSpec.value.area)
  })

  return {
    normalizedPolygon,
    terrainSpec,
    heading,
    slopeText,
    geometryModeLabel,
    solarGuideAngleDeg,
    hasSolarGuide,
    buildingParams,
    hasBuildingData,
    displayArea,
  }
}
