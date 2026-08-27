import { createContactShadow, createSkyEnvironment } from './lotTerrainEnvironment'
import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')
type OrbitControlsModule = typeof import('three/examples/jsm/controls/OrbitControls.js')
type CSS2DRendererModule = typeof import('three/examples/jsm/renderers/CSS2DRenderer.js')

export type TerrainStage = {
  renderer: import('three').WebGLRenderer
  labelRenderer: InstanceType<CSS2DRendererModule['CSS2DRenderer']>
  scene: import('three').Scene
  camera: import('three').PerspectiveCamera
  controls: InstanceType<OrbitControlsModule['OrbitControls']>
  sunLight: import('three').DirectionalLight
  contactShadow: import('three').Mesh | null
  environmentTarget: import('three').WebGLRenderTarget | null
}

export type StageInput = {
  three: ThreeModule
  orbitControls: OrbitControlsModule
  css2d: CSS2DRendererModule
  host: HTMLElement
  colors: LotTerrainColors
}

/**
 * Monta renderer, camera, luzes e o plano de sombra. O `CSS2DRenderer` fica em
 * uma camada irmã do canvas — e sem eventos de ponteiro, para nao roubar o
 * arrasto da orbita.
 */
export const createStage = ({ three, orbitControls, css2d, host, colors: c }: StageInput): TerrainStage => {
  const renderer = new three.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = three.PCFSoftShadowMap
  renderer.outputColorSpace = three.SRGBColorSpace
  // ACES aproxima a resposta de um render fotografico: preserva o detalhe das
  // altas luzes da grama em vez de estourar o verde.
  renderer.toneMapping = three.ACESFilmicToneMapping
  renderer.toneMappingExposure = c.exposure

  const labelRenderer = new css2d.CSS2DRenderer()
  labelRenderer.domElement.className = 'lot-terrain-3d__labels'

  host.replaceChildren(renderer.domElement, labelRenderer.domElement)

  const scene = new three.Scene()
  const environmentTarget = createSkyEnvironment(three, renderer, c)
  if (environmentTarget) {
    scene.environment = environmentTarget.texture
    scene.environmentIntensity = 0.72
  }

  const camera = new three.PerspectiveCamera(32, 1, 0.1, 260)

  const controls = new orbitControls.OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enablePan = false
  controls.minPolarAngle = Math.PI / 4.8
  controls.maxPolarAngle = Math.PI / 2.08
  controls.rotateSpeed = 0.75
  controls.zoomSpeed = 0.8

  const hemisphereLight = new three.HemisphereLight(
    new three.Color(c.skyLight),
    new three.Color(c.groundLight),
    0.55,
  )
  scene.add(hemisphereLight)

  const fillLight = new three.DirectionalLight(new three.Color(c.fillLight), 0.42)
  fillLight.position.set(-10, 7, -6)
  scene.add(fillLight)

  const sunLight = new three.DirectionalLight(new three.Color(c.sunLight), 2.4)
  sunLight.position.set(12, 18, -4)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width = 2048
  sunLight.shadow.mapSize.height = 2048
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = 120
  sunLight.shadow.bias = -0.0002
  sunLight.shadow.normalBias = 0.02
  sunLight.shadow.radius = 1.6
  scene.add(sunLight)
  scene.add(sunLight.target)

  // Raio unitario: a escala real e aplicada quando o terreno e medido.
  const contactShadow = createContactShadow(three, 1, c)
  if (contactShadow) {
    scene.add(contactShadow)
  }

  return { renderer, labelRenderer, scene, camera, controls, sunLight, contactShadow, environmentTarget }
}

/**
 * Ajusta o frustum da sombra ao tamanho real do lote. Sem isso a camera padrao
 * (10x10) corta a sombra de qualquer terreno maior que dez metros.
 */
/**
 * Ajusta o frustum da sombra ao lote e coloca a luz na direcao do sol desenhado
 * no arco. Sem isso a luz apontava para um lado fixo e a sombra contradizia o
 * proprio guia solar exibido na cena.
 */
export const fitSunShadow = (
  stage: TerrainStage,
  center: import('three').Vector3,
  radius: number,
  bottomY: number,
  sunPosition: import('three').Vector3 | null,
) => {
  const shadowCamera = stage.sunLight.shadow.camera
  const extent = radius * 1.5
  shadowCamera.left = -extent
  shadowCamera.right = extent
  shadowCamera.top = extent
  shadowCamera.bottom = -extent
  shadowCamera.far = radius * 10 + 40
  shadowCamera.updateProjectionMatrix()

  if (sunPosition) {
    // Afasta a luz na direcao do sol desenhado, mantendo o mesmo eixo do arco.
    const direction = sunPosition.clone().sub(center)
    const length = direction.length() || 1
    stage.sunLight.position.copy(center).add(direction.multiplyScalar((radius * 2.4) / length))
  } else {
    stage.sunLight.position.set(center.x + radius * 0.9, center.y + radius * 1.5, center.z - radius * 0.5)
  }
  stage.sunLight.target.position.copy(center)
  stage.sunLight.target.updateMatrixWorld()

  if (stage.contactShadow) {
    stage.contactShadow.scale.setScalar(radius * 0.62)
    stage.contactShadow.position.set(center.x, bottomY - 0.05, center.z)
  }
}
