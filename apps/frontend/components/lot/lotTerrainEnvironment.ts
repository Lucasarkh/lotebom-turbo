import { hexToRgba } from './lotTerrainPlan'
import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')

/**
 * Ceu equirretangular procedural. Serve de `scene.environment`: sem ele os
 * materiais PBR ficam sem reflexo difuso e o modelo parece plastico. Custa um
 * canvas de 512px e uma passagem de PMREM na inicializacao — nenhum download.
 */
export const createSkyEnvironment = (
  three: ThreeModule,
  renderer: import('three').WebGLRenderer,
  c: LotTerrainColors,
) => {
  const width = 512
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null

  const sky = context.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, c.envSky)
  sky.addColorStop(0.48, c.envHorizon)
  sky.addColorStop(0.52, hexToRgba(c.envGround, 0.96))
  sky.addColorStop(1, c.envGround)
  context.fillStyle = sky
  context.fillRect(0, 0, width, height)

  // Mancha de sol: da direcionalidade ao reflexo especular das telhas e vidros.
  const sunX = width * 0.32
  const sunY = height * 0.24
  const sun = context.createRadialGradient(sunX, sunY, 0, sunX, sunY, height * 0.42)
  sun.addColorStop(0, hexToRgba(c.sunLight, 0.95))
  sun.addColorStop(0.35, hexToRgba(c.sunLight, 0.28))
  sun.addColorStop(1, hexToRgba(c.sunLight, 0))
  context.fillStyle = sun
  context.fillRect(0, 0, width, height * 0.55)

  const source = new three.CanvasTexture(canvas)
  source.mapping = three.EquirectangularReflectionMapping
  source.colorSpace = three.SRGBColorSpace

  const pmrem = new three.PMREMGenerator(renderer)
  // O alvo de render precisa ser guardado: `texture.dispose()` de uma textura de
  // render target e no-op no three, e o cubemap ficaria preso na VRAM.
  const target = pmrem.fromEquirectangular(source)
  pmrem.dispose()
  source.dispose()

  return target
}

/**
 * Sombra de contato sob a ilha de terreno — um disco com queda radial que
 * ancora o modelo no fundo transparente sem exigir um plano receptor opaco.
 */
export const createContactShadow = (three: ThreeModule, radius: number, c: LotTerrainColors) => {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return null

  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, hexToRgba(c.contactShadow, 0.42))
  gradient.addColorStop(0.45, hexToRgba(c.contactShadow, 0.24))
  gradient.addColorStop(0.78, hexToRgba(c.contactShadow, 0.06))
  gradient.addColorStop(1, hexToRgba(c.contactShadow, 0))
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)

  const texture = new three.CanvasTexture(canvas)
  texture.colorSpace = three.SRGBColorSpace

  const mesh = new three.Mesh(
    new three.PlaneGeometry(radius * 3.1, radius * 3.1),
    new three.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.renderOrder = -1
  return mesh
}
