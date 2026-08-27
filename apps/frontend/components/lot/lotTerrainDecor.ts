import { clamp, distance2d, polygonCentroid, type PlanPoint } from './lotTerrainPlan'
import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')

const FRINGE_HEIGHT = 0.34
const FRINGE_OUTSET = 0.035

/** PRNG deterministico: o mesmo lote sempre recebe a mesma vegetacao. */
const createRandom = (seed: number) => {
  let state = Math.floor(Math.abs(seed) * 1000) + 1
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type GrassFringeInput = {
  three: ThreeModule
  planShape: PlanPoint[]
  material: import('three').Material
  slopeYAt: (z: number) => number
}

/**
 * Faixa vertical de grama presa ao contorno do lote. Recortada pelo alphaMap do
 * material, ela cria a borda de gramado transbordando sobre o corte de terra.
 */
export const createGrassFringe = ({ three, planShape, material, slopeYAt }: GrassFringeInput) => {
  const centroid = polygonCentroid(planShape)
  const positions: number[] = []
  const uvs: number[] = []
  const normals: number[] = []

  const perimeter = planShape.reduce(
    (total, point, index) => total + distance2d(point, planShape[(index + 1) % planShape.length]!),
    0,
  )
  if (perimeter <= 0) return null

  let travelled = 0

  for (let index = 0; index < planShape.length; index += 1) {
    const start = planShape[index]!
    const end = planShape[(index + 1) % planShape.length]!
    const edgeLength = distance2d(start, end)
    if (edgeLength <= 0) continue

    const dirX = (end.x - start.x) / edgeLength
    const dirZ = (end.z - start.z) / edgeLength
    let outX = dirZ
    let outZ = -dirX
    const midX = (start.x + end.x) / 2 - centroid.x
    const midZ = (start.z + end.z) / 2 - centroid.z
    if (outX * midX + outZ * midZ < 0) {
      outX = -outX
      outZ = -outZ
    }

    // Segmentos curtos acompanham o desnivel do terreno sem descolar da borda.
    const segments = Math.max(1, Math.round(edgeLength / 0.9))
    for (let step = 0; step < segments; step += 1) {
      const t0 = step / segments
      const t1 = (step + 1) / segments
      const points = [t0, t1].map((t) => ({
        x: start.x + (end.x - start.x) * t + outX * FRINGE_OUTSET,
        z: start.z + (end.z - start.z) * t + outZ * FRINGE_OUTSET,
        u: (travelled + edgeLength * t) / perimeter,
      }))

      const [a, b] = points as [typeof points[0], typeof points[0]]
      const topA = slopeYAt(a.z) + 0.03
      const topB = slopeYAt(b.z) + 0.03
      const bottomA = topA - FRINGE_HEIGHT
      const bottomB = topB - FRINGE_HEIGHT

      positions.push(
        a.x, bottomA, a.z, b.x, bottomB, b.z, b.x, topB, b.z,
        a.x, bottomA, a.z, b.x, topB, b.z, a.x, topA, a.z,
      )
      uvs.push(a.u, 0, b.u, 0, b.u, 1, a.u, 0, b.u, 1, a.u, 1)
      for (let vertex = 0; vertex < 6; vertex += 1) {
        normals.push(outX, 0.35, outZ)
      }
    }

    travelled += edgeLength
  }

  if (!positions.length) return null

  const geometry = new three.BufferGeometry()
  geometry.setAttribute('position', new three.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new three.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('normal', new three.Float32BufferAttribute(normals, 3))
  geometry.normalizeNormals()

  const mesh = new three.Mesh(geometry, material)
  mesh.castShadow = false
  mesh.receiveShadow = true
  return mesh
}

export type BushFieldInput = {
  three: ThreeModule
  planShape: PlanPoint[]
  colors: LotTerrainColors
  slopeYAt: (z: number) => number
  /** Retangulos ja ocupados (casa, piso, lazer): a vegetacao nao entra neles. */
  keepOut: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>
}

/** Distancia do ponto ate a aresta mais proxima; negativa quando esta fora. */
const distanceToBorder = (point: PlanPoint, polygon: PlanPoint[]) => {
  let inside = false
  let minDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]!
    const b = polygon[(index + 1) % polygon.length]!

    if ((a.z > point.z) !== (b.z > point.z)) {
      const crossX = ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x
      if (point.x < crossX) inside = !inside
    }

    const edgeX = b.x - a.x
    const edgeZ = b.z - a.z
    const lengthSquared = edgeX * edgeX + edgeZ * edgeZ
    const t = lengthSquared > 0
      ? clamp(((point.x - a.x) * edgeX + (point.z - a.z) * edgeZ) / lengthSquared, 0, 1)
      : 0
    minDistance = Math.min(minDistance, Math.hypot(point.x - (a.x + edgeX * t), point.z - (a.z + edgeZ * t)))
  }

  return inside ? minDistance : -minDistance
}

/**
 * Arbustos low-poly em um unico InstancedMesh (uma chamada de desenho).
 * Ficam sempre na faixa entre o perimetro e a area util, quebrando a leitura
 * de "caixa sobre tapete" do gramado vazio.
 */
export const createBushField = ({ three, planShape, colors, slopeYAt, keepOut }: BushFieldInput) => {
  const minX = Math.min(...planShape.map((point) => point.x))
  const maxX = Math.max(...planShape.map((point) => point.x))
  const minZ = Math.min(...planShape.map((point) => point.z))
  const maxZ = Math.max(...planShape.map((point) => point.z))
  const width = maxX - minX
  const depth = maxZ - minZ
  if (width <= 0 || depth <= 0) return null

  const random = createRandom(width * 31.7 + depth * 7.3)
  const count = clamp(Math.round((width + depth) / 7), 4, 12)

  const geometry = new three.IcosahedronGeometry(0.5, 1)
  const position = geometry.attributes.position as import('three').BufferAttribute
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const noise = 1 + (Math.sin(x * 9.1) + Math.cos(z * 7.3) + Math.sin(y * 5.7)) * 0.09
    position.setXYZ(index, x * noise, y * noise * 1.12, z * noise)
  }
  geometry.computeVertexNormals()

  const material = new three.MeshStandardMaterial({
    color: new three.Color(colors.bushDark),
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  })

  const mesh = new three.InstancedMesh(geometry, material, count)
  mesh.castShadow = true
  mesh.receiveShadow = true

  const matrix = new three.Matrix4()
  const tint = new three.Color()
  const light = new three.Color(colors.bushLight)
  const dark = new three.Color(colors.bushDark)
  const margin = clamp(Math.min(width, depth) * 0.12, 0.5, 1.6)

  let placed = 0
  let attempts = 0
  while (placed < count && attempts < count * 40) {
    attempts += 1
    const x = minX + width * random()
    const z = minZ + depth * random()

    // Faixa util: dentro do lote, colado na divisa, longe da area edificavel.
    const border = distanceToBorder({ x, z }, planShape)
    if (border < margin * 0.45 || border > margin * 1.9) continue

    const blocked = keepOut.some((area) => (
      x > area.minX - 0.4 && x < area.maxX + 0.4
      && z > area.minZ - 0.4 && z < area.maxZ + 0.4
    ))
    if (blocked) continue

    const scale = 0.55 + random() * 0.75
    matrix.makeScale(scale, scale * (0.85 + random() * 0.4), scale)
    matrix.setPosition(x, slopeYAt(z) + scale * 0.34, z)
    mesh.setMatrixAt(placed, matrix)
    mesh.setColorAt(placed, tint.copy(dark).lerp(light, random()))
    placed += 1
  }

  if (!placed) {
    geometry.dispose()
    material.dispose()
    return null
  }

  mesh.count = placed
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  return mesh
}
