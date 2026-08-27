import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')

const NORMAL_NEUTRAL = 'rgb(128, 128, 255)'

/**
 * Normal map de ondulacao gerada por soma de senos cruzados. Uma foto de agua
 * nao serve aqui: o que faz a lamina parecer agua e a normal quebrando o reflexo
 * do environment, e isso cabe em um canvas de 256px sem nenhum download.
 */
export const createWaterNormalTexture = (three: ThreeModule) => {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return null

  context.fillStyle = NORMAL_NEUTRAL
  context.fillRect(0, 0, size, size)

  const image = context.getImageData(0, 0, size, size)
  const height = (x: number, y: number) => {
    const u = (x / size) * Math.PI * 2
    const v = (y / size) * Math.PI * 2
    return (
      Math.sin(u * 3 + Math.cos(v * 2) * 0.6) * 0.5
      + Math.sin(v * 4 - u * 1.5) * 0.32
      + Math.sin((u + v) * 6) * 0.18
    )
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Gradiente central: a inclinacao da superficie em cada ponto vira normal.
      const dx = height((x + 1) % size, y) - height((x - 1 + size) % size, y)
      const dy = height(x, (y + 1) % size) - height(x, (y - 1 + size) % size)
      const index = (y * size + x) * 4
      image.data[index] = Math.round(128 - dx * 90)
      image.data[index + 1] = Math.round(128 - dy * 90)
      image.data[index + 2] = 255
      image.data[index + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)

  const texture = new three.CanvasTexture(canvas)
  texture.wrapS = three.RepeatWrapping
  texture.wrapT = three.RepeatWrapping
  texture.colorSpace = three.NoColorSpace
  return texture
}

/** Azulejo do casco: a malha de rejunte é o que identifica uma piscina. */
export const createPoolShellTexture = (three: ThreeModule, c: LotTerrainColors) => {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return null

  context.fillStyle = c.poolShell
  context.fillRect(0, 0, size, size)
  context.strokeStyle = c.poolGrout
  context.lineWidth = 2

  for (let step = 0; step <= 4; step += 1) {
    const position = (size / 4) * step
    context.beginPath()
    context.moveTo(position, 0)
    context.lineTo(position, size)
    context.moveTo(0, position)
    context.lineTo(size, position)
    context.stroke()
  }

  const texture = new three.CanvasTexture(canvas)
  texture.wrapS = three.RepeatWrapping
  texture.wrapT = three.RepeatWrapping
  texture.colorSpace = three.SRGBColorSpace
  return texture
}

export type PoolMaterials = {
  water: import('three').MeshStandardMaterial
  shell: import('three').MeshStandardMaterial
}

export const createPoolMaterials = (three: ThreeModule, c: LotTerrainColors, poolWidth: number, poolDepth: number): PoolMaterials => {
  const normalMap = createWaterNormalTexture(three)
  if (normalMap) {
    normalMap.repeat.set(Math.max(poolWidth / 1.6, 1), Math.max(poolDepth / 1.6, 1))
  }

  const water = new three.MeshStandardMaterial({
    color: new three.Color(c.pool),
    roughness: 0.07,
    metalness: 0.05,
    transparent: true,
    opacity: 0.86,
    normalMap,
    normalScale: new three.Vector2(0.55, 0.55),
    envMapIntensity: 1.6,
  })

  const shellTexture = createPoolShellTexture(three, c)
  if (shellTexture) {
    shellTexture.repeat.set(Math.max(poolWidth / 1.2, 1), Math.max(poolDepth / 1.2, 1))
  }

  // BackSide: o bloco do casco e renderizado pelo avesso, virando a cavidade da
  // piscina em uma unica malha — sem tampa por cima da lamina.
  const shell = new three.MeshStandardMaterial({
    color: new three.Color(c.poolShell),
    map: shellTexture,
    roughness: 0.32,
    metalness: 0,
    side: three.BackSide,
  })

  return { water, shell }
}
