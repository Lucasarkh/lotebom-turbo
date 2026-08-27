import { clamp, createSlopeSampler, distance2d, slopeProfile, type PlanPoint, type TerrainSpec } from './lotTerrainPlan'
import { createBushField, createGrassFringe } from './lotTerrainDecor'
import { createDimensionGroup, createFrontMarker } from './lotTerrainDimensions'
import { createGrassFringeMaterial, createTerrainMaterials } from './lotTerrainMaterials'
import { createSidewalk } from './lotTerrainSidewalk'
import { createSolarGuide } from './lotTerrainSolar'
import { buildConstructionOverlay, buildSetbackGuides, type BuildingParams, type OccupiedArea } from './lotTerrainConstruction'
import type { TerrainAssets } from './lotTerrainAssets'
import type { LabelFactory } from './lotTerrainLabels'
import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')

export type LotTerrainGroupContext = {
  three: ThreeModule
  assets: TerrainAssets | null
  fallbackGrass: import('three').Texture
  fallbackSoil: import('three').Texture
  label: LabelFactory
  planShape: PlanPoint[]
  spec: TerrainSpec
  colors: LotTerrainColors
  buildingParams: BuildingParams
  showFront: boolean
  showMeasure: boolean
  showSolar: boolean
  showBuilding: boolean
  hasSolarGuide: boolean
  solarGuideAngleDeg: number | null
  hasBuildingData: boolean
  sunT: number
}

export const applyTerrainRelief = (
  three: ThreeModule,
  geometry: import('three').ExtrudeGeometry,
  slopeHeight: number,
) => {
  const positions = geometry.attributes.position as import('three').BufferAttribute | undefined
  if (!positions) return
  const box = new three.Box3().setFromBufferAttribute(positions)
  const depthSpan = Math.max(box.max.z - box.min.z, 0.0001)

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    const z = positions.getZ(index)
    const slopeRatio = (z - box.min.z) / depthSpan
    const slopeOffset = slopeHeight * slopeProfile(slopeRatio)
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

export const buildTerrainGroup = (ctx: LotTerrainGroupContext) => {
  const { three, planShape, spec, colors: c } = ctx
  if (planShape.length < 3) return null

  const spanX = Math.max(...planShape.map((point) => point.x)) - Math.min(...planShape.map((point) => point.x))
  const spanZ = Math.max(...planShape.map((point) => point.z)) - Math.min(...planShape.map((point) => point.z))
  const minZ = Math.min(...planShape.map((point) => point.z))
  const maxDimension = Math.max(spanX, spanZ, spec.sideLeft, spec.sideRight)
  const thickness = clamp(maxDimension * 0.15, 2, 4.2)
  const slopeHeight = spec.slopeKey === 'UPHILL'
    ? clamp(maxDimension * 0.075, 0.6, 1.9)
    : spec.slopeKey === 'DOWNHILL'
      ? -clamp(maxDimension * 0.075, 0.6, 1.9)
      : 0
  const slopeYAt = createSlopeSampler(minZ, spanZ, slopeHeight)

  const buildingActive = ctx.showBuilding && ctx.hasBuildingData
  let occupiedAreas: OccupiedArea[] = []
  let constructionGroup: import('three').Group | null = null
  let excavation: OccupiedArea | null = null

  if (buildingActive) {
    try {
      const construction = buildConstructionOverlay({
        three,
        spec,
        planShape,
        slopeHeight,
        params: ctx.buildingParams,
        colors: c,
        assets: ctx.assets,
        label: ctx.label,
      })
      constructionGroup = construction.group
      occupiedAreas = construction.occupied
      excavation = construction.excavation
    } catch (error) {
      console.warn('[LotTerrain3D] Falha ao montar a projecao de construcao:', error)
    }
  }

  const shape = new three.Shape()
  shape.moveTo(planShape[0]!.x, planShape[0]!.z)
  for (let index = 1; index < planShape.length; index += 1) {
    shape.lineTo(planShape[index]!.x, planShape[index]!.z)
  }
  shape.closePath()

  // A piscina precisa de um vazio no proprio terreno: sem escavar, o gramado
  // continuaria fechando o fundo e a agua ficaria escondida sob a superficie.
  // A folga deixa as paredes de terra atras do casco de azulejo — coplanares
  // elas brigariam pelo mesmo pixel (o "piscar" do z-fighting).
  if (excavation) {
    const clearance = 0.07
    const hole = new three.Path()
    hole.moveTo(excavation.minX - clearance, excavation.minZ - clearance)
    hole.lineTo(excavation.minX - clearance, excavation.maxZ + clearance)
    hole.lineTo(excavation.maxX + clearance, excavation.maxZ + clearance)
    hole.lineTo(excavation.maxX + clearance, excavation.minZ - clearance)
    hole.closePath()
    shape.holes.push(hole)
  }

  const terrainGeometry = new three.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 12,
    steps: 1,
  })
  terrainGeometry.rotateX(Math.PI / 2)
  applyTerrainRelief(three, terrainGeometry, slopeHeight)

  const terrainMaterials = createTerrainMaterials({
    three,
    assets: ctx.assets,
    colors: c,
    fallbackGrass: ctx.fallbackGrass,
    fallbackSoil: ctx.fallbackSoil,
  })
  const terrainMesh = new three.Mesh(terrainGeometry, terrainMaterials)
  terrainMesh.castShadow = true
  terrainMesh.receiveShadow = true

  const terrainBounds = new three.Box3().setFromObject(terrainMesh)
  const terrainCenter = terrainBounds.getCenter(new three.Vector3())
  const terrainSphere = terrainBounds.getBoundingSphere(new three.Sphere())

  const terrainGroup = new three.Group()
  terrainGroup.add(terrainMesh)

  const sidewalk = createSidewalk({
    three,
    planShape,
    colors: c,
    slopeYAt,
    thickness,
    soilMaterial: terrainMaterials[1]!,
  })
  if (sidewalk) terrainGroup.add(sidewalk)

  const perimeterMeters = planShape.reduce(
    (total, point, index) => total + distance2d(point, planShape[(index + 1) % planShape.length]!),
    0,
  )
  const fringeMaterial = createGrassFringeMaterial(three, ctx.assets, c, ctx.fallbackGrass, perimeterMeters)
  if (fringeMaterial) {
    const fringe = createGrassFringe({ three, planShape, material: fringeMaterial, slopeYAt })
    if (fringe) terrainGroup.add(fringe)
  }

  if (constructionGroup) terrainGroup.add(constructionGroup)

  const bushes = createBushField({
    three,
    planShape,
    colors: c,
    slopeYAt,
    keepOut: occupiedAreas,
  })
  if (bushes) terrainGroup.add(bushes)

  // Frente, medidas e sol sao montados sempre e apenas escondidos: alternar um
  // chip nao pode reconstruir terreno, casa e vegetacao inteiros.
  const dimensions = createDimensionGroup({
    three,
    planShape,
    spec,
    colors: c,
    slopeYAt,
    label: ctx.label,
  })
  // O recuo e regra do terreno, nao edificacao: vive na camada de medidas e so
  // depende de haver parametro construtivo, mesmo com a casa desligada.
  if (ctx.hasBuildingData) {
    try {
      dimensions.add(buildSetbackGuides({
        three,
        spec,
        planShape,
        slopeHeight,
        params: ctx.buildingParams,
        colors: c,
        label: ctx.label,
      }))
    } catch (error) {
      console.warn('[LotTerrain3D] Falha ao montar os recuos:', error)
    }
  }
  dimensions.visible = ctx.showMeasure
  terrainGroup.add(dimensions)

  const frontMarker = createFrontMarker({
    three,
    planShape,
    spec,
    colors: c,
    slopeYAt,
    label: ctx.label,
  })
  frontMarker.visible = ctx.showFront
  terrainGroup.add(frontMarker)

  terrainGroup.userData.layers = { dimensions, front: frontMarker }

  if (ctx.hasSolarGuide && ctx.solarGuideAngleDeg !== null) {
    const solar = createSolarGuide({
      three,
      planShape,
      center: terrainCenter,
      colors: c,
      angleDeg: ctx.solarGuideAngleDeg,
      buildingTopY: buildingActive ? 8 : 0,
      label: ctx.label,
      sunT: ctx.sunT,
    })
    // O guia pode ser escondido, mas a posicao do sol continua valendo: e ela
    // que orienta a luz e a sombra da cena.
    solar.group.visible = ctx.showSolar
    terrainGroup.add(solar.group)
    terrainGroup.userData.layers.solar = solar.group
    terrainGroup.userData.sunPosition = solar.sunPosition
    terrainGroup.userData.sunCurve = solar.curve
    terrainGroup.userData.sunDisc = solar.sunDisc
  }

  terrainGroup.userData.terrainCenter = terrainCenter.clone()
  terrainGroup.userData.terrainRadius = Math.max(terrainSphere.radius, 3)
  terrainGroup.userData.terrainBottom = terrainBounds.min.y
  terrainGroup.position.x -= terrainCenter.x
  terrainGroup.position.z -= terrainCenter.z
  terrainGroup.position.y += thickness * 0.34
  return terrainGroup
}
