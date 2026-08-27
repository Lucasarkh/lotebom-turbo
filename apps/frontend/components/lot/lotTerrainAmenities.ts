import { clamp } from './lotTerrainPlan'
import { createRoofMaterial } from './lotTerrainMaterials'
import { createPoolMaterials } from './lotTerrainWater'
import type { TerrainAssets } from './lotTerrainAssets'
import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')

export type AmenitiesInput = {
  three: ThreeModule
  colors: LotTerrainColors
  assets: TerrainAssets | null
  /**
   * Faixa livre nos fundos, ja limitada pelos recuos laterais e de fundos: tudo
   * o que for desenhado aqui precisa caber dentro das linhas tracejadas.
   */
  backyard: { minX: number; maxX: number; startZ: number; endZ: number }
  groundYAt: (z: number) => number
}

/** Programa de lazer que cabe no quintal — quanto maior a sobra, mais completo. */
export const resolveAmenityTier = (backyardWidth: number, backyardDepth: number) => {
  const area = backyardWidth * backyardDepth
  if (area < 28 || backyardDepth < 4 || backyardWidth < 4) return 'none'
  if (area < 70) return 'gourmet'
  return 'full'
}

/**
 * Quintal equipado: piscina com borda, deck e área gourmet coberta. Um lote de
 * 600 m² vendido com o mesmo desenho de um de 200 m² desperdiça justamente o
 * argumento de venda do lote grande.
 */
export type AmenitiesResult = {
  group: import('three').Group
  /** Retangulo que precisa ser escavado no terreno para a agua aparecer. */
  excavation: { minX: number; maxX: number; minZ: number; maxZ: number } | null
}

export const buildAmenities = ({ three, colors: c, assets, backyard, groundYAt }: AmenitiesInput): AmenitiesResult | null => {
  const depth = backyard.endZ - backyard.startZ
  const width = backyard.maxX - backyard.minX
  const tier = resolveAmenityTier(width, depth)
  if (tier === 'none') return null

  const group = new three.Group()

  const deckMaterial = new three.MeshStandardMaterial({ color: new three.Color(c.poolDeck), roughness: 0.86 })
  const coping = new three.MeshStandardMaterial({ color: new three.Color(c.slabCap), roughness: 0.7 })
  const wallMaterial = new three.MeshStandardMaterial({ color: new three.Color(c.wall), roughness: 0.8 })
  const woodMaterial = new three.MeshStandardMaterial({ color: new three.Color(c.wallAccent), roughness: 0.75 })
  const doorRecessMaterial = new three.MeshStandardMaterial({ color: new three.Color(c.grillMouth), roughness: 0.95 })

  /**
   * Piso nivelado sobre terreno inclinado: assenta na cota mais baixa do trecho e
   * engrossa o suficiente para nao deixar a laje pairando no lado alto.
   */
  const levelSlab = (zStart: number, zEnd: number) => {
    const low = Math.min(groundYAt(zStart), groundYAt(zEnd))
    const high = Math.max(groundYAt(zStart), groundYAt(zEnd))
    const height = high - low + 0.22
    return { top: high + 0.06, height, centerY: high + 0.06 - height / 2 }
  }

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

  // Area gourmet: laje de telha ceramica em uma agua, apoiada em pilares, com
  // churrasqueira de alvenaria e coifa. Uma laje branca lisa lia como abrigo de
  // garagem, nao como espaco de lazer.
  const gourmetDepth = clamp(depth * 0.36, 2.4, 3.8)
  const gourmetWidth = clamp(width * 0.54, 2.6, Math.min(4.8, width - 0.4))
  const gourmetZ = backyard.endZ - gourmetDepth / 2
  const gourmetX = backyard.minX + gourmetWidth / 2 + 0.2
  const gourmetFloor = levelSlab(gourmetZ - gourmetDepth / 2, gourmetZ + gourmetDepth / 2)
  const gourmetY = gourmetFloor.top
  const backHeight = 2.75
  const frontHeight = 2.35
  const halfGourmetX = gourmetWidth / 2
  const backWallZ = backyard.endZ - 0.08
  const frontEdgeZ = gourmetZ - gourmetDepth / 2

  addBox(gourmetWidth, gourmetFloor.height, gourmetDepth, gourmetX, gourmetFloor.centerY, gourmetZ, deckMaterial)

  // Fechamento em L: fundo e a lateral que encosta na divisa.
  addBox(gourmetWidth, backHeight, 0.16, gourmetX, gourmetY + backHeight / 2, backWallZ, wallMaterial)
  const sideWallDepth = gourmetDepth * 0.5
  const sideWallHeight = backHeight - 0.16
  addBox(
    0.16, sideWallHeight, sideWallDepth,
    gourmetX - halfGourmetX + 0.08, gourmetY + sideWallHeight / 2, backWallZ - sideWallDepth / 2 - 0.08,
    wallMaterial,
  )

  const addColumn = (x: number, z: number, height: number) => {
    addBox(0.15, height, 0.15, x, gourmetY + height / 2, z, wallMaterial)
  }
  addColumn(gourmetX - halfGourmetX + 0.09, frontEdgeZ + 0.09, frontHeight)
  addColumn(gourmetX + halfGourmetX - 0.09, frontEdgeZ + 0.09, frontHeight)
  addColumn(gourmetX + halfGourmetX - 0.09, backWallZ - 0.12, backHeight)

  // Telhado de uma agua: as duas pontas sao amarradas na cota do apoio — a
  // traseira na parede de fundo, a dianteira no topo dos pilares — para o plano
  // nascer encostado na estrutura em vez de pairar sobre ela.
  const roofMaterial = createRoofMaterial(three, assets, c)
  const roofBackY = gourmetY + backHeight
  const roofFrontY = gourmetY + frontHeight
  const roofRun = backWallZ - frontEdgeZ
  const roofRise = roofBackY - roofFrontY
  const eave = 0.28
  const roofLength = Math.hypot(roofRun, roofRise) + eave * 2
  const roof = new three.Mesh(new three.BoxGeometry(gourmetWidth + 0.44, 0.13, roofLength), roofMaterial)
  roof.position.set(gourmetX, (roofBackY + roofFrontY) / 2 + 0.065, (backWallZ + frontEdgeZ) / 2)
  // Sinal negativo: com rotacao positiva em X a ponta em +Z desceria, e o
  // caimento sairia ao contrario (alto na frente, baixo no fundo).
  roof.rotation.x = -Math.atan2(roofRise, roofRun)
  roof.castShadow = true
  roof.receiveShadow = true
  group.add(roof)

  // Churrasqueira: base, boca, coifa e chamine.
  const grillWidth = clamp(gourmetWidth * 0.3, 0.7, 1)
  const grillX = gourmetX + halfGourmetX - grillWidth / 2 - 0.22
  const bankZ = backWallZ - 0.42
  addBox(grillWidth, 1.05, 0.62, grillX, gourmetY + 0.525, bankZ, wallMaterial)
  addBox(grillWidth * 0.72, 0.42, 0.06, grillX, gourmetY + 0.78, bankZ - 0.32, doorRecessMaterial, false)
  addBox(grillWidth + 0.12, 0.07, 0.72, grillX, gourmetY + 1.08, bankZ, coping, false)

  const hood = new three.Mesh(
    new three.CylinderGeometry(grillWidth * 0.2, grillWidth * 0.62, 0.6, 4),
    wallMaterial,
  )
  hood.position.set(grillX, gourmetY + 1.45, bankZ)
  hood.rotation.y = Math.PI / 4
  hood.castShadow = true
  group.add(hood)
  addBox(grillWidth * 0.3, 0.85, grillWidth * 0.3, grillX, gourmetY + 2.05, bankZ, wallMaterial)

  // Bancada de apoio, ao lado da churrasqueira.
  const counterWidth = Math.max(gourmetWidth - grillWidth - 0.7, 0.9)
  const counterX = gourmetX - halfGourmetX + counterWidth / 2 + 0.2
  addBox(counterWidth, 0.88, 0.55, counterX, gourmetY + 0.44, bankZ, woodMaterial)
  addBox(counterWidth + 0.1, 0.07, 0.62, counterX, gourmetY + 0.92, bankZ, coping, false)

  if (tier !== 'full') return { group, excavation: null }

  // Piscina: o piso ao redor e extrudado com um furo, senao a laje macica
  // enterraria a cavidade e a agua nunca apareceria.
  // O piso perimetral avanca 0,7 m alem da lamina: e ele, e nao a piscina, que
  // define o quanto o conjunto pode crescer sem cruzar a linha de recuo.
  const apronMargin = 0.7
  const availableWidth = Math.max(width - apronMargin * 2 - 0.3, 1.2)
  const availableDepth = Math.max(depth - apronMargin * 2 - 0.3, 1.2)
  const poolWidth = clamp(width * 0.4, 2.2, Math.min(4.4, availableWidth))
  const poolDepth = clamp(depth * 0.36, 2.2, Math.min(5.2, availableDepth))
  const poolX = backyard.maxX - apronMargin - poolWidth / 2 - 0.15
  const poolZ = backyard.startZ + apronMargin + poolDepth / 2 + 0.15
  const poolFloor = levelSlab(poolZ - poolDepth / 2 - 0.7, poolZ + poolDepth / 2 + 0.7)
  const poolY = poolFloor.top

  const apronX = poolWidth / 2 + apronMargin
  const apronZ = poolDepth / 2 + apronMargin
  const apron = new three.Shape()
  apron.moveTo(-apronX, -apronZ)
  apron.lineTo(apronX, -apronZ)
  apron.lineTo(apronX, apronZ)
  apron.lineTo(-apronX, apronZ)
  apron.closePath()

  const opening = new three.Path()
  opening.moveTo(-poolWidth / 2, -poolDepth / 2)
  opening.lineTo(-poolWidth / 2, poolDepth / 2)
  opening.lineTo(poolWidth / 2, poolDepth / 2)
  opening.lineTo(poolWidth / 2, -poolDepth / 2)
  opening.closePath()
  apron.holes.push(opening)

  const apronGeometry = new three.ExtrudeGeometry(apron, {
    depth: poolFloor.height,
    bevelEnabled: false,
    steps: 1,
  })
  apronGeometry.rotateX(Math.PI / 2)
  const apronMesh = new three.Mesh(apronGeometry, deckMaterial)
  apronMesh.position.set(poolX, poolY, poolZ)
  apronMesh.receiveShadow = true
  apronMesh.castShadow = true
  group.add(apronMesh)

  const poolMaterials = createPoolMaterials(three, c, poolWidth, poolDepth)

  // Cavidade de 1,2 m renderizada pelo avesso, com a lamina 15 cm abaixo da borda.
  // O casco entra alguns centimetros para dentro do furo do piso: encostado nele,
  // as duas paredes ficariam no mesmo plano e disputariam cada pixel.
  const poolShellHeight = 1.2
  const shellInset = 0.06
  addBox(
    poolWidth - shellInset, poolShellHeight, poolDepth - shellInset,
    poolX, poolY - poolShellHeight / 2 + 0.01, poolZ,
    poolMaterials.shell, false,
  )

  const water = addBox(
    poolWidth - shellInset - 0.06, 0.04, poolDepth - shellInset - 0.06,
    poolX, poolY - 0.15, poolZ,
    poolMaterials.water, false,
  )
  water.renderOrder = 4

  // Deck de madeira encostado na borda do piso, sem sobrepor o concreto.
  const deckZ = Math.min(poolZ + apronZ + 0.65, backyard.endZ - 0.7)
  const deckFloor = levelSlab(deckZ - 0.6, deckZ + 0.6)
  addBox(poolWidth * 0.8, deckFloor.height, 1.2, poolX, deckFloor.centerY, deckZ, woodMaterial, false)

  return {
    group,
    excavation: {
      minX: poolX - poolWidth / 2,
      maxX: poolX + poolWidth / 2,
      minZ: poolZ - poolDepth / 2,
      maxZ: poolZ + poolDepth / 2,
    },
  }
}
