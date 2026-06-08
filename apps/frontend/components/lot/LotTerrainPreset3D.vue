<template>
  <section class="lot-terrain-3d">
    <div class="lot-terrain-3d__header">
      <div>
        <p class="lot-terrain-3d__eyebrow">Simulação aproximada do lote</p>
        <h3 class="lot-terrain-3d__title">{{ heading }}</h3>
      </div>

      <button type="button" class="lot-terrain-3d__reset" @click="resetView">
        Centralizar
      </button>
    </div>

    <div class="lot-terrain-3d__viewport">
      <div ref="canvasHost" class="lot-terrain-3d__canvas"></div>

      <div class="lot-terrain-3d__controls">
        <button
          type="button"
          class="lot-terrain-3d__control-chip"
          :class="{ 'is-active': showFrontOverlay }"
          @click="showFrontOverlay = !showFrontOverlay"
        >
          Frente
        </button>
        <button
          type="button"
          class="lot-terrain-3d__control-chip"
          :class="{ 'is-active': showMeasureOverlay }"
          @click="showMeasureOverlay = !showMeasureOverlay"
        >
          Medidas
        </button>
        <button
          v-if="hasSolarGuide"
          type="button"
          class="lot-terrain-3d__control-chip"
          :class="{ 'is-active': showSolarOverlay }"
          @click="showSolarOverlay = !showSolarOverlay"
        >
          Sol
        </button>
        <button
          v-if="hasBuildingData"
          type="button"
          class="lot-terrain-3d__control-chip"
          :class="{ 'is-active': showBuildingOverlay }"
          @click="showBuildingOverlay = !showBuildingOverlay"
        >
          Construção
        </button>
      </div>

      <div v-if="!isSceneReady && !sceneError" class="lot-terrain-3d__overlay lot-terrain-3d__overlay--loading">
        Preparando visualizacao 3D...
      </div>

      <div v-else-if="sceneError" class="lot-terrain-3d__overlay lot-terrain-3d__overlay--error">
        {{ sceneError }}
      </div>

      <div class="lot-terrain-3d__hint">Arraste para orbitar</div>
    </div>

    <p class="lot-terrain-3d__footnote">
      *Esse modelo é gerado automaticamente com base nos dados disponíveis de medida. Pode não condizer com o formato real do lote e deve ser usado apenas para fins de visualização aproximada. Para informações precisas, consulte a planta oficial ou as medidas fornecidas pela loteadora.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

type SideMetric = {
  meters?: number | string | null
  value?: number | string | null
}

type LotDetailsLike = {
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

type RawPoint = {
  x?: number | string | null
  y?: number | string | null
}

type LotDataLike = {
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

type PlanPoint = {
  x: number
  z: number
}

type TerrainSpec = {
  area: number | null
  frontage: number
  depth: number
  sideLeft: number
  sideRight: number
  backWidth: number
  slopeKey: string
  source: 'plant' | 'measures'
}

type ThreeModule = typeof import('three')
type ThreeTexture = import('three').Texture
type ThreeGroup = import('three').Group
type ThreeVector3 = import('three').Vector3

const props = defineProps<{
  details?: LotDetailsLike | null
  lotLabel?: string | null
  lotData?: LotDataLike | null
  sunPathAngleDeg?: number | null
}>()

const canvasHost = ref<HTMLElement | null>(null)
const isSceneReady = ref(false)
const sceneError = ref('')
const showFrontOverlay = ref(true)
const showMeasureOverlay = ref(true)
const showSolarOverlay = ref(true)
const showBuildingOverlay = ref(true)

const toNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const normalizeDegrees = (value: number) => ((value % 360) + 360) % 360
const angleDistanceDeg = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180)

const rotateArray = <T,>(items: T[], startIndex: number) => {
  if (!items.length) return [] as T[]
  const normalizedStart = ((startIndex % items.length) + items.length) % items.length
  return [...items.slice(normalizedStart), ...items.slice(0, normalizedStart)]
}

const distance2d = (a: PlanPoint, b: PlanPoint) => Math.hypot(b.x - a.x, b.z - a.z)

const polygonArea = (points: PlanPoint[]) => {
  if (points.length < 3) return 0
  let area = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!
    const next = points[(index + 1) % points.length]!
    area += current.x * next.z - next.x * current.z
  }
  return Math.abs(area) / 2
}

const edgeIndexToAngle = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return null
  const normalizedIndex = ((parsed % 4) + 4) % 4
  return [270, 0, 90, 180][normalizedIndex] ?? null
}

const deriveFrontEdgeIndexFromPolygon = (points: PlanPoint[], desiredAngleDeg: number) => {
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
    rotated = rotated.map((point) => ({ x: point.x, z: -point.z }))
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

const formatMeters = (value: number) => `${Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} m`

type RuntimeState = {
  three: ThreeModule
  renderer: import('three').WebGLRenderer
  scene: import('three').Scene
  camera: import('three').PerspectiveCamera
  controls: {
    update: () => void
    reset: () => void
    dispose: () => void
    target: import('three').Vector3
    minDistance: number
    maxDistance: number
  }
  terrainGroup: ThreeGroup | null
  frameId: number | null
  resizeObserver: ResizeObserver | null
  grassTexture: ThreeTexture
  soilTexture: ThreeTexture
}

let runtime: RuntimeState | null = null

const disposeMaterial = (material: unknown) => {
  const disposable = material as { dispose?: () => void; map?: { dispose?: () => void } } | undefined
  disposable?.map?.dispose?.()
  disposable?.dispose?.()
}

const disposeGroup = (group: ThreeGroup | null) => {
  if (!group) return

  group.traverse((node) => {
    const mesh = node as {
      geometry?: { dispose?: () => void }
      material?: unknown
    }
    mesh.geometry?.dispose?.()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(disposeMaterial)
      return
    }
    disposeMaterial(mesh.material)
  })
}

const buildCanvasTexture = (three: ThreeModule, painter: (context: CanvasRenderingContext2D, size: number) => void) => {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Nao foi possivel preparar a textura do terreno.')
  }

  painter(context, size)

  const texture = new three.CanvasTexture(canvas)
  texture.wrapS = three.RepeatWrapping
  texture.wrapT = three.RepeatWrapping
  texture.colorSpace = three.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

const createGrassTexture = (three: ThreeModule) => buildCanvasTexture(three, (context, size) => {
  const gradient = context.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#c6e487')
  gradient.addColorStop(0.45, '#8db94b')
  gradient.addColorStop(1, '#58792e')
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)

  for (let index = 0; index < 2600; index += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const bladeHeight = 2 + Math.random() * 6
    context.strokeStyle = Math.random() > 0.5 ? 'rgba(221, 247, 152, 0.34)' : 'rgba(55, 83, 22, 0.25)'
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + (Math.random() - 0.5) * 3, y - bladeHeight)
    context.stroke()
  }
})

const createSoilTexture = (three: ThreeModule) => buildCanvasTexture(three, (context, size) => {
  const gradient = context.createLinearGradient(0, 0, 0, size)
  gradient.addColorStop(0, '#955e35')
  gradient.addColorStop(0.45, '#6e4023')
  gradient.addColorStop(1, '#361d11')
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)

  for (let index = 0; index < 3000; index += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const alpha = 0.04 + Math.random() * 0.1
    const radius = 0.5 + Math.random() * 2.2
    context.fillStyle = Math.random() > 0.5 ? `rgba(255, 201, 148, ${alpha})` : `rgba(27, 12, 5, ${alpha})`
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }
})

const createTextSprite = (
  three: ThreeModule,
  text: string,
  options: { background: string; color: string; scaleX?: number; scaleY?: number },
) => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const context = canvas.getContext('2d')
  if (!context) return null

  context.fillStyle = options.background
  context.beginPath()
  context.roundRect(8, 8, 240, 80, 24)
  context.fill()
  context.fillStyle = options.color
  context.font = '700 30px sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, 128, 48)

  const texture = new three.CanvasTexture(canvas)
  texture.colorSpace = three.SRGBColorSpace
  const material = new three.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false })
  const sprite = new three.Sprite(material)
  sprite.scale.set(options.scaleX ?? 5.4, options.scaleY ?? 2.1, 1)
  sprite.renderOrder = 40
  return sprite
}

const createPlainTextSprite = (
  three: ThreeModule,
  text: string,
  options: { color: string; fontSize?: number; scaleX?: number; scaleY?: number },
) => {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 80
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const fontSize = options.fontSize ?? 32
  ctx.font = `700 ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.7)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'
  ctx.lineWidth = 5
  ctx.strokeText(text, 256, 40)
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = '#2c1a00'
  ctx.fillText(text, 256, 40)

  const texture = new three.CanvasTexture(canvas)
  texture.colorSpace = three.SRGBColorSpace
  const material = new three.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false })
  const sprite = new three.Sprite(material)
  sprite.scale.set(options.scaleX ?? 5, options.scaleY ?? 0.8, 1)
  sprite.renderOrder = 40
  return sprite
}

const createSunLabelSprite = (
  three: ThreeModule,
  type: 'sunrise' | 'sunset',
) => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const isSunrise = type === 'sunrise'

  ctx.fillStyle = isSunrise ? 'rgba(251, 191, 36, 0.93)' : 'rgba(120, 53, 15, 0.91)'
  ctx.beginPath()
  ctx.roundRect(6, 8, 244, 80, 20)
  ctx.fill()

  const iconColor = isSunrise ? '#78350f' : '#fde68a'
  const sunX = 48
  const horizonY = isSunrise ? 56 : 40
  const sunR = 12

  ctx.strokeStyle = iconColor
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(sunX - 20, horizonY)
  ctx.lineTo(sunX + 20, horizonY)
  ctx.stroke()

  ctx.fillStyle = iconColor
  ctx.beginPath()
  if (isSunrise) {
    ctx.arc(sunX, horizonY, sunR, Math.PI, 0)
  } else {
    ctx.arc(sunX, horizonY, sunR, 0, Math.PI)
  }
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = iconColor
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  const rayInner = sunR + 3
  const rayOuter = sunR + 9
  for (let i = 0; i < 5; i++) {
    const a = isSunrise
      ? -Math.PI + (Math.PI / 6) * (i + 1)
      : (Math.PI / 6) * (i + 1)
    ctx.beginPath()
    ctx.moveTo(sunX + Math.cos(a) * rayInner, horizonY + Math.sin(a) * rayInner)
    ctx.lineTo(sunX + Math.cos(a) * rayOuter, horizonY + Math.sin(a) * rayOuter)
    ctx.stroke()
  }

  ctx.lineWidth = 2.5
  if (isSunrise) {
    ctx.beginPath()
    ctx.moveTo(sunX, 30)
    ctx.lineTo(sunX, 20)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(sunX - 5, 25)
    ctx.lineTo(sunX, 20)
    ctx.lineTo(sunX + 5, 25)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(sunX, 62)
    ctx.lineTo(sunX, 72)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(sunX - 5, 67)
    ctx.lineTo(sunX, 72)
    ctx.lineTo(sunX + 5, 67)
    ctx.stroke()
  }

  ctx.fillStyle = isSunrise ? '#451a03' : '#fef3c7'
  ctx.font = '700 30px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(isSunrise ? 'Nasce' : 'Põe', 162, 48)

  const texture = new three.CanvasTexture(canvas)
  texture.colorSpace = three.SRGBColorSpace
  const material = new three.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false })
  const sprite = new three.Sprite(material)
  sprite.scale.set(4.0, 1.5, 1)
  sprite.renderOrder = 40
  return sprite
}

const edgeMidpoint = (start: PlanPoint, end: PlanPoint) => ({
  x: (start.x + end.x) / 2,
  z: (start.z + end.z) / 2,
})

const polygonCentroid = (points: PlanPoint[]) => {
  if (!points.length) return { x: 0, z: 0 }
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, z: acc.z + point.z }), { x: 0, z: 0 })
  return { x: sum.x / points.length, z: sum.z / points.length }
}

const outwardNormalForEdge = (points: PlanPoint[], startIndex: number) => {
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

const createEdgeMeasureLabel = (
  three: ThreeModule,
  text: string,
  position: PlanPoint,
  normal: PlanPoint,
  distance = 0.95,
) => {
  const label = createTextSprite(three, text, {
    background: 'rgba(255, 248, 228, 0.94)',
    color: '#4b2d18',
    scaleX: 4.2,
    scaleY: 1.5,
  })
  if (!label) return null
  label.position.set(position.x + normal.x * distance, 1.18, position.z + normal.z * distance)
  return label
}

const resolvePlanShape = () => {
  if (normalizedPolygon.value.length >= 3) {
    return normalizedPolygon.value
  }

  const { frontage, backWidth, depth, sideLeft, sideRight } = terrainSpec.value
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

const buildConstructionOverlay = (
  three: ThreeModule,
  spec: TerrainSpec,
  planShape: PlanPoint[],
  thickness: number,
  slopeHeight: number,
) => {
  const group = new three.Group()
  const bp = buildingParams.value

  const minX = Math.min(...planShape.map(p => p.x))
  const maxX = Math.max(...planShape.map(p => p.x))
  const minZ = Math.min(...planShape.map(p => p.z))
  const maxZ = Math.max(...planShape.map(p => p.z))
  const lotW = maxX - minX
  const lotD = maxZ - minZ

  const recF = Math.min(bp.recuoFrontal, lotD * 0.4)
  const recB = Math.min(bp.recuoFundos, lotD * 0.4)
  const recL = Math.min(bp.recuoLateral, lotW * 0.3)
  const recR = Math.min(bp.recuoLateral, lotW * 0.3)

  const buildableW = Math.max(lotW - recL - recR, 2)
  const buildableD = Math.max(lotD - recF - recB, 2)

  let houseW = buildableW
  let houseD = buildableD
  if (bp.taxaOcupacao !== null && bp.taxaOcupacao > 0) {
    const lotArea = spec.area ?? (lotW * lotD)
    const maxFootprint = lotArea * (bp.taxaOcupacao / 100)
    if (houseW * houseD > maxFootprint && maxFootprint > 0) {
      const scale = Math.sqrt(maxFootprint / (houseW * houseD))
      houseW *= scale
      houseD *= scale
    }
  } else {
    houseW *= 0.6
    houseD *= 0.6
  }

  if (houseW > houseD * 2) houseW = houseD * 2
  if (houseD > houseW * 2.5) houseD = houseW * 2.5
  houseW = clamp(houseW, 3, buildableW)
  houseD = clamp(houseD, 3.5, buildableD)

  const wallHeight = bp.gabaritoMaximo ? Math.min(bp.gabaritoMaximo, 4) : 3.2
  const numFloors = 1
  const floorH = wallHeight
  const roofHeight = clamp(houseW * 0.25, 1.2, 2.5)

  const centerX = (minX + recL + maxX - recR) / 2
  const centerZ = minZ + recF + houseD / 2
  const frontEdgeY = lotD > 0 ? slopeHeight * ((centerZ - houseD / 2 - minZ) / lotD) : 0
  const backEdgeY = lotD > 0 ? slopeHeight * ((centerZ + houseD / 2 - minZ) / lotD) : 0
  const houseBaseY = Math.max(frontEdgeY, backEdgeY)

  const houseGroup = new three.Group()
  houseGroup.position.set(centerX, houseBaseY, centerZ)

  const foundH = 0.12
  const wallBaseY = foundH
  const hw = houseW / 2
  const hd = houseD / 2

  // Foundation — adapts to terrain slope (tall on low side, flush on high side)
  const fhw = (houseW + 0.15) / 2
  const fhd = (houseD + 0.15) / 2
  const frontBotY = frontEdgeY - houseBaseY
  const backBotY = backEdgeY - houseBaseY
  const foundVerts = new Float32Array([
    -fhw, foundH, -fhd,     fhw, foundH, -fhd,
     fhw, foundH,  fhd,    -fhw, foundH,  fhd,
    -fhw, frontBotY, -fhd,  fhw, frontBotY, -fhd,
     fhw, backBotY,   fhd, -fhw, backBotY,   fhd,
  ])
  const foundGeo = new three.BufferGeometry()
  foundGeo.setAttribute('position', new three.BufferAttribute(foundVerts, 3))
  foundGeo.setIndex([0,2,1, 0,3,2, 4,5,6, 4,6,7, 0,1,5, 0,5,4, 2,3,7, 2,7,6, 0,4,7, 0,7,3, 1,2,6, 1,6,5])
  foundGeo.computeVertexNormals()
  const foundMat = new three.MeshStandardMaterial({ color: '#8e8279', roughness: 0.88 })
  const foundation = new three.Mesh(foundGeo, foundMat)
  foundation.receiveShadow = true
  foundation.castShadow = true
  houseGroup.add(foundation)
  const foundEdgesGeo = new three.EdgesGeometry(foundGeo)
  houseGroup.add(new three.LineSegments(foundEdgesGeo, new three.LineBasicMaterial({ color: '#7a6e64', transparent: true, opacity: 0.5 })))

  // Horizontal block course lines on exposed foundation faces
  const courseMat = new three.LineBasicMaterial({ color: '#706258', transparent: true, opacity: 0.25 })
  const courseSpacing = 0.35
  const addCourseLine = (pts: import('three').Vector3[]) => {
    const geo = new three.BufferGeometry().setFromPoints(pts)
    houseGroup.add(Object.assign(new three.Line(geo, courseMat), { renderOrder: 6 }))
  }
  const frontExposure = Math.abs(Math.min(frontBotY, 0))
  for (let cy = -courseSpacing; cy > Math.min(frontBotY, backBotY); cy -= courseSpacing) {
    if (cy > frontBotY) {
      addCourseLine([new three.Vector3(-fhw, cy, -fhd - 0.01), new three.Vector3(fhw, cy, -fhd - 0.01)])
    }
    if (cy > backBotY) {
      addCourseLine([new three.Vector3(-fhw, cy, fhd + 0.01), new three.Vector3(fhw, cy, fhd + 0.01)])
    }
    if (cy > frontBotY && cy > backBotY) {
      addCourseLine([new three.Vector3(-fhw - 0.01, cy, -fhd), new three.Vector3(-fhw - 0.01, cy, fhd)])
      addCourseLine([new three.Vector3(fhw + 0.01, cy, -fhd), new three.Vector3(fhw + 0.01, cy, fhd)])
    } else if (frontBotY !== backBotY) {
      const t = (cy - frontBotY) / (backBotY - frontBotY)
      const zAtCy = -fhd + t * 2 * fhd
      if (cy > frontBotY) {
        addCourseLine([new three.Vector3(-fhw - 0.01, cy, -fhd), new three.Vector3(-fhw - 0.01, cy, Math.min(zAtCy, fhd))])
        addCourseLine([new three.Vector3(fhw + 0.01, cy, -fhd), new three.Vector3(fhw + 0.01, cy, Math.min(zAtCy, fhd))])
      } else if (cy > backBotY) {
        addCourseLine([new three.Vector3(-fhw - 0.01, cy, Math.max(zAtCy, -fhd)), new three.Vector3(-fhw - 0.01, cy, fhd)])
        addCourseLine([new three.Vector3(fhw + 0.01, cy, Math.max(zAtCy, -fhd)), new three.Vector3(fhw + 0.01, cy, fhd)])
      }
    }
  }

  // Walls
  const wallGeo = new three.BoxGeometry(houseW, wallHeight, houseD)
  const wallMat = new three.MeshStandardMaterial({ color: '#f5ede0', roughness: 0.78 })
  const walls = new three.Mesh(wallGeo, wallMat)
  walls.position.set(0, wallBaseY + wallHeight / 2, 0)
  walls.castShadow = true
  walls.receiveShadow = true
  houseGroup.add(walls)

  // Wall edges
  const edgesGeo = new three.EdgesGeometry(wallGeo)
  const edgesMat = new three.LineBasicMaterial({ color: '#b0a090', transparent: true, opacity: 0.35 })
  const edgeLines = new three.LineSegments(edgesGeo, edgesMat)
  edgeLines.position.copy(walls.position)
  houseGroup.add(edgeLines)

  // Floor division lines
  const floorLineMat = new three.LineBasicMaterial({ color: '#c4a882', transparent: true, opacity: 0.5 })
  for (let f = 1; f < numFloors; f++) {
    const fy = wallBaseY + floorH * f
    const e = 0.01
    const pts = [
      new three.Vector3(-hw - e, fy, -hd - e),
      new three.Vector3(hw + e, fy, -hd - e),
      new three.Vector3(hw + e, fy, hd + e),
      new three.Vector3(-hw - e, fy, hd + e),
      new three.Vector3(-hw - e, fy, -hd - e),
    ]
    const floorGeo = new three.BufferGeometry().setFromPoints(pts)
    const floorLine = new three.Line(floorGeo, floorLineMat)
    floorLine.renderOrder = 10
    houseGroup.add(floorLine)
  }

  // Windows and Door
  const winW = clamp(houseW * 0.1, 0.5, 1.0)
  const winH = clamp(floorH * 0.35, 0.6, 1.2)
  const winProt = 0.05
  const windowMat = new three.MeshStandardMaterial({ color: '#7eaed0', roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.85 })
  const windowFrameMat = new three.LineBasicMaterial({ color: '#e0d8c8', transparent: true, opacity: 0.8 })
  const crossMat = new three.LineBasicMaterial({ color: '#d0c8b8', transparent: true, opacity: 0.65 })

  const addWindow = (x: number, y: number, z: number, onZWall: boolean) => {
    const wGeo = onZWall
      ? new three.BoxGeometry(winW, winH, winProt)
      : new three.BoxGeometry(winProt, winH, winW)
    const win = new three.Mesh(wGeo, windowMat)
    win.position.set(x, y, z)
    win.renderOrder = 5
    houseGroup.add(win)
    const frameGeo = new three.EdgesGeometry(wGeo)
    const frame = new three.LineSegments(frameGeo, windowFrameMat)
    frame.position.copy(win.position)
    frame.renderOrder = 12
    houseGroup.add(frame)
    if (onZWall) {
      const cPts = [
        new three.Vector3(x - winW / 2, y, z), new three.Vector3(x + winW / 2, y, z),
        new three.Vector3(x, y - winH / 2, z), new three.Vector3(x, y + winH / 2, z),
      ]
      const cGeo = new three.BufferGeometry().setFromPoints(cPts)
      houseGroup.add(Object.assign(new three.LineSegments(cGeo, crossMat), { renderOrder: 12 }))
    } else {
      const cPts = [
        new three.Vector3(x, y, z - winW / 2), new three.Vector3(x, y, z + winW / 2),
        new three.Vector3(x, y - winH / 2, z), new three.Vector3(x, y + winH / 2, z),
      ]
      const cGeo = new three.BufferGeometry().setFromPoints(cPts)
      houseGroup.add(Object.assign(new three.LineSegments(cGeo, crossMat), { renderOrder: 12 }))
    }
  }

  const frontWinCount = Math.max(1, Math.floor(houseW / 2.8))
  const sideWinCount = Math.max(1, Math.floor(houseD / 3.5))
  const frontSpacing = houseW / (frontWinCount + 1)
  const sideSpacing = houseD / (sideWinCount + 1)
  const doorW = clamp(houseW * 0.1, 0.7, 1.1)
  const doorH = clamp(floorH * 0.72, 1.8, 2.4)

  for (let f = 0; f < numFloors; f++) {
    const winY = wallBaseY + f * floorH + floorH * 0.55

    for (let i = 0; i < frontWinCount; i++) {
      const wx = -hw + frontSpacing * (i + 1)
      if (f === 0 && Math.abs(wx) < (doorW + winW) / 2 + 0.2) continue
      addWindow(wx, winY, -hd - winProt / 2, true)
    }

    for (let i = 0; i < frontWinCount; i++) {
      const wx = -hw + frontSpacing * (i + 1)
      addWindow(wx, winY, hd + winProt / 2, true)
    }

    for (let i = 0; i < sideWinCount; i++) {
      const wz = -hd + sideSpacing * (i + 1)
      addWindow(-hw - winProt / 2, winY, wz, false)
      addWindow(hw + winProt / 2, winY, wz, false)
    }
  }

  // Door
  const doorMat = new three.MeshStandardMaterial({ color: '#6b4226', roughness: 0.65 })
  const doorGeo = new three.BoxGeometry(doorW, doorH, winProt)
  const door = new three.Mesh(doorGeo, doorMat)
  door.position.set(0, wallBaseY + doorH / 2, -hd - winProt / 2)
  houseGroup.add(door)
  const doorFrameGeo = new three.EdgesGeometry(doorGeo)
  const doorFrameLines = new three.LineSegments(doorFrameGeo, new three.LineBasicMaterial({ color: '#8b6040' }))
  doorFrameLines.position.copy(door.position)
  doorFrameLines.renderOrder = 12
  houseGroup.add(doorFrameLines)

  // Porch canopy
  const canopyGeo = new three.BoxGeometry(doorW + 0.6, 0.08, 0.45)
  const canopyMat = new three.MeshStandardMaterial({ color: '#c4613a', roughness: 0.8 })
  const canopy = new three.Mesh(canopyGeo, canopyMat)
  canopy.position.set(0, wallBaseY + doorH + 0.15, -hd - 0.22)
  canopy.castShadow = true
  houseGroup.add(canopy)

  // Stairs at the front when foundation is exposed
  if (frontExposure > 0.25) {
    const stairW = doorW + 0.8
    const stepH = 0.18
    const stepD = 0.28
    const numSteps = Math.max(1, Math.round(frontExposure / stepH))
    const actualStepH = frontExposure / numSteps
    const stairMat = new three.MeshStandardMaterial({ color: '#9a9088', roughness: 0.9 })
    const stairEdgeMat = new three.LineBasicMaterial({ color: '#7a7068', transparent: true, opacity: 0.4 })
    for (let s = 0; s < numSteps; s++) {
      const stepGeo = new three.BoxGeometry(stairW, actualStepH, stepD)
      const step = new three.Mesh(stepGeo, stairMat)
      step.position.set(0, frontBotY + actualStepH * (s + 0.5), -fhd - stepD * 0.5 - stepD * (numSteps - 1 - s))
      step.castShadow = true
      step.receiveShadow = true
      houseGroup.add(step)
      const stepEdge = new three.LineSegments(new three.EdgesGeometry(stepGeo), stairEdgeMat)
      stepEdge.position.copy(step.position)
      houseGroup.add(stepEdge)
    }
  }

  // Roof — gable with ridge along Z (depth), no rotation needed
  const overhang = 0.4
  const roofW = houseW + overhang * 2
  const roofD = houseD + overhang * 2
  const roofBaseY = wallBaseY + wallHeight

  const roofShape = new three.Shape()
  roofShape.moveTo(-roofW / 2, 0)
  roofShape.lineTo(0, roofHeight)
  roofShape.lineTo(roofW / 2, 0)
  roofShape.closePath()

  const roofGeo = new three.ExtrudeGeometry(roofShape, { depth: roofD, bevelEnabled: false })
  const roofMat = new three.MeshStandardMaterial({ color: '#c4613a', roughness: 0.82 })
  const roof = new three.Mesh(roofGeo, roofMat)
  roof.position.set(0, roofBaseY, -roofD / 2)
  roof.castShadow = true
  houseGroup.add(roof)

  const roofEdgesGeo = new three.EdgesGeometry(roofGeo)
  const roofEdges = new three.LineSegments(
    roofEdgesGeo,
    new three.LineBasicMaterial({ color: '#8b4020', transparent: true, opacity: 0.45 }),
  )
  roofEdges.position.copy(roof.position)
  roofEdges.renderOrder = 10
  houseGroup.add(roofEdges)

  group.add(houseGroup)

  // Setback lines on terrain surface — individual dashed lines per side with inline labels
  const setbackY = 0.08
  const slopeYAt = (z: number) => lotD > 0 ? slopeHeight * ((z - minZ) / lotD) : 0
  const setbackMat = new three.LineDashedMaterial({
    color: '#d4880e',
    dashSize: 0.4,
    gapSize: 0.25,
    transparent: true,
    opacity: 0.85,
  })

  const drawSetbackLine = (pts: import('three').Vector3[]) => {
    const geo = new three.BufferGeometry().setFromPoints(pts)
    const line = new three.Line(geo, setbackMat.clone())
    line.computeLineDistances()
    line.renderOrder = 15
    return line
  }

  const sbLeft = minX + recL
  const sbRight = maxX - recR
  const sbFront = minZ + recF
  const sbBack = maxZ - recB

  // Frontal setback line
  if (recF > 0) {
    group.add(drawSetbackLine([
      new three.Vector3(sbLeft, setbackY + slopeYAt(sbFront), sbFront),
      new three.Vector3(sbRight, setbackY + slopeYAt(sbFront), sbFront),
    ]))
    const tickX = sbLeft + (sbRight - sbLeft) * 0.5
    group.add(drawSetbackLine([
      new three.Vector3(tickX, setbackY + slopeYAt(minZ), minZ),
      new three.Vector3(tickX, setbackY + slopeYAt(sbFront), sbFront),
    ]))
    const label = createPlainTextSprite(three, `Recuo Frontal ${formatMeters(recF)}`, {
      color: '#8b6914',
      scaleX: 4.5,
      scaleY: 0.6,
    })
    if (label) {
      label.position.set(tickX, setbackY + 0.25 + slopeYAt(minZ + recF * 0.5), minZ + recF * 0.5)
      group.add(label)
    }
  }

  // Fundos setback line
  if (recB > 0) {
    group.add(drawSetbackLine([
      new three.Vector3(sbLeft, setbackY + slopeYAt(sbBack), sbBack),
      new three.Vector3(sbRight, setbackY + slopeYAt(sbBack), sbBack),
    ]))
    const tickX = sbLeft + (sbRight - sbLeft) * 0.5
    group.add(drawSetbackLine([
      new three.Vector3(tickX, setbackY + slopeYAt(maxZ), maxZ),
      new three.Vector3(tickX, setbackY + slopeYAt(sbBack), sbBack),
    ]))
    const label = createPlainTextSprite(three, `Recuo Fundos ${formatMeters(recB)}`, {
      color: '#8b6914',
      scaleX: 4.5,
      scaleY: 0.6,
    })
    if (label) {
      label.position.set(tickX, setbackY + 0.25 + slopeYAt(maxZ - recB * 0.5), maxZ - recB * 0.5)
      group.add(label)
    }
  }

  // Left lateral setback line
  if (recL > 0) {
    group.add(drawSetbackLine([
      new three.Vector3(sbLeft, setbackY + slopeYAt(sbFront), sbFront),
      new three.Vector3(sbLeft, setbackY + slopeYAt(sbBack), sbBack),
    ]))
    const tickZ = sbFront + (sbBack - sbFront) * 0.3
    group.add(drawSetbackLine([
      new three.Vector3(minX, setbackY + slopeYAt(tickZ), tickZ),
      new three.Vector3(sbLeft, setbackY + slopeYAt(tickZ), tickZ),
    ]))
    const label = createPlainTextSprite(three, `Recuo Lateral ${formatMeters(recL)}`, {
      color: '#8b6914',
      scaleX: 4.2,
      scaleY: 0.6,
    })
    if (label) {
      label.position.set(minX + recL * 0.5, setbackY + 0.25 + slopeYAt(tickZ), tickZ)
      group.add(label)
    }
  }

  // Right lateral setback line
  if (recR > 0) {
    group.add(drawSetbackLine([
      new three.Vector3(sbRight, setbackY + slopeYAt(sbFront), sbFront),
      new three.Vector3(sbRight, setbackY + slopeYAt(sbBack), sbBack),
    ]))
    const tickZ = sbFront + (sbBack - sbFront) * 0.3
    group.add(drawSetbackLine([
      new three.Vector3(maxX, setbackY + slopeYAt(tickZ), tickZ),
      new three.Vector3(sbRight, setbackY + slopeYAt(tickZ), tickZ),
    ]))
    const label = createPlainTextSprite(three, `Recuo Lateral ${formatMeters(recR)}`, {
      color: '#8b6914',
      scaleX: 4.2,
      scaleY: 0.6,
    })
    if (label) {
      label.position.set(maxX - recR * 0.5, setbackY + 0.25 + slopeYAt(tickZ), tickZ)
      group.add(label)
    }
  }

  // Viela strip — positioned by vielaSide
  if (bp.hasViela && bp.vielaWidth > 0) {
    const vW = bp.vielaWidth
    const side = (bp.vielaSide || 'RIGHT').toUpperCase()

    let vX: number, vZ: number, vGeoW: number, vGeoD: number
    if (side === 'BACK') {
      vGeoW = lotW + 1
      vGeoD = vW
      vX = (minX + maxX) / 2
      vZ = maxZ + vW / 2 + 0.1
    } else if (side === 'LEFT') {
      vGeoW = vW
      vGeoD = lotD + 1
      vX = minX - vW / 2 - 0.1
      vZ = (minZ + maxZ) / 2
    } else {
      vGeoW = vW
      vGeoD = lotD + 1
      vX = maxX + vW / 2 + 0.1
      vZ = (minZ + maxZ) / 2
    }

    const vielaGeo = new three.BoxGeometry(vGeoW, 0.06, vGeoD)
    const vielaMat = new three.MeshStandardMaterial({
      color: '#c8c0b8',
      roughness: 0.95,
      transparent: true,
      opacity: 0.75,
    })
    const viela = new three.Mesh(vielaGeo, vielaMat)
    viela.position.set(vX, 0.04, vZ)
    viela.receiveShadow = true
    group.add(viela)

    // Viela label — small, positioned just above the viela strip surface
    const vLabel = createTextSprite(three, `Viela ${formatMeters(vW)}`, {
      background: 'rgba(140, 135, 128, 0.92)',
      color: '#fff',
      scaleX: 3.8,
      scaleY: 1.3,
    })
    if (vLabel) {
      const labelOffsetY = 0.4
      if (side === 'BACK') {
        vLabel.position.set(vX, labelOffsetY, vZ)
      } else {
        vLabel.position.set(vX, labelOffsetY, vZ - vGeoD * 0.35)
      }
      group.add(vLabel)
    }
  }

  return group
}

const applyTerrainRelief = (
  geometry: import('three').ExtrudeGeometry,
  slopeHeight: number,
) => {
  if (!runtime) return
  const positions = geometry.attributes.position as import('three').BufferAttribute | undefined
  if (!positions) return
  const box = new runtime.three.Box3().setFromBufferAttribute(positions)
  const depthSpan = Math.max(box.max.z - box.min.z, 0.0001)

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    const z = positions.getZ(index)
    const slopeRatio = (z - box.min.z) / depthSpan
    const slopeOffset = slopeHeight * slopeRatio
    const edgeFadeX = Math.sin(((x - box.min.x) / Math.max(box.max.x - box.min.x, 0.0001)) * Math.PI)
    const edgeFadeZ = Math.sin(slopeRatio * Math.PI)
    const noise = y > -0.02
      ? (Math.sin(x * 1.2) + Math.cos(z * 1.4) + Math.sin((x + z) * 0.9)) * 0.045 * edgeFadeX * edgeFadeZ
      : 0

    positions.setY(index, y + slopeOffset + noise)
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()
}

const buildTerrainGroup = () => {
  if (!runtime) return null

  const { three, grassTexture, soilTexture } = runtime
  const planShape = resolvePlanShape()
  if (planShape.length < 3) return null

  const spanX = Math.max(...planShape.map((point) => point.x)) - Math.min(...planShape.map((point) => point.x))
  const spanZ = Math.max(...planShape.map((point) => point.z)) - Math.min(...planShape.map((point) => point.z))
  const maxDimension = Math.max(spanX, spanZ, terrainSpec.value.sideLeft, terrainSpec.value.sideRight)
  const thickness = clamp(maxDimension * 0.22, 2.6, 5.8)
  const slopeHeight = terrainSpec.value.slopeKey === 'UPHILL'
    ? clamp(maxDimension * 0.12, 0.9, 2.8)
    : terrainSpec.value.slopeKey === 'DOWNHILL'
      ? -clamp(maxDimension * 0.12, 0.9, 2.8)
      : 0

  const shape = new three.Shape()
  shape.moveTo(planShape[0]!.x, planShape[0]!.z)
  for (let index = 1; index < planShape.length; index += 1) {
    shape.lineTo(planShape[index]!.x, planShape[index]!.z)
  }
  shape.closePath()

  const terrainGeometry = new three.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 12,
    steps: 1,
  })
  terrainGeometry.rotateX(Math.PI / 2)
  applyTerrainRelief(terrainGeometry, slopeHeight)

  const material = [
    new three.MeshStandardMaterial({ map: grassTexture, color: '#bcdf78', roughness: 0.96, metalness: 0 }),
    new three.MeshStandardMaterial({ map: soilTexture, color: '#7b4b2c', roughness: 1, metalness: 0 }),
  ]
  const terrainMesh = new three.Mesh(terrainGeometry, material)
  terrainMesh.castShadow = true
  terrainMesh.receiveShadow = true
  const terrainBounds = new three.Box3().setFromObject(terrainMesh)
  const terrainCenter = terrainBounds.getCenter(new three.Vector3())
  const terrainSphere = terrainBounds.getBoundingSphere(new three.Sphere())

  const topOutlinePoints = planShape.map((point) => new three.Vector3(point.x, 0.06, point.z))
  topOutlinePoints.push(topOutlinePoints[0]!.clone())
  const perimeterGeometry = new three.BufferGeometry().setFromPoints(topOutlinePoints)
  const perimeterLine = new three.Line(
    perimeterGeometry,
    new three.LineBasicMaterial({ color: '#fff9ea', transparent: true, opacity: 0.8 }),
  )

  const frontLinePoints = [
    new three.Vector3(planShape[0]!.x, 0.16, planShape[0]!.z),
    new three.Vector3(planShape[1]!.x, 0.16, planShape[1]!.z),
  ]
  const frontGeometry = new three.BufferGeometry().setFromPoints(frontLinePoints)
  const frontLine = new three.Line(
    frontGeometry,
    new three.LineBasicMaterial({ color: '#f97316', linewidth: 2 }),
  )

  const frontMid = new three.Vector3(
    (planShape[0]!.x + planShape[1]!.x) / 2,
    0.42,
    (planShape[0]!.z + planShape[1]!.z) / 2,
  )
  const frontNormal = outwardNormalForEdge(planShape, 0)
  const frontDirection = new three.Vector3(frontNormal.x, 0, frontNormal.z)
  const frontEdgeVector = new three.Vector3(
    planShape[1]!.x - planShape[0]!.x,
    0,
    planShape[1]!.z - planShape[0]!.z,
  ).normalize()
  const frontArrowLength = clamp(terrainSpec.value.frontage * 0.18, 1.2, 2.8)
  const frontArrow = new three.ArrowHelper(
    frontDirection,
    frontMid.clone().add(frontDirection.clone().multiplyScalar(0.7)),
    frontArrowLength,
    0xf97316,
    0.7,
    0.36,
  )
  const frontLabel = createTextSprite(three, 'Frente', {
    background: 'rgba(249, 115, 22, 0.92)',
    color: '#fff7ed',
    scaleX: clamp(terrainSpec.value.frontage * 0.18, 2.2, 3),
    scaleY: 1.35,
  })
  if (frontLabel) {
    const frontLabelOffset = 0.75 + frontArrowLength * 0.55
    const frontLabelSideShift = clamp(terrainSpec.value.frontage * 0.12, 0.8, 1.45)
    frontLabel.position.copy(
      frontMid
        .clone()
        .add(frontDirection.clone().multiplyScalar(frontLabelOffset))
        .add(frontEdgeVector.clone().multiplyScalar(frontLabelSideShift))
        .add(new three.Vector3(0, 0.84, 0)),
    )
  }

  const frontMeasure = createEdgeMeasureLabel(
    three,
    formatMeters(terrainSpec.value.frontage),
    edgeMidpoint(planShape[0]!, planShape[1]!),
    frontNormal,
  )
  const rightStart = planShape[1]!
  const rightEnd = planShape[Math.min(2, planShape.length - 1)]!
  const rightNormal = outwardNormalForEdge(planShape, 1)
  const rightMeasure = createEdgeMeasureLabel(
    three,
    formatMeters(terrainSpec.value.sideRight),
    edgeMidpoint(rightStart, rightEnd),
    rightNormal,
  )
  const leftStart = planShape[planShape.length - 1]!
  const leftEnd = planShape[0]!
  const leftNormal = outwardNormalForEdge(planShape, planShape.length - 1)
  const leftMeasure = createEdgeMeasureLabel(
    three,
    formatMeters(terrainSpec.value.sideLeft),
    edgeMidpoint(leftStart, leftEnd),
    leftNormal,
  )

  let backMeasure = null as ReturnType<typeof createEdgeMeasureLabel>
  if (planShape.length >= 4) {
    const backNormal = outwardNormalForEdge(planShape, 2)
    backMeasure = createEdgeMeasureLabel(
      three,
      formatMeters(terrainSpec.value.backWidth),
      edgeMidpoint(planShape[2]!, planShape[3]!),
      backNormal,
    )
  }

  const terrainGroup = new three.Group()
  terrainGroup.add(terrainMesh)
  terrainGroup.add(perimeterLine)
  if (showFrontOverlay.value) {
    terrainGroup.add(frontLine)
    terrainGroup.add(frontArrow)
    if (frontLabel) {
      terrainGroup.add(frontLabel)
    }
  }
  if (showMeasureOverlay.value && frontMeasure) {
    terrainGroup.add(frontMeasure)
  }
  if (showMeasureOverlay.value && rightMeasure) {
    terrainGroup.add(rightMeasure)
  }
  if (showMeasureOverlay.value && leftMeasure) {
    terrainGroup.add(leftMeasure)
  }
  if (showMeasureOverlay.value && backMeasure) {
    terrainGroup.add(backMeasure)
  }

  if (hasSolarGuide.value && showSolarOverlay.value) {
    const angleRad = (Number(solarGuideAngleDeg.value) * Math.PI) / 180
    const direction = new three.Vector3(Math.cos(angleRad), 0, Math.sin(angleRad)).normalize()
    const center = terrainCenter.clone()
    center.y = 0
    const projections = planShape.map((point) => (point.x - center.x) * direction.x + (point.z - center.z) * direction.z)
    const minProjection = Math.min(...projections)
    const maxProjection = Math.max(...projections)
    const lotSpan = maxProjection - minProjection
    const halfExtent = lotSpan * 0.5 * 1.55
    const start = center.clone().add(direction.clone().multiplyScalar(-halfExtent))
    const end = center.clone().add(direction.clone().multiplyScalar(halfExtent))
    const buildingActive = showBuildingOverlay.value && hasBuildingData.value
    const buildingTopY = buildingActive ? 8 : 0
    const arcBaseHeight = buildingActive ? buildingTopY + 1.5 : 1.4
    const arcPeakHeight = Math.max(buildingActive ? buildingTopY + 5 : 5, lotSpan * 0.4)
    start.y = arcBaseHeight
    end.y = arcBaseHeight
    const arcControl = center.clone()
    arcControl.y = arcPeakHeight

    const solarCurve = new three.QuadraticBezierCurve3(start, arcControl, end)
    const solarGeometry = new three.BufferGeometry().setFromPoints(solarCurve.getPoints(48))
    const solarLine = new three.Line(
      solarGeometry,
      new three.LineDashedMaterial({ color: '#f59e0b', dashSize: 0.5, gapSize: 0.3, transparent: true, opacity: 0.8 }),
    )
    solarLine.computeLineDistances()
    terrainGroup.add(solarLine)

    const arrowScale = Math.max(0.2, lotSpan * 0.015)
    const coneGeo = new three.ConeGeometry(arrowScale * 0.45, arrowScale * 1.1, 6)
    const coneMat = new three.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.75 })
    for (const t of [0.3, 0.7]) {
      const point = solarCurve.getPoint(t)
      const tangent = solarCurve.getTangent(t).normalize().negate()
      const cone = new three.Mesh(coneGeo, coneMat)
      cone.position.copy(point)
      cone.quaternion.setFromUnitVectors(new three.Vector3(0, 1, 0), tangent)
      terrainGroup.add(cone)
    }

    const sunrise = createSunLabelSprite(three, 'sunrise')
    const sunset = createSunLabelSprite(three, 'sunset')
    if (sunrise) {
      sunrise.position.copy(end.clone().add(new three.Vector3(0, 0.8, 0)))
      terrainGroup.add(sunrise)
    }
    if (sunset) {
      sunset.position.copy(start.clone().add(new three.Vector3(0, 0.8, 0)))
      terrainGroup.add(sunset)
    }
  }

  if (showBuildingOverlay.value && hasBuildingData.value) {
    try {
      const constructionGroup = buildConstructionOverlay(three, terrainSpec.value, planShape, thickness, slopeHeight)
      terrainGroup.add(constructionGroup)
    } catch (err) {
      console.warn('[LotTerrain3D] Construction overlay error:', err)
    }
  }

  terrainGroup.userData.terrainCenter = terrainCenter.clone()
  terrainGroup.userData.terrainRadius = Math.max(terrainSphere.radius, 3)
  terrainGroup.position.x -= terrainCenter.x
  terrainGroup.position.z -= terrainCenter.z
  terrainGroup.position.y += thickness * 0.34
  return terrainGroup
}

const resizeRenderer = () => {
  if (!runtime || !canvasHost.value) return
  const width = Math.max(canvasHost.value.clientWidth, 1)
  const height = Math.max(canvasHost.value.clientHeight, 1)
  runtime.renderer.setSize(width, height, false)
  runtime.camera.aspect = width / height
  runtime.camera.updateProjectionMatrix()
}

const positionCamera = () => {
  if (!runtime || !runtime.terrainGroup) return
  const localTerrainCenter = runtime.terrainGroup.userData.terrainCenter as import('three').Vector3 | undefined
  const storedRadius = Number(runtime.terrainGroup.userData.terrainRadius)
  const center = localTerrainCenter
    ? localTerrainCenter.clone().add(runtime.terrainGroup.position)
    : new runtime.three.Box3().setFromObject(runtime.terrainGroup).getCenter(new runtime.three.Vector3())
  const radius = Number.isFinite(storedRadius) && storedRadius > 0
    ? storedRadius
    : Math.max(new runtime.three.Box3().setFromObject(runtime.terrainGroup).getBoundingSphere(new runtime.three.Sphere()).radius, 3)
  runtime.camera.position.set(radius * 1.34, radius * 1.08, -radius * 1.58)
  runtime.controls.target.copy(center).add(new runtime.three.Vector3(0, radius * 0.1, 0))
  runtime.controls.minDistance = radius * 1.05
  runtime.controls.maxDistance = radius * 4.4
  runtime.controls.update()
}

const mountTerrain = () => {
  if (!runtime) return

  if (runtime.terrainGroup) {
    runtime.scene.remove(runtime.terrainGroup)
    disposeGroup(runtime.terrainGroup)
    runtime.terrainGroup = null
  }

  const nextGroup = buildTerrainGroup()
  if (!nextGroup) return
  runtime.terrainGroup = nextGroup
  runtime.scene.add(nextGroup)
  positionCamera()
}

const resetView = () => {
  runtime?.controls.reset()
}

const initScene = async () => {
  if (!import.meta.client || !canvasHost.value || runtime) return

  try {
    const three = await import('three')
    const controlsModule = await import('three/examples/jsm/controls/OrbitControls.js')
    const renderer = new three.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = three.PCFSoftShadowMap
    renderer.outputColorSpace = three.SRGBColorSpace

    canvasHost.value.innerHTML = ''
    canvasHost.value.appendChild(renderer.domElement)

    const scene = new three.Scene()

    const camera = new three.PerspectiveCamera(34, 1, 0.1, 220)
    const controls = new controlsModule.OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.enablePan = false
    controls.minPolarAngle = Math.PI / 4.8
    controls.maxPolarAngle = Math.PI / 2.02

    const hemisphereLight = new three.HemisphereLight('#fff8df', '#60391f', 1.75)
    scene.add(hemisphereLight)

    const fillLight = new three.DirectionalLight('#ffd1a0', 1.1)
    fillLight.position.set(-10, 8, -6)
    scene.add(fillLight)

    const sunLight = new three.DirectionalLight('#fff1d0', 2.6)
    sunLight.position.set(12, 18, -4)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 80
    sunLight.shadow.bias = -0.00018
    scene.add(sunLight)

    const pedestalGeometry = new three.CircleGeometry(30, 96)
    const pedestalMaterial = new three.MeshStandardMaterial({
      color: '#d6b07a',
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.82,
    })
    const pedestalMesh = new three.Mesh(pedestalGeometry, pedestalMaterial)
    pedestalMesh.rotation.x = -Math.PI / 2
    pedestalMesh.position.y = -6.1
    pedestalMesh.receiveShadow = true
    scene.add(pedestalMesh)

    runtime = {
      three,
      renderer,
      scene,
      camera,
      controls,
      terrainGroup: null,
      frameId: null,
      resizeObserver: null,
      grassTexture: createGrassTexture(three),
      soilTexture: createSoilTexture(three),
    }

    mountTerrain()
    resizeRenderer()

    runtime.resizeObserver = new ResizeObserver(() => {
      resizeRenderer()
    })
    runtime.resizeObserver.observe(canvasHost.value)

    const renderLoop = () => {
      if (!runtime) return
      runtime.controls.update()
      runtime.renderer.render(runtime.scene, runtime.camera)
      runtime.frameId = window.requestAnimationFrame(renderLoop)
    }

    isSceneReady.value = true
    runtime.frameId = window.requestAnimationFrame(renderLoop)
  } catch (error) {
    console.error('Lot terrain 3D viewer init failed', error)
    sceneError.value = 'Nao foi possivel carregar a visualizacao 3D deste lote.'
  }
}

const destroyScene = () => {
  if (!runtime) return

  if (runtime.frameId !== null) {
    window.cancelAnimationFrame(runtime.frameId)
  }

  runtime.resizeObserver?.disconnect()
  runtime.controls.dispose()

  if (runtime.terrainGroup) {
    runtime.scene.remove(runtime.terrainGroup)
    disposeGroup(runtime.terrainGroup)
  }

  runtime.grassTexture.dispose()
  runtime.soilTexture.dispose()
  runtime.renderer.dispose()
  runtime = null
  isSceneReady.value = false
}

watch([terrainSpec, normalizedPolygon, solarGuideAngleDeg, showFrontOverlay, showMeasureOverlay, showSolarOverlay, showBuildingOverlay], () => {
  if (!runtime) return
  mountTerrain()
  resizeRenderer()
}, { deep: true })

onMounted(() => {
  initScene()
})

onUnmounted(() => {
  destroyScene()
})
</script>

<style scoped>
.lot-terrain-3d {
  --lot3d-bg: linear-gradient(145deg, #fff7e6 0%, #f0d19b 62%, #e6c185 100%);
  --lot3d-border: rgba(102, 63, 29, 0.14);
  --lot3d-text: #4b2d18;
  --lot3d-muted: #8e6948;
  display: grid;
  gap: 16px;
  padding: 24px;
  border-radius: 28px;
  border: 1px solid var(--lot3d-border);
  background: var(--lot3d-bg);
  box-shadow: 0 28px 70px rgba(111, 73, 35, 0.12);
  overflow: hidden;
}

.lot-terrain-3d__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.lot-terrain-3d__eyebrow {
  margin: 0 0 4px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--lot3d-muted);
}

.lot-terrain-3d__title {
  margin: 0;
  font-size: clamp(1.15rem, 2vw, 1.5rem);
  color: var(--lot3d-text);
}

.lot-terrain-3d__reset {
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--lot3d-text);
  padding: 10px 16px;
  font-weight: 700;
  cursor: pointer;
}

.lot-terrain-3d__viewport {
  position: relative;
  height: clamp(320px, 52vw, 520px);
  border-radius: 24px;
  background:
    radial-gradient(circle at 50% 28%, rgba(255, 248, 228, 0.88), rgba(255, 248, 228, 0) 54%),
    linear-gradient(180deg, rgba(255, 252, 244, 0.7), rgba(234, 201, 145, 0.5));
  border: 1px solid rgba(112, 70, 33, 0.1);
  overflow: hidden;
}

.lot-terrain-3d__controls {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  max-width: min(100%, 280px);
}

.lot-terrain-3d__control-chip {
  border: 1px solid rgba(112, 70, 33, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  color: var(--lot3d-text);
  padding: 7px 12px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 18px rgba(96, 64, 30, 0.12);
  transition: transform 160ms ease, background 160ms ease, color 160ms ease, border-color 160ms ease;
}

.lot-terrain-3d__control-chip:hover {
  transform: translateY(-1px);
}

.lot-terrain-3d__control-chip.is-active {
  background: rgba(173, 100, 39, 0.92);
  border-color: rgba(173, 100, 39, 0.92);
  color: #fff7ed;
}

.lot-terrain-3d__canvas {
  position: absolute;
  inset: 0;
}

.lot-terrain-3d__canvas :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.lot-terrain-3d__overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  text-align: center;
  color: var(--lot3d-text);
  background: rgba(255, 249, 238, 0.52);
  backdrop-filter: blur(6px);
}

.lot-terrain-3d__overlay--loading {
  font-weight: 600;
}

.lot-terrain-3d__overlay--error {
  font-weight: 700;
}

.lot-terrain-3d__hint {
  position: absolute;
  left: 18px;
  bottom: 16px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(58, 35, 20, 0.78);
  color: #fff8ed;
  font-size: 0.84rem;
  letter-spacing: 0.02em;
  pointer-events: none;
}

.lot-terrain-3d__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.lot-terrain-3d__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.74);
  color: var(--lot3d-text);
  font-weight: 700;
}

.lot-terrain-3d__metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.lot-terrain-3d__metric {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(112, 70, 33, 0.1);
}

.lot-terrain-3d__metric-label {
  display: block;
  margin-bottom: 6px;
  color: var(--lot3d-muted);
  font-size: 0.82rem;
}

.lot-terrain-3d__metric strong {
  color: var(--lot3d-text);
  font-size: 1rem;
}

.lot-terrain-3d__footnote {
  margin: 0;
  color: var(--lot3d-muted);
  font-size: 0.75rem;
}

@media (max-width: 900px) {
  .lot-terrain-3d__controls {
    left: 12px;
    right: 12px;
    top: 12px;
    justify-content: flex-start;
    max-width: none;
  }

  .lot-terrain-3d__control-chip {
    padding: 6px 11px;
    font-size: 0.74rem;
  }

  .lot-terrain-3d__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lot-terrain-3d__viewport {
    height: clamp(300px, 64vw, 440px);
  }
}

@media (max-width: 640px) {
  .lot-terrain-3d {
    padding: 18px;
    border-radius: 22px;
  }

  .lot-terrain-3d__header {
    flex-direction: column;
  }

  .lot-terrain-3d__reset {
    align-self: flex-start;
  }

  .lot-terrain-3d__metrics {
    grid-template-columns: 1fr;
  }

  .lot-terrain-3d__viewport {
    height: clamp(260px, 78vw, 340px);
  }
}
</style>