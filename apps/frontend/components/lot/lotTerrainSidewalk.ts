import { clamp, outwardNormalForEdge, type PlanPoint } from './lotTerrainPlan'
import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')

export type SidewalkInput = {
  three: ThreeModule
  planShape: PlanPoint[]
  colors: LotTerrainColors
  slopeYAt: (z: number) => number
  /** Espessura do bloco de terreno, para a calcada nascer do mesmo corte. */
  thickness: number
  soilMaterial: import('three').Material
}

const SIDEWALK_WIDTH = 1.6
const CURB_HEIGHT = 0.16

/**
 * Passeio publico na testada. Fica fora da divisa — que é onde a calçada existe
 * de verdade — e por isso não entra em nenhuma medida do lote; serve para o
 * visitante entender de que lado está a rua.
 */
export const createSidewalk = ({ three, planShape, colors: c, slopeYAt, thickness, soilMaterial }: SidewalkInput) => {
  const start = planShape[0]
  const end = planShape[1]
  if (!start || !end) return null

  const normal = outwardNormalForEdge(planShape, 0)
  const width = clamp(SIDEWALK_WIDTH, 1.2, 2.4)
  const group = new three.Group()

  const outerStart = { x: start.x + normal.x * width, z: start.z + normal.z * width }
  const outerEnd = { x: end.x + normal.x * width, z: end.z + normal.z * width }

  const shape = new three.Shape()
  shape.moveTo(start.x, start.z)
  shape.lineTo(end.x, end.z)
  shape.lineTo(outerEnd.x, outerEnd.z)
  shape.lineTo(outerStart.x, outerStart.z)
  shape.closePath()

  const geometry = new three.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, steps: 1 })
  geometry.rotateX(Math.PI / 2)
  geometry.translate(0, slopeYAt(start.z), 0)

  const pavementMaterial = new three.MeshStandardMaterial({ color: new three.Color(c.pavement), roughness: 0.92 })
  const slab = new three.Mesh(geometry, [pavementMaterial, soilMaterial])
  slab.receiveShadow = true
  slab.castShadow = true
  group.add(slab)

  // Meio-fio na borda externa, junto ao leito da rua.
  const edgeLength = Math.hypot(outerEnd.x - outerStart.x, outerEnd.z - outerStart.z)
  const curb = new three.Mesh(
    new three.BoxGeometry(edgeLength, CURB_HEIGHT, 0.16),
    new three.MeshStandardMaterial({ color: new three.Color(c.slabCap), roughness: 0.85 }),
  )
  curb.position.set(
    (outerStart.x + outerEnd.x) / 2,
    slopeYAt(start.z) + CURB_HEIGHT / 2,
    (outerStart.z + outerEnd.z) / 2,
  )
  curb.rotation.y = -Math.atan2(outerEnd.z - outerStart.z, outerEnd.x - outerStart.x)
  curb.castShadow = true
  curb.receiveShadow = true
  group.add(curb)

  return group
}
