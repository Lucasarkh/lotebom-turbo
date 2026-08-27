import { withRepeat, type TerrainAssets, type TerrainMaterialMaps } from './lotTerrainAssets'
import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')
type ThreeTexture = import('three').Texture
type ThreeMaterial = import('three').MeshStandardMaterial

// Mascara de recorte: opacidade total, nao cor de interface.
const MASK_OPAQUE = 'white'

// Lado do ladrilho em metros. As UVs da extrusao sao geradas em coordenadas de
// mundo, entao `repeat = 1 / tile` mantem a escala fisica correta em qualquer lote.
const TILE_METERS = {
  grass: 2.4,
  soil: 3.2,
  roof: 1.1,
  wall: 3.5,
} as const

export type TerrainMaterialInput = {
  three: ThreeModule
  assets: TerrainAssets | null
  colors: LotTerrainColors
  fallbackGrass: ThreeTexture
  fallbackSoil: ThreeTexture
}

const applyMaps = (material: ThreeMaterial, maps: TerrainMaterialMaps, normalScale: number, three: ThreeModule) => {
  material.map = maps.map
  if (maps.normalMap) {
    material.normalMap = maps.normalMap
    material.normalScale = new three.Vector2(normalScale, normalScale)
  }
  if (maps.roughnessMap) {
    material.roughnessMap = maps.roughnessMap
  }
  return material
}

/**
 * Materiais do terreno. Com as texturas PBR disponiveis o tom do tema entra como
 * tinta multiplicativa suave; sem elas, cai no canvas procedural com a cor cheia.
 */
export const createTerrainMaterials = (input: TerrainMaterialInput) => {
  const { three, assets, colors: c, fallbackGrass, fallbackSoil } = input
  const tint = () => new three.Color().setScalar(c.textureTint)

  const top = new three.MeshStandardMaterial({ roughness: 0.94, metalness: 0 })
  const side = new three.MeshStandardMaterial({ roughness: 1, metalness: 0 })

  if (assets) {
    applyMaps(top, withRepeat(assets.grass, 1 / TILE_METERS.grass, 1 / TILE_METERS.grass), 1.15, three)
    applyMaps(side, withRepeat(assets.soil, 1 / TILE_METERS.soil, 1 / TILE_METERS.soil), 1.4, three)
    top.color = tint()
    side.color = tint()
  } else {
    // Clones: os originais pertencem ao runtime e sobrevivem a cada remontagem.
    top.map = fallbackGrass.clone()
    side.map = fallbackSoil.clone()
    top.color = new three.Color(c.terrainTopTint)
    side.color = new three.Color(c.terrainSideTint)
  }

  return [top, side]
}

export const createRoofMaterial = (three: ThreeModule, assets: TerrainAssets | null, c: LotTerrainColors) => {
  const material = new three.MeshStandardMaterial({ color: new three.Color(c.roof), roughness: 0.8, metalness: 0 })
  if (assets) {
    applyMaps(material, withRepeat(assets.roof, 1 / TILE_METERS.roof, 1 / TILE_METERS.roof), 1.6, three)
    // A telha CC0 e quase monocromatica: o tom do tema define a cor final.
    material.color = new three.Color(c.roof).multiplyScalar(1.35)
  }
  return material
}

export const createWallMaterial = (three: ThreeModule, assets: TerrainAssets | null, c: LotTerrainColors) => {
  const material = new three.MeshStandardMaterial({ color: new three.Color(c.wall), roughness: 0.82, metalness: 0 })
  if (assets) {
    applyMaps(material, withRepeat(assets.wall, 1 / TILE_METERS.wall, 1 / TILE_METERS.wall), 0.7, three)
  }
  return material
}

/**
 * Franja de grama que transborda a borda do terreno. O alphaMap recorta as pontas
 * verticais, o que da o contorno irregular do gramado sem custo de geometria.
 */
export const createGrassFringeTexture = (three: ThreeModule) => {
  const width = 256
  const height = 128
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null

  context.fillStyle = MASK_OPAQUE
  context.fillRect(0, 0, width, height * 0.42)

  // Tufos de largura e altura variaveis, com bordas em queda suave.
  context.beginPath()
  for (let x = 0; x <= width; x += 2) {
    const wave = Math.sin(x * 0.19) * 0.5 + Math.sin(x * 0.41 + 1.7) * 0.32 + Math.sin(x * 0.83) * 0.18
    const tip = height * (0.5 + (wave + 1) * 0.24)
    context.rect(x, height * 0.42, 2.4, tip - height * 0.42)
  }
  context.fillStyle = MASK_OPAQUE
  context.fill()

  const texture = new three.CanvasTexture(canvas)
  texture.wrapS = three.RepeatWrapping
  texture.wrapT = three.ClampToEdgeWrapping
  texture.colorSpace = three.NoColorSpace
  return texture
}

export const createGrassFringeMaterial = (
  three: ThreeModule,
  assets: TerrainAssets | null,
  c: LotTerrainColors,
  fallbackGrass: ThreeTexture,
  perimeterMeters: number,
) => {
  const alphaMap = createGrassFringeTexture(three)
  if (!alphaMap) return null

  alphaMap.repeat.set(Math.max(perimeterMeters / 1.6, 1), 1)

  const material = new three.MeshStandardMaterial({
    alphaMap,
    transparent: false,
    alphaTest: 0.42,
    side: three.DoubleSide,
    roughness: 0.95,
    metalness: 0,
  })

  if (assets) {
    const maps = withRepeat(assets.grass, Math.max(perimeterMeters / TILE_METERS.grass, 1), 1)
    material.map = maps.map
    material.color = new three.Color().setScalar(c.textureTint * 0.94)
  } else {
    const grass = fallbackGrass.clone()
    grass.needsUpdate = true
    grass.repeat.set(Math.max(perimeterMeters / 2, 1), 1)
    material.map = grass
    material.color = new three.Color(c.terrainTopTint)
  }

  return material
}
