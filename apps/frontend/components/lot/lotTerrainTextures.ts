import { hexToRgba } from './lotTerrainPlan'
import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')

export const buildCanvasTexture = (three: ThreeModule, painter: (context: CanvasRenderingContext2D, size: number) => void) => {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Nao foi possivel preparar a textura do terreno.')
  }

  painter(context, size)

  const texture = new three.CanvasTexture(canvas)
  texture.wrapS = three.RepeatWrapping
  texture.wrapT = three.RepeatWrapping
  texture.colorSpace = three.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

export const createGrassTexture = (three: ThreeModule, c: LotTerrainColors) => buildCanvasTexture(three, (context, size) => {
  const gradient = context.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, c.grassLight)
  gradient.addColorStop(0.45, c.grassMid)
  gradient.addColorStop(1, c.grassDark)
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)

  for (let index = 0; index < 2600; index += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const bladeHeight = 2 + Math.random() * 6
    context.strokeStyle = Math.random() > 0.5 ? c.grassBladeLight : c.grassBladeDark
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + (Math.random() - 0.5) * 3, y - bladeHeight)
    context.stroke()
  }
})

export const createSoilTexture = (three: ThreeModule, c: LotTerrainColors) => buildCanvasTexture(three, (context, size) => {
  const gradient = context.createLinearGradient(0, 0, 0, size)
  gradient.addColorStop(0, c.soilLight)
  gradient.addColorStop(0.45, c.soilMid)
  gradient.addColorStop(1, c.soilDark)
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)

  for (let index = 0; index < 3000; index += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const alpha = 0.04 + Math.random() * 0.1
    const radius = 0.5 + Math.random() * 2.2
    context.fillStyle = Math.random() > 0.5 ? hexToRgba(c.soilLight, alpha) : hexToRgba(c.soilDark, alpha)
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }
})
