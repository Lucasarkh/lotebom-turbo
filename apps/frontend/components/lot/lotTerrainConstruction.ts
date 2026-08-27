import { clamp, createSlopeSampler, formatMeters, type PlanPoint, type TerrainSpec } from './lotTerrainPlan'
import { buildAmenities } from './lotTerrainAmenities'
import { buildHouse } from './lotTerrainHouse'
import type { TerrainAssets } from './lotTerrainAssets'
import type { LabelFactory } from './lotTerrainLabels'
import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')

export type BuildingParams = {
  recuoFrontal: number
  recuoLateral: number
  recuoFundos: number
  taxaOcupacao: number | null
  gabaritoMaximo: number | null
  hasViela: boolean
  vielaWidth: number
  vielaSide: string
}

export type ConstructionInput = {
  three: ThreeModule
  spec: TerrainSpec
  planShape: PlanPoint[]
  slopeHeight: number
  params: BuildingParams
  colors: LotTerrainColors
  assets: TerrainAssets | null
  label: LabelFactory
}

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number }

/** Retangulos ja ocupados por piso ou construcao — a vegetacao nao entra neles. */
export type OccupiedArea = Bounds

/** Area edificavel depois dos recuos e da taxa de ocupacao. */
const resolveFootprint = (spec: TerrainSpec, bounds: Bounds, bp: BuildingParams) => {
  const lotWidth = bounds.maxX - bounds.minX
  const lotDepth = bounds.maxZ - bounds.minZ

  const front = Math.min(bp.recuoFrontal, lotDepth * 0.4)
  const back = Math.min(bp.recuoFundos, lotDepth * 0.4)
  const side = Math.min(bp.recuoLateral, lotWidth * 0.3)

  const buildableWidth = Math.max(lotWidth - side * 2, 2)
  const buildableDepth = Math.max(lotDepth - front - back, 2)

  // A casa e uma ocupacao plausivel, nao o envelope maximo: encostar nos recuos
  // zera o quintal e faz um lote de 200 m2 parecer tomado pela construcao. Os
  // limites legais continuam visiveis nas linhas tracejadas.
  let width = buildableWidth * 0.82
  let depth = buildableDepth * 0.62

  if (bp.taxaOcupacao !== null && bp.taxaOcupacao > 0) {
    const lotArea = spec.area ?? lotWidth * lotDepth
    const maxFootprint = lotArea * (bp.taxaOcupacao / 100)
    if (maxFootprint > 0 && width * depth > maxFootprint) {
      const scale = Math.sqrt(maxFootprint / (width * depth))
      width *= scale
      depth *= scale
    }
  }

  // Proporcoes de casa: nem fita estreita, nem quadrado que ocupa o lote todo.
  if (width > depth * 1.6) width = depth * 1.6
  if (depth > width * 2.2) depth = width * 2.2

  return {
    width: clamp(width, 4, buildableWidth),
    depth: clamp(depth, 5, buildableDepth),
    front,
    back,
    side,
  }
}

export const buildConstructionOverlay = (input: ConstructionInput) => {
  const { three, spec, planShape, slopeHeight, params: bp, colors: c, assets, label } = input
  const group = new three.Group()
  const occupied: OccupiedArea[] = []
  let excavation: OccupiedArea | null = null

  const bounds: Bounds = {
    minX: Math.min(...planShape.map((point) => point.x)),
    maxX: Math.max(...planShape.map((point) => point.x)),
    minZ: Math.min(...planShape.map((point) => point.z)),
    maxZ: Math.max(...planShape.map((point) => point.z)),
  }
  const lotWidth = bounds.maxX - bounds.minX
  const lotDepth = bounds.maxZ - bounds.minZ
  const slopeYAt = createSlopeSampler(bounds.minZ, lotDepth, slopeHeight)

  const footprint = resolveFootprint(spec, bounds, bp)
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerZ = bounds.minZ + footprint.front + footprint.depth / 2

  const frontEdgeY = slopeYAt(centerZ - footprint.depth / 2)
  const backEdgeY = slopeYAt(centerZ + footprint.depth / 2)
  // Corte e aterro: o patamar assenta na cota media, ficando meio enterrado no
  // lado alto em vez de erguer um pedestal na altura do ponto mais alto.
  const platformY = (frontEdgeY + backEdgeY) / 2 + 0.12
  const wallHeight = clamp(bp.gabaritoMaximo ? Math.min(bp.gabaritoMaximo, 3.6) : 2.95, 2.6, 3.6)

  // Plataforma nivelada sob a casa: em aclive ou declive, a construcao assenta
  // em patamar plano, como um terreno terraplenado de verdade.
  const platformOverhang = 0.32
  const platformHeight = Math.max(Math.abs(backEdgeY - frontEdgeY) + 0.22, 0.3)
  const platformSide = new three.MeshStandardMaterial({ color: new three.Color(c.foundation), roughness: 0.92 })
  const platformTop = new three.MeshStandardMaterial({ color: new three.Color(c.pavement), roughness: 0.9 })
  const platform = new three.Mesh(
    new three.BoxGeometry(footprint.width + platformOverhang * 2, platformHeight, footprint.depth + platformOverhang * 2),
    // BoxGeometry ordena os grupos +X, -X, +Y, -Y, +Z, -Z: só a face de cima é piso.
    [platformSide, platformSide, platformTop, platformSide, platformSide, platformSide],
  )
  platform.position.set(centerX, platformY - platformHeight / 2 + 0.06, centerZ)
  platform.castShadow = true
  platform.receiveShadow = true
  group.add(platform)
  occupied.push({
    minX: centerX - footprint.width / 2 - platformOverhang,
    maxX: centerX + footprint.width / 2 + platformOverhang,
    minZ: centerZ - footprint.depth / 2 - platformOverhang,
    maxZ: centerZ + footprint.depth / 2 + platformOverhang,
  })

  const houseParts = buildHouse({
    three,
    colors: c,
    assets,
    width: footprint.width,
    depth: footprint.depth,
    wallHeight,
    baseY: platformY + 0.06,
  })
  const house = houseParts.group
  house.position.x = centerX
  house.position.z = centerZ
  group.add(house)

  // Faixa entre a divisa e a casa: a cobertura tem de respeitar o recuo, mas a
  // vaga descoberta pode ocupá-lo — e é assim que a maioria dos lotes é usada.
  const frontStripDepth = centerZ - footprint.depth / 2 - bounds.minZ
  if (frontStripDepth > 0.8) {
    const pavementMaterial = new three.MeshStandardMaterial({ color: new three.Color(c.pavement), roughness: 0.9 })
    const streetZ = bounds.minZ
    const houseEdgeZ = centerZ - footprint.depth / 2

    /**
     * Piso em rampa entre a cota da rua e o patamar da casa. Em aclive ou declive
     * um piso horizontal deixaria degrau na porta ou vao sob a laje; a rampa
     * encosta nos dois lados em qualquer topografia.
     */
    const addPavementRamp = (x: number, width: number) => {
      const startY = slopeYAt(streetZ) + 0.06
      const endY = platformY + 0.06
      const run = houseEdgeZ - streetZ
      const rise = endY - startY
      const length = Math.hypot(run, rise)
      const ramp = new three.Mesh(new three.BoxGeometry(width, 0.1, length), pavementMaterial)
      ramp.position.set(x, (startY + endY) / 2, (streetZ + houseEdgeZ) / 2)
      ramp.rotation.x = -Math.atan2(rise, run)
      ramp.receiveShadow = true
      ramp.castShadow = true
      group.add(ramp)
    }

    const parkingWidth = Math.min(footprint.width * 0.5, 3)
    addPavementRamp(centerX + houseParts.garageCenterX, parkingWidth)
    occupied.push({
      minX: centerX + houseParts.garageCenterX - parkingWidth / 2,
      maxX: centerX + houseParts.garageCenterX + parkingWidth / 2,
      minZ: bounds.minZ,
      maxZ: bounds.minZ + frontStripDepth,
    })

    addPavementRamp(centerX + houseParts.entranceCenterX, 1.2)
    occupied.push({
      minX: centerX + houseParts.entranceCenterX - 0.6,
      maxX: centerX + houseParts.entranceCenterX + 0.6,
      minZ: bounds.minZ,
      maxZ: bounds.minZ + frontStripDepth,
    })
  }

  // Quintal entre a casa e o recuo de fundos: e ele que define o porte do lazer.
  const backyardStart = centerZ + footprint.depth / 2 + 0.6
  const backyardEnd = bounds.maxZ - footprint.back
  const amenities = buildAmenities({
    three,
    colors: c,
    assets,
    backyard: {
      minX: bounds.minX + footprint.side,
      maxX: bounds.maxX - footprint.side,
      startZ: backyardStart,
      endZ: backyardEnd,
    },
    groundYAt: slopeYAt,
  })
  if (amenities) {
    group.add(amenities.group)
    excavation = amenities.excavation
    occupied.push({
      minX: centerX - (bounds.maxX - bounds.minX) / 2 + footprint.side,
      maxX: centerX + (bounds.maxX - bounds.minX) / 2 - footprint.side,
      minZ: backyardStart,
      maxZ: backyardEnd,
    })
  }

  addViela({ three, group, bounds, params: bp, colors: c, label, lotWidth, lotDepth, slopeYAt })

  return { group, occupied, excavation }
}

/**
 * Recuos como camada propria, independente da casa: eles sao a regra do
 * terreno, nao a edificacao. Montados fora do overlay de construcao para que
 * desligar "Construcao" nao apague a medida legal junto com a casa.
 */
export const buildSetbackGuides = (input: SetbackGuidesInput) => {
  const { three, spec, planShape, slopeHeight, params: bp, colors: c, label } = input

  const bounds: Bounds = {
    minX: Math.min(...planShape.map((point) => point.x)),
    maxX: Math.max(...planShape.map((point) => point.x)),
    minZ: Math.min(...planShape.map((point) => point.z)),
    maxZ: Math.max(...planShape.map((point) => point.z)),
  }
  const slopeYAt = createSlopeSampler(bounds.minZ, bounds.maxZ - bounds.minZ, slopeHeight)

  return addSetbackGuides({
    three,
    bounds,
    footprint: resolveFootprint(spec, bounds, bp),
    colors: c,
    label,
    slopeYAt,
  })
}

export type SetbackGuidesInput = {
  three: ThreeModule
  spec: TerrainSpec
  planShape: PlanPoint[]
  slopeHeight: number
  params: BuildingParams
  colors: LotTerrainColors
  label: LabelFactory
}

type SetbackInput = {
  three: ThreeModule
  bounds: Bounds
  footprint: ReturnType<typeof resolveFootprint>
  colors: LotTerrainColors
  label: LabelFactory
  slopeYAt: (z: number) => number
}

/**
 * Linhas tracejadas dos recuos, com a medida escrita sobre a faixa. Devolve o
 * grupo solto para quem monta a cena pendura-lo na camada de medidas: recuo e
 * cota ligam e desligam juntos, no chip "Medidas".
 */
const addSetbackGuides = ({ three, bounds, footprint, colors: c, label, slopeYAt }: SetbackInput) => {
  const setbackGroup = new three.Group()
  const lift = 0.1
  const addLine = (points: import('three').Vector3[]) => {
    const material = new three.LineDashedMaterial({
      color: new three.Color(c.setbackLine),
      dashSize: 0.4,
      gapSize: 0.25,
      transparent: true,
      opacity: 0.85,
    })
    const line = new three.Line(new three.BufferGeometry().setFromPoints(points), material)
    line.computeLineDistances()
    line.renderOrder = 15
    setbackGroup.add(line)
  }

  const left = bounds.minX + footprint.side
  const right = bounds.maxX - footprint.side
  const front = bounds.minZ + footprint.front
  const back = bounds.maxZ - footprint.back
  const centerX = (bounds.minX + bounds.maxX) / 2

  const addSetback = (
    text: string,
    line: import('three').Vector3[],
    labelPosition: import('three').Vector3,
  ) => {
    addLine(line)
    const setbackLabel = label(text, 'setback')
    setbackLabel.position.copy(labelPosition)
    setbackGroup.add(setbackLabel)
  }

  if (footprint.front > 0) {
    addSetback(
      `Recuo frontal ${formatMeters(footprint.front)}`,
      [new three.Vector3(left, slopeYAt(front) + lift, front), new three.Vector3(right, slopeYAt(front) + lift, front)],
      new three.Vector3(centerX - footprint.width * 0.3, slopeYAt(bounds.minZ + footprint.front * 0.5) + 0.32, bounds.minZ + footprint.front * 0.5),
    )
  }

  if (footprint.back > 0) {
    addSetback(
      `Recuo fundos ${formatMeters(footprint.back)}`,
      [new three.Vector3(left, slopeYAt(back) + lift, back), new three.Vector3(right, slopeYAt(back) + lift, back)],
      new three.Vector3(centerX, slopeYAt(bounds.maxZ - footprint.back * 0.5) + 0.32, bounds.maxZ - footprint.back * 0.5),
    )
  }

  if (footprint.side > 0) {
    const guideZ = front + (back - front) * 0.34
    addSetback(
      `Recuo lateral ${formatMeters(footprint.side)}`,
      [new three.Vector3(left, slopeYAt(front) + lift, front), new three.Vector3(left, slopeYAt(back) + lift, back)],
      new three.Vector3(bounds.minX + footprint.side * 0.5, slopeYAt(guideZ) + 0.32, guideZ),
    )
    addLine([new three.Vector3(right, slopeYAt(front) + lift, front), new three.Vector3(right, slopeYAt(back) + lift, back)])
  }

  return setbackGroup
}

type VielaInput = {
  three: ThreeModule
  group: import('three').Group
  bounds: Bounds
  params: BuildingParams
  colors: LotTerrainColors
  label: LabelFactory
  lotWidth: number
  lotDepth: number
  slopeYAt: (z: number) => number
}

const addViela = ({ three, group, bounds, params: bp, colors: c, label, lotWidth, lotDepth, slopeYAt }: VielaInput) => {
  if (!bp.hasViela || bp.vielaWidth <= 0) return

  const side = (bp.vielaSide || 'RIGHT').toUpperCase()
  const width = bp.vielaWidth
  const isBack = side === 'BACK'
  const geometryWidth = isBack ? lotWidth + 1 : width
  const geometryDepth = isBack ? width : lotDepth + 1
  const x = isBack
    ? (bounds.minX + bounds.maxX) / 2
    : side === 'LEFT'
      ? bounds.minX - width / 2 - 0.1
      : bounds.maxX + width / 2 + 0.1
  const z = isBack ? bounds.maxZ + width / 2 + 0.1 : (bounds.minZ + bounds.maxZ) / 2

  const strip = new three.Mesh(
    new three.BoxGeometry(geometryWidth, 0.06, geometryDepth),
    new three.MeshStandardMaterial({
      color: new three.Color(c.viela),
      roughness: 0.95,
      transparent: true,
      opacity: 0.8,
    }),
  )
  strip.position.set(x, slopeYAt(z) + 0.04, z)
  if (!isBack) {
    // A viela lateral corre no sentido do caimento: sem inclinar, metade dela
    // ficaria enterrada em lote com aclive ou declive.
    const rise = slopeYAt(bounds.maxZ) - slopeYAt(bounds.minZ)
    strip.rotation.x = -Math.atan2(rise, lotDepth)
  }
  strip.receiveShadow = true
  group.add(strip)

  const vielaLabel = label(`Viela ${formatMeters(width)}`, 'viela')
  vielaLabel.position.set(x, slopeYAt(z) + 0.45, isBack ? z : z - geometryDepth * 0.35)
  group.add(vielaLabel)
}
