import {
  clamp,
  edgeMidpoint,
  formatMeters,
  outwardNormalForEdge,
  type PlanPoint,
  type TerrainSpec,
} from './lotTerrainPlan'
import type { LabelFactory } from './lotTerrainLabels'
import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')

export type DimensionInput = {
  three: ThreeModule
  planShape: PlanPoint[]
  spec: TerrainSpec
  colors: LotTerrainColors
  slopeYAt: (z: number) => number
  label: LabelFactory
}

/**
 * Medida declarada da aresta. O mapa fixo so corresponde ao desenho quando o
 * lote e um quadrilatero; com mais vertices, a distancia do poligono ja escalado
 * e a unica fonte confiavel.
 */
const edgeMeters = (spec: TerrainSpec, index: number, fallback: number, edgeCount: number) => {
  if (edgeCount !== 4) return fallback
  if (index === 0) return spec.frontage
  if (index === 1) return spec.sideRight
  if (index === 2) return spec.backWidth
  if (index === 3) return spec.sideLeft
  return fallback
}

/**
 * Cotas no padrao de desenho tecnico: linha de chamada saindo do vertice, linha
 * de cota paralela a aresta, ticks a 45 graus nas pontas e a medida no meio.
 * Substitui as etiquetas soltas, que se sobrepunham e nao diziam a qual lado
 * pertenciam.
 */
export const createDimensionGroup = ({ three, planShape, spec, colors: c, slopeYAt, label }: DimensionInput) => {
  const group = new three.Group()
  if (planShape.length < 3) return group

  const spanX = Math.max(...planShape.map((point) => point.x)) - Math.min(...planShape.map((point) => point.x))
  const spanZ = Math.max(...planShape.map((point) => point.z)) - Math.min(...planShape.map((point) => point.z))
  const offset = clamp(Math.max(spanX, spanZ) * 0.055, 0.7, 1.9)
  const tick = offset * 0.24

  const lineMaterial = new three.LineBasicMaterial({
    color: new three.Color(c.dimensionLine),
    transparent: true,
    opacity: 0.9,
  })
  const guideMaterial = new three.LineBasicMaterial({
    color: new three.Color(c.dimensionGuide),
    transparent: true,
    opacity: 0.45,
  })

  const addLine = (points: import('three').Vector3[], material: import('three').LineBasicMaterial) => {
    const geometry = new three.BufferGeometry().setFromPoints(points)
    const line = new three.Line(geometry, material)
    line.renderOrder = 20
    group.add(line)
  }

  const lift = 0.09

  for (let index = 0; index < planShape.length; index += 1) {
    const start = planShape[index]!
    const end = planShape[(index + 1) % planShape.length]!
    const normal = outwardNormalForEdge(planShape, index)
    const drawnLength = Math.hypot(end.x - start.x, end.z - start.z)
    const meters = edgeMeters(spec, index, drawnLength, planShape.length)
    if (!Number.isFinite(meters) || meters <= 0) continue

    const project = (point: PlanPoint, distance: number) => new three.Vector3(
      point.x + normal.x * distance,
      slopeYAt(point.z) + lift,
      point.z + normal.z * distance,
    )

    // A testada e o unico lado com calcada do lado de fora: a cota dela corre por
    // dentro do lote para continuar medindo o terreno, nao o passeio publico.
    const edgeOffset = index === 0 ? -offset * 0.5 : offset

    const startOuter = project(start, edgeOffset)
    const endOuter = project(end, edgeOffset)

    addLine([project(start, edgeOffset * 0.18), project(start, edgeOffset * 1.22)], guideMaterial)
    addLine([project(end, edgeOffset * 0.18), project(end, edgeOffset * 1.22)], guideMaterial)
    addLine([startOuter, endOuter], lineMaterial)

    const edgeDirection = new three.Vector3(end.x - start.x, 0, end.z - start.z).normalize()
    const tickDirection = edgeDirection.clone().multiplyScalar(tick)
    const tickNormal = new three.Vector3(normal.x, 0, normal.z).multiplyScalar(tick * Math.sign(edgeOffset))
    addLine([startOuter.clone().sub(tickDirection).sub(tickNormal), startOuter.clone().add(tickDirection).add(tickNormal)], lineMaterial)
    addLine([endOuter.clone().sub(tickDirection).sub(tickNormal), endOuter.clone().add(tickDirection).add(tickNormal)], lineMaterial)

    const middle = edgeMidpoint(start, end)
    const measureLabel = label(formatMeters(meters), 'measure')
    measureLabel.position.copy(project(middle, edgeOffset).add(new three.Vector3(0, 0.16, 0)))
    group.add(measureLabel)
  }

  return group
}

export type FrontMarkerInput = {
  three: ThreeModule
  planShape: PlanPoint[]
  spec: TerrainSpec
  colors: LotTerrainColors
  slopeYAt: (z: number) => number
  label: LabelFactory
}

/** Seta e etiqueta que apontam a testada — a informacao mais consultada do lote. */
export const createFrontMarker = ({ three, planShape, spec, colors: c, slopeYAt, label }: FrontMarkerInput) => {
  const group = new three.Group()
  const start = planShape[0]!
  const end = planShape[1]!
  const normal = outwardNormalForEdge(planShape, 0)
  const middle = edgeMidpoint(start, end)

  const highlight = new three.Mesh(
    new three.PlaneGeometry(Math.hypot(end.x - start.x, end.z - start.z), 0.26),
    new three.MeshBasicMaterial({
      color: new three.Color(c.frontLine),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  )
  highlight.rotation.x = -Math.PI / 2
  highlight.rotation.z = -Math.atan2(end.z - start.z, end.x - start.x)
  highlight.position.set(middle.x, slopeYAt(middle.z) + 0.05, middle.z)
  highlight.renderOrder = 18
  group.add(highlight)

  const arrowLength = clamp(spec.frontage * 0.16, 1, 2.4)
  const arrowOrigin = new three.Vector3(
    middle.x + normal.x * 0.5,
    slopeYAt(middle.z) + 0.16,
    middle.z + normal.z * 0.5,
  )
  const arrow = new three.ArrowHelper(
    new three.Vector3(normal.x, 0, normal.z),
    arrowOrigin,
    arrowLength,
    new three.Color(c.frontArrow).getHex(),
    arrowLength * 0.34,
    arrowLength * 0.18,
  )
  group.add(arrow)

  const frontLabel = label('Frente', 'front')
  frontLabel.position.set(
    middle.x + normal.x * (arrowLength + 1.4),
    slopeYAt(middle.z) + 1.15,
    middle.z + normal.z * (arrowLength + 1.4),
  )
  group.add(frontLabel)

  return group
}
