import { clamp } from './lotTerrainPlan'
import { createRoofMaterial, createWallMaterial } from './lotTerrainMaterials'
import type { TerrainAssets } from './lotTerrainAssets'
import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')
type ThreeGroup = import('three').Group

export type HouseInput = {
  three: ThreeModule
  colors: LotTerrainColors
  assets: TerrainAssets | null
  /** Medidas do bloco em metros, no eixo X (largura) e Z (profundidade). */
  width: number
  depth: number
  /** Altura livre da parede; a platibanda sobe acima disso. */
  wallHeight: number
  /** Y da base das paredes, ja acima da fundacao. */
  baseY: number
}

const PARAPET_HEIGHT = 0.52
const PARAPET_THICKNESS = 0.14
const SLAB_THICKNESS = 0.16
const EAVE = 0.22

/**
 * Casa terrea de laje: volume principal com platibanda, garagem coberta a frente
 * e fachada com painel de revestimento. Substitui a caixa com telhado de duas
 * aguas, que lia como maquete escolar em cima de um terreno fotografico.
 */
export const buildHouse = ({ three, colors: c, assets, width, depth, wallHeight, baseY }: HouseInput) => {
  const group = new three.Group()
  group.position.y = baseY

  const halfWidth = width / 2
  const halfDepth = depth / 2
  const frontZ = -halfDepth

  const wallMaterial = createWallMaterial(three, assets, c)
  const capMaterial = new three.MeshStandardMaterial({ color: new three.Color(c.slabCap), roughness: 0.7 })
  const slabMaterial = new three.MeshStandardMaterial({ color: new three.Color(c.slab), roughness: 0.9 })
  const accentMaterial = createRoofMaterial(three, assets, { ...c, roof: c.wallAccent })
  const frameMaterial = new three.MeshStandardMaterial({ color: new three.Color(c.frame), roughness: 0.45, metalness: 0.1 })
  const glassMaterial = new three.MeshStandardMaterial({
    color: new three.Color(c.window),
    roughness: 0.14,
    metalness: 0.1,
    transparent: true,
    opacity: 0.82,
  })
  const doorMaterial = new three.MeshStandardMaterial({ color: new three.Color(c.door), roughness: 0.55 })

  const addBox = (
    w: number, h: number, d: number,
    x: number, y: number, z: number,
    material: import('three').Material,
    shadow = true,
  ) => {
    const mesh = new three.Mesh(new three.BoxGeometry(w, h, d), material)
    mesh.position.set(x, y, z)
    mesh.castShadow = shadow
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }

  // Garagem coberta ocupa a faixa da frente, encostada na divisa esquerda.
  const garageDepth = clamp(depth * 0.26, 2.2, 4.4)
  const garageWidth = clamp(width * 0.42, 2.5, Math.max(width - 1.6, 2.5))
  const garageHeight = Math.max(wallHeight - 0.45, 2.3)
  const bodyFrontZ = frontZ + garageDepth
  const bodyDepth = depth - garageDepth

  // Volume principal
  const bodyCenterZ = bodyFrontZ + bodyDepth / 2
  addBox(width, wallHeight, bodyDepth, 0, wallHeight / 2, bodyCenterZ, wallMaterial)
  addBox(width, SLAB_THICKNESS, bodyDepth + EAVE, 0, wallHeight + SLAB_THICKNESS / 2, bodyCenterZ + EAVE / 2, slabMaterial)

  const parapetY = wallHeight + SLAB_THICKNESS + PARAPET_HEIGHT / 2
  const parapetFrontZ = bodyFrontZ + PARAPET_THICKNESS / 2
  addBox(width, PARAPET_HEIGHT, PARAPET_THICKNESS, 0, parapetY, parapetFrontZ, wallMaterial)
  addBox(width, PARAPET_HEIGHT, PARAPET_THICKNESS, 0, parapetY, halfDepth - PARAPET_THICKNESS / 2, wallMaterial)
  addBox(PARAPET_THICKNESS, PARAPET_HEIGHT, bodyDepth, -halfWidth + PARAPET_THICKNESS / 2, parapetY, bodyCenterZ, wallMaterial)
  addBox(PARAPET_THICKNESS, PARAPET_HEIGHT, bodyDepth, halfWidth - PARAPET_THICKNESS / 2, parapetY, bodyCenterZ, wallMaterial)

  // Rufo claro no topo da platibanda: é o friso que dá escala à fachada.
  const capY = wallHeight + SLAB_THICKNESS + PARAPET_HEIGHT + 0.03
  addBox(width + 0.1, 0.06, PARAPET_THICKNESS + 0.1, 0, capY, parapetFrontZ, capMaterial)
  addBox(width + 0.1, 0.06, PARAPET_THICKNESS + 0.1, 0, capY, halfDepth - PARAPET_THICKNESS / 2, capMaterial)
  addBox(PARAPET_THICKNESS + 0.1, 0.06, bodyDepth, -halfWidth + PARAPET_THICKNESS / 2, capY, bodyCenterZ, capMaterial)
  addBox(PARAPET_THICKNESS + 0.1, 0.06, bodyDepth, halfWidth - PARAPET_THICKNESS / 2, capY, bodyCenterZ, capMaterial)

  // Garagem: laje apoiada em um pilar, aberta para a rua.
  const garageCenterX = -halfWidth + garageWidth / 2
  const garageCenterZ = frontZ + garageDepth / 2
  addBox(0.2, garageHeight, garageDepth, -halfWidth + 0.1, garageHeight / 2, garageCenterZ, wallMaterial)
  addBox(
    garageWidth + EAVE, SLAB_THICKNESS, garageDepth + EAVE,
    garageCenterX + EAVE / 2, garageHeight + SLAB_THICKNESS / 2, garageCenterZ - EAVE / 2,
    slabMaterial,
  )
  addBox(0.22, garageHeight, 0.22, garageCenterX + garageWidth / 2 - 0.11, garageHeight / 2, frontZ + 0.11, wallMaterial)

  // Painel de revestimento na entrada — o contraste de material que as fachadas
  // reais usam para marcar a porta.
  const entranceWidth = Math.max(width - garageWidth - 0.2, 1.4)
  const entranceCenterX = halfWidth - entranceWidth / 2
  addBox(entranceWidth * 0.62, wallHeight - 0.1, 0.06, entranceCenterX, (wallHeight - 0.1) / 2, bodyFrontZ - 0.03, accentMaterial)

  // Marquise sobre a porta
  addBox(entranceWidth, 0.12, 0.9, entranceCenterX, wallHeight - 0.35, bodyFrontZ - 0.45, slabMaterial)

  const doorWidth = clamp(entranceWidth * 0.4, 0.85, 1.1)
  const doorHeight = clamp(wallHeight * 0.72, 2, 2.3)
  addBox(doorWidth + 0.1, doorHeight + 0.06, 0.09, entranceCenterX, (doorHeight + 0.06) / 2, bodyFrontZ - 0.09, frameMaterial)
  addBox(doorWidth, doorHeight, 0.06, entranceCenterX, doorHeight / 2, bodyFrontZ - 0.12, doorMaterial)
  addBox(0.04, doorHeight * 0.42, 0.04, entranceCenterX + doorWidth * 0.34, doorHeight * 0.52, bodyFrontZ - 0.16, frameMaterial, false)

  // Porta dos fundos: saida da casa para o quintal e a area de lazer.
  const backDoorWidth = clamp(width * 0.16, 0.8, 1)
  const backDoorHeight = clamp(wallHeight * 0.68, 1.95, 2.2)
  const backDoorX = -halfWidth + backDoorWidth * 1.4
  addBox(backDoorWidth + 0.1, backDoorHeight + 0.06, 0.09, backDoorX, (backDoorHeight + 0.06) / 2, halfDepth + 0.05, frameMaterial, false)
  addBox(backDoorWidth, backDoorHeight, 0.06, backDoorX, backDoorHeight / 2, halfDepth + 0.08, doorMaterial, false)

  /** Esquadria completa: moldura, vidro recuado e peitoril. */
  const addWindow = (x: number, z: number, w: number, h: number, sillY: number, alongX: boolean) => {
    const centerY = sillY + h / 2
    const frameDepth = 0.1
    const frameW = alongX ? w + 0.12 : frameDepth
    const frameD = alongX ? frameDepth : w + 0.12
    const glassW = alongX ? w : 0.04
    const glassD = alongX ? 0.04 : w

    addBox(frameW, h + 0.12, frameD, x, centerY, z, frameMaterial, false)
    addBox(glassW, h, glassD, x, centerY, z, glassMaterial, false)
    addBox(
      alongX ? w + 0.24 : 0.18, 0.06, alongX ? 0.18 : w + 0.24,
      x, sillY - 0.05, z,
      capMaterial, false,
    )
  }

  const windowHeight = clamp(wallHeight * 0.38, 1.1, 1.4)
  const sillY = wallHeight * 0.42
  const sideCount = Math.max(1, Math.round(bodyDepth / 3.4))
  const sideStep = bodyDepth / (sideCount + 1)

  for (let index = 0; index < sideCount; index += 1) {
    const z = bodyFrontZ + sideStep * (index + 1)
    const windowWidth = clamp(sideStep * 0.5, 0.8, 1.5)
    addWindow(-halfWidth - 0.02, z, windowWidth, windowHeight, sillY, false)
    addWindow(halfWidth + 0.02, z, windowWidth, windowHeight, sillY, false)
  }

  // Janela da sala, ao lado da porta, e janela dos fundos.
  const livingWidth = clamp(entranceWidth * 0.9, 1, 2.2)
  if (entranceWidth > doorWidth + 1.1) {
    addWindow(entranceCenterX - entranceWidth * 0.5 - 0.1, bodyFrontZ - 0.05, livingWidth * 0.7, windowHeight, sillY, true)
  }
  addWindow(0, halfDepth + 0.02, clamp(width * 0.3, 1, 2), windowHeight, sillY, true)

  return {
    group: group as ThreeGroup,
    /** Centro da cobertura de garagem, em coordenadas locais da casa. */
    garageCenterX,
    garageWidth,
    entranceCenterX,
    frontZ,
  }
}
