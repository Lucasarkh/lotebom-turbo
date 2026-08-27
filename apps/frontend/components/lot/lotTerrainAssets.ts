type ThreeModule = typeof import('three')
type ThreeTexture = import('three').Texture

export type TerrainMaterialMaps = {
  map: ThreeTexture
  normalMap: ThreeTexture | null
  roughnessMap: ThreeTexture | null
}

export type TerrainAssets = {
  grass: TerrainMaterialMaps
  soil: TerrainMaterialMaps
  roof: TerrainMaterialMaps
  wall: TerrainMaterialMaps
}

const TEXTURE_BASE = '/textures/lot/'

const MATERIAL_FILES = {
  grass: { map: 'grass-color.webp', normalMap: 'grass-normal.webp', roughnessMap: 'grass-rough.webp' },
  soil: { map: 'soil-color.webp', normalMap: 'soil-normal.webp', roughnessMap: 'soil-rough.webp' },
  roof: { map: 'roof-color.webp', normalMap: 'roof-normal.webp', roughnessMap: null },
  wall: { map: 'wall-color.webp', normalMap: 'wall-normal.webp', roughnessMap: null },
} as const

// As texturas sao imutaveis e compartilhadas por todas as instancias do viewer:
// carregar uma vez por sessao evita refazer o upload para a GPU a cada lote aberto.
const sharedTextures = new WeakSet<ThreeTexture>()
let assetsPromise: Promise<TerrainAssets | null> | null = null

export const isSharedTexture = (texture: unknown) => sharedTextures.has(texture as ThreeTexture)

const loadTexture = async (
  three: ThreeModule,
  loader: import('three').TextureLoader,
  file: string,
  isColor: boolean,
) => {
  const texture = await loader.loadAsync(`${TEXTURE_BASE}${file}`)
  texture.wrapS = three.RepeatWrapping
  texture.wrapT = three.RepeatWrapping
  texture.colorSpace = isColor ? three.SRGBColorSpace : three.NoColorSpace
  texture.anisotropy = 8
  sharedTextures.add(texture)
  return texture
}

const loadMaterialMaps = async (
  three: ThreeModule,
  loader: import('three').TextureLoader,
  files: { map: string; normalMap: string | null; roughnessMap: string | null },
): Promise<TerrainMaterialMaps> => {
  const [map, normalMap, roughnessMap] = await Promise.all([
    loadTexture(three, loader, files.map, true),
    files.normalMap ? loadTexture(three, loader, files.normalMap, false) : Promise.resolve(null),
    files.roughnessMap ? loadTexture(three, loader, files.roughnessMap, false) : Promise.resolve(null),
  ])
  return { map, normalMap, roughnessMap }
}

/**
 * Carrega o conjunto PBR do terreno. Devolve `null` quando qualquer arquivo falha,
 * para que a cena caia no material procedural em vez de renderizar sem textura.
 */
export const loadTerrainAssets = (three: ThreeModule): Promise<TerrainAssets | null> => {
  if (assetsPromise) return assetsPromise

  const loader = new three.TextureLoader()
  assetsPromise = Promise.all([
    loadMaterialMaps(three, loader, MATERIAL_FILES.grass),
    loadMaterialMaps(three, loader, MATERIAL_FILES.soil),
    loadMaterialMaps(three, loader, MATERIAL_FILES.roof),
    loadMaterialMaps(three, loader, MATERIAL_FILES.wall),
  ])
    .then(([grass, soil, roof, wall]) => ({ grass, soil, roof, wall }))
    .catch((error) => {
      console.warn('[LotTerrain3D] Falha ao carregar as texturas do terreno, usando fallback procedural.', error)
      assetsPromise = null
      return null
    })

  return assetsPromise
}

const repeatCache = new Map<string, ThreeTexture>()

/**
 * Clona os mapas com uma repeticao propria. Os clones sao cacheados e tratados
 * como compartilhados: `Texture.copy()` marca a `Source` como suja, e um clone
 * novo a cada remontagem faria o navegador reenviar o pacote inteiro para a GPU.
 */
export const withRepeat = (maps: TerrainMaterialMaps, repeatX: number, repeatY: number): TerrainMaterialMaps => {
  const apply = (texture: ThreeTexture | null) => {
    if (!texture) return null

    const key = `${texture.uuid}:${repeatX.toFixed(4)}:${repeatY.toFixed(4)}`
    const cached = repeatCache.get(key)
    if (cached) return cached

    const version = texture.source.version
    const clone = texture.clone()
    clone.repeat.set(repeatX, repeatY)
    // `copy()` incrementa a versao da Source compartilhada; devolver o valor
    // evita marcar como suja uma imagem que nao mudou.
    texture.source.version = version
    sharedTextures.add(clone)
    repeatCache.set(key, clone)
    return clone
  }

  return {
    map: apply(maps.map) as ThreeTexture,
    normalMap: apply(maps.normalMap),
    roughnessMap: apply(maps.roughnessMap),
  }
}
