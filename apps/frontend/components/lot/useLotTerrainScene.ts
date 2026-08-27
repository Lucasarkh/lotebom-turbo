import { ref, type Ref } from 'vue'
import { resolvePlanShape, type PlanPoint, type TerrainSpec } from './lotTerrainPlan'
import { createGrassTexture, createSoilTexture } from './lotTerrainTextures'
import { buildTerrainGroup } from './lotTerrainGroup'
import { isSharedTexture, loadTerrainAssets, type TerrainAssets } from './lotTerrainAssets'
import { createLabelFactory, detachLabels, type LabelFactory } from './lotTerrainLabels'
import { createStage, fitSunShadow, type TerrainStage } from './lotTerrainStage'
import { clampSunT } from './lotTerrainSolar'
import type { BuildingParams } from './lotTerrainConstruction'
import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')
type ThreeTexture = import('three').Texture
type ThreeGroup = import('three').Group

export type LotTerrainSceneOptions = {
  canvasHost: Ref<HTMLElement | null>
  colors: () => LotTerrainColors
  normalizedPolygon: () => PlanPoint[]
  terrainSpec: () => TerrainSpec
  buildingParams: () => BuildingParams
  hasBuildingData: () => boolean
  hasSolarGuide: () => boolean
  solarGuideAngleDeg: () => number | null
  showFrontOverlay: Ref<boolean>
  showMeasureOverlay: Ref<boolean>
  showSolarOverlay: Ref<boolean>
  showBuildingOverlay: Ref<boolean>
  /** Ponto do percurso solar em exibicao (0 = poente, 1 = nascente). */
  sunPathT: Ref<number>
}

type RuntimeState = {
  three: ThreeModule
  stage: TerrainStage
  label: LabelFactory
  assets: TerrainAssets | null
  terrainGroup: ThreeGroup | null
  frameId: number | null
  resizeObserver: ResizeObserver | null
  grassTexture: ThreeTexture
  soilTexture: ThreeTexture
  needsRender: boolean
  hasFramedCamera: boolean
}

export const useLotTerrainScene = (options: LotTerrainSceneOptions) => {
  const isSceneReady = ref(false)
  const sceneError = ref('')

  let runtime: RuntimeState | null = null

  const invalidate = () => {
    if (runtime) runtime.needsRender = true
  }

  const disposeMaterial = (material: unknown) => {
    const disposable = material as {
      dispose?: () => void
      map?: ThreeTexture
      normalMap?: ThreeTexture
      roughnessMap?: ThreeTexture
      alphaMap?: ThreeTexture
    } | undefined
    if (!disposable) return

    // As texturas do pacote PBR sao compartilhadas entre instancias do viewer:
    // so os clones e os canvas procedurais desta cena podem ser descartados.
    for (const texture of [disposable.map, disposable.normalMap, disposable.roughnessMap, disposable.alphaMap]) {
      if (texture && !isSharedTexture(texture)) texture.dispose()
    }
    disposable.dispose?.()
  }

  const disposeGroup = (group: ThreeGroup | null) => {
    if (!group) return
    detachLabels(group)

    group.traverse((node) => {
      const mesh = node as {
        geometry?: { dispose?: () => void }
        material?: unknown
        isInstancedMesh?: boolean
        dispose?: () => void
        parent?: { type?: string } | null
      }

      // `InstancedMesh` so libera instanceMatrix/instanceColor pelo proprio dispose.
      if (mesh.isInstancedMesh) mesh.dispose?.()

      // A linha e o cone de `ArrowHelper` apontam para geometrias singleton do
      // three, compartilhadas por toda a aplicacao: descartar aqui apagaria os
      // buffers de qualquer outra seta viva.
      if (mesh.parent?.type !== 'ArrowHelper') {
        mesh.geometry?.dispose?.()
      }
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(disposeMaterial)
        return
      }
      disposeMaterial(mesh.material)
    })
  }

  const resizeRenderer = () => {
    if (!runtime || !options.canvasHost.value) return
    const width = Math.max(options.canvasHost.value.clientWidth, 1)
    const height = Math.max(options.canvasHost.value.clientHeight, 1)
    runtime.stage.renderer.setSize(width, height, false)
    runtime.stage.labelRenderer.setSize(width, height)
    runtime.stage.camera.aspect = width / height
    runtime.stage.camera.updateProjectionMatrix()
    invalidate()
  }

  const measureTerrain = () => {
    if (!runtime?.terrainGroup) return null
    const { three, terrainGroup } = runtime
    const localCenter = terrainGroup.userData.terrainCenter as import('three').Vector3 | undefined
    const storedRadius = Number(terrainGroup.userData.terrainRadius)
    const center = localCenter
      ? localCenter.clone().add(terrainGroup.position)
      : new three.Box3().setFromObject(terrainGroup).getCenter(new three.Vector3())
    const radius = Number.isFinite(storedRadius) && storedRadius > 0
      ? storedRadius
      : Math.max(new three.Box3().setFromObject(terrainGroup).getBoundingSphere(new three.Sphere()).radius, 3)

    const localSun = terrainGroup.userData.sunPosition as import('three').Vector3 | undefined
    const bottomY = Number(terrainGroup.userData.terrainBottom)
    return {
      center,
      radius,
      bottomY: Number.isFinite(bottomY) ? bottomY + terrainGroup.position.y : center.y - radius * 0.5,
      sunPosition: localSun ? localSun.clone().add(terrainGroup.position) : null,
    }
  }

  const fitTerrainShadow = () => {
    const measurement = measureTerrain()
    if (!runtime || !measurement) return
    fitSunShadow(runtime.stage, measurement.center, measurement.radius, measurement.bottomY, measurement.sunPosition)
  }

  const positionCamera = () => {
    const measurement = measureTerrain()
    if (!runtime || !measurement) return
    const { three, stage } = runtime
    const { center, radius } = measurement

    stage.camera.position.set(radius * 1.34, radius * 1.08, -radius * 1.58)
    stage.controls.target.copy(center).add(new three.Vector3(0, radius * 0.1, 0))
    stage.controls.minDistance = radius * 1.05
    stage.controls.maxDistance = radius * 4.4
    stage.controls.update()

    fitSunShadow(stage, center, radius, measurement.bottomY, measurement.sunPosition)
    invalidate()
  }

  const mountTerrain = () => {
    if (!runtime) return

    if (runtime.terrainGroup) {
      runtime.stage.scene.remove(runtime.terrainGroup)
      disposeGroup(runtime.terrainGroup)
      runtime.terrainGroup = null
    }

    const nextGroup = buildTerrainGroup({
      three: runtime.three,
      assets: runtime.assets,
      fallbackGrass: runtime.grassTexture,
      fallbackSoil: runtime.soilTexture,
      label: runtime.label,
      planShape: resolvePlanShape(options.normalizedPolygon(), options.terrainSpec()),
      spec: options.terrainSpec(),
      colors: options.colors(),
      buildingParams: options.buildingParams(),
      showFront: options.showFrontOverlay.value,
      showMeasure: options.showMeasureOverlay.value,
      showSolar: options.showSolarOverlay.value,
      showBuilding: options.showBuildingOverlay.value,
      hasSolarGuide: options.hasSolarGuide(),
      solarGuideAngleDeg: options.solarGuideAngleDeg(),
      hasBuildingData: options.hasBuildingData(),
      sunT: options.sunPathT.value,
    })
    if (!nextGroup) {
      sceneError.value = 'Não há medidas suficientes para montar a visualização 3D deste lote.'
      return
    }

    sceneError.value = ''
    runtime.terrainGroup = nextGroup
    runtime.stage.scene.add(nextGroup)

    // Alternar uma camada remonta o terreno, mas nao pode roubar a orbita que o
    // visitante ajustou: so o primeiro quadro e o botao Centralizar enquadram.
    if (!runtime.hasFramedCamera) {
      runtime.hasFramedCamera = true
      positionCamera()
      return
    }
    fitTerrainShadow()
    invalidate()
  }

  /**
   * Move o sol pelo arco sem reconstruir a cena: so o disco, a luz e a sombra
   * mudam, entao o controle de horario responde a cada quadro.
   */
  const updateSunPosition = () => {
    if (!runtime?.terrainGroup) return
    const curve = runtime.terrainGroup.userData.sunCurve as import('three').QuadraticBezierCurve3 | undefined
    const disc = runtime.terrainGroup.userData.sunDisc as import('three').Mesh | undefined
    if (!curve || !disc) return

    const point = curve.getPoint(clampSunT(options.sunPathT.value))
    disc.position.copy(point)
    runtime.terrainGroup.userData.sunPosition = point
    fitTerrainShadow()
    invalidate()
  }

  /** Liga e desliga overlays sem refazer a cena. */
  const applyOverlayVisibility = () => {
    if (!runtime?.terrainGroup) return
    const layers = runtime.terrainGroup.userData.layers as Record<string, { visible: boolean } | undefined> | undefined
    if (!layers) return

    if (layers.dimensions) layers.dimensions.visible = options.showMeasureOverlay.value
    if (layers.front) layers.front.visible = options.showFrontOverlay.value
    if (layers.solar) layers.solar.visible = options.showSolarOverlay.value
    invalidate()
  }

  const remountTerrain = () => {
    if (!runtime) return
    mountTerrain()
    resizeRenderer()
  }

  const resetView = () => {
    positionCamera()
  }

  const renderLoop = () => {
    if (!runtime) return
    const { stage } = runtime
    // `controls.update()` responde `true` enquanto a inercia do arrasto continua:
    // fora disso a cena so redesenha quando algo realmente muda.
    const moving = stage.controls.update()
    if (moving || runtime.needsRender) {
      stage.renderer.render(stage.scene, stage.camera)
      stage.labelRenderer.render(stage.scene, stage.camera)
      runtime.needsRender = false
    }
    runtime.frameId = window.requestAnimationFrame(renderLoop)
  }

  /** Suspende o laco de render quando o simulador sai da area visivel da pagina. */
  const setActive = (active: boolean) => {
    if (!runtime) return
    if (active && runtime.frameId === null) {
      invalidate()
      runtime.frameId = window.requestAnimationFrame(renderLoop)
      return
    }
    if (!active && runtime.frameId !== null) {
      window.cancelAnimationFrame(runtime.frameId)
      runtime.frameId = null
    }
  }

  const initScene = async () => {
    if (!import.meta.client || !options.canvasHost.value || runtime) return

    try {
      const [three, orbitControls, css2d] = await Promise.all([
        import('three'),
        import('three/examples/jsm/controls/OrbitControls.js'),
        import('three/examples/jsm/renderers/CSS2DRenderer.js'),
      ])

      const colors = options.colors()
      const stage = createStage({
        three,
        orbitControls,
        css2d,
        host: options.canvasHost.value,
        colors,
      })

      runtime = {
        three,
        stage,
        label: createLabelFactory(css2d.CSS2DObject),
        assets: null,
        terrainGroup: null,
        frameId: null,
        resizeObserver: null,
        grassTexture: createGrassTexture(three, colors),
        soilTexture: createSoilTexture(three, colors),
        needsRender: true,
        hasFramedCamera: false,
      }

      stage.controls.addEventListener('change', invalidate)

      // Primeiro quadro com o material procedural, para o lote aparecer sem
      // esperar rede; o pacote PBR entra assim que chega.
      mountTerrain()
      resizeRenderer()

      runtime.resizeObserver = new ResizeObserver(resizeRenderer)
      runtime.resizeObserver.observe(options.canvasHost.value)

      isSceneReady.value = true
      setActive(true)

      const assets = await loadTerrainAssets(three)
      if (runtime && assets) {
        runtime.assets = assets
        remountTerrain()
      }
    } catch (error) {
      console.error('Lot terrain 3D viewer init failed', error)
      sceneError.value = 'Não foi possível carregar a visualização 3D deste lote.'
    }
  }

  const destroyScene = () => {
    if (!runtime) return
    const { stage } = runtime

    setActive(false)
    runtime.resizeObserver?.disconnect()
    stage.controls.removeEventListener('change', invalidate)
    stage.controls.dispose()

    if (runtime.terrainGroup) {
      stage.scene.remove(runtime.terrainGroup)
      disposeGroup(runtime.terrainGroup)
    }

    stage.contactShadow?.geometry.dispose()
    disposeMaterial(stage.contactShadow?.material)
    stage.environmentTarget?.dispose()
    runtime.grassTexture.dispose()
    runtime.soilTexture.dispose()
    stage.labelRenderer.domElement.remove()
    stage.renderer.dispose()
    // `dispose()` sozinho nao devolve o contexto: sem isso, navegar entre lotes
    // encosta no teto de contextos WebGL do navegador.
    stage.renderer.forceContextLoss()
    runtime = null
    isSceneReady.value = false
  }

  return {
    isSceneReady,
    sceneError,
    initScene,
    destroyScene,
    setActive,
    resetView,
    updateSunPosition,
    applyOverlayVisibility,
    remountTerrain,
  }
}
