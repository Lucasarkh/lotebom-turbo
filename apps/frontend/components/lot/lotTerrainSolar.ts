import type { PlanPoint } from './lotTerrainPlan'
import type { LabelFactory } from './lotTerrainLabels'
import type { LotTerrainColors } from './lotTerrainPalette'

type ThreeModule = typeof import('three')

/**
 * Extremos do arco ficam rentes ao chao e nao rendem sombra util. O mesmo valor
 * posiciona o disco desenhado e a luz da cena — e por isso a sombra sempre cai
 * do lado oposto ao sol que o visitante esta vendo.
 */
export const clampSunT = (value: number) => Math.min(0.94, Math.max(0.06, value))

export type SolarGuideInput = {
  three: ThreeModule
  planShape: PlanPoint[]
  center: import('three').Vector3
  colors: LotTerrainColors
  angleDeg: number
  buildingTopY: number
  label: LabelFactory
  /** Fracao do percurso onde o sol esta agora (0 = poente, 1 = nascente). */
  sunT: number
}

/**
 * Arco do percurso solar sobre o lote, do nascente ao poente, com o pico acima
 * da cobertura para nao cruzar o telhado.
 */
export const createSolarGuide = ({
  three,
  planShape,
  center,
  colors: c,
  angleDeg,
  buildingTopY,
  label,
  sunT,
}: SolarGuideInput) => {
  const group = new three.Group()
  const angleRad = (angleDeg * Math.PI) / 180
  const direction = new three.Vector3(Math.cos(angleRad), 0, Math.sin(angleRad)).normalize()

  const base = center.clone()
  base.y = 0
  const projections = planShape.map((point) => (point.x - base.x) * direction.x + (point.z - base.z) * direction.z)
  const lotSpan = Math.max(...projections) - Math.min(...projections)
  const halfExtent = lotSpan * 0.5 * 1.55

  const arcBaseHeight = buildingTopY > 0 ? buildingTopY + 1.5 : 1.4
  const arcPeakHeight = Math.max(buildingTopY > 0 ? buildingTopY + 5 : 5, lotSpan * 0.4)

  const start = base.clone().add(direction.clone().multiplyScalar(-halfExtent))
  const end = base.clone().add(direction.clone().multiplyScalar(halfExtent))
  start.y = arcBaseHeight
  end.y = arcBaseHeight

  const peak = base.clone()
  peak.y = arcPeakHeight

  const curve = new three.QuadraticBezierCurve3(start, peak, end)
  const line = new three.Line(
    new three.BufferGeometry().setFromPoints(curve.getPoints(64)),
    new three.LineDashedMaterial({
      color: new three.Color(c.solar),
      dashSize: 0.55,
      gapSize: 0.32,
      transparent: true,
      opacity: 0.85,
    }),
  )
  line.computeLineDistances()
  group.add(line)

  const arrowScale = Math.max(0.22, lotSpan * 0.016)
  const coneGeometry = new three.ConeGeometry(arrowScale * 0.45, arrowScale * 1.1, 8)
  const coneMaterial = new three.MeshBasicMaterial({
    color: new three.Color(c.solar),
    transparent: true,
    opacity: 0.8,
  })
  for (const t of [0.32, 0.68]) {
    const point = curve.getPoint(t)
    const tangent = curve.getTangent(t).normalize().negate()
    const cone = new three.Mesh(coneGeometry, coneMaterial)
    cone.position.copy(point)
    cone.quaternion.setFromUnitVectors(new three.Vector3(0, 1, 0), tangent)
    group.add(cone)
  }

  const sunPosition = curve.getPoint(clampSunT(sunT))
  const sunDisc = new three.Mesh(
    new three.SphereGeometry(arrowScale * 1.1, 18, 14),
    new three.MeshBasicMaterial({ color: new three.Color(c.solar) }),
  )
  sunDisc.position.copy(sunPosition)
  group.add(sunDisc)

  const sunrise = label('Nasce', 'sun', 'sunrise')
  sunrise.position.copy(end.clone().add(new three.Vector3(0, 1.5, 0)))
  group.add(sunrise)

  const sunset = label('Põe', 'sun', 'sunset')
  sunset.position.copy(start.clone().add(new three.Vector3(0, 1.5, 0)))
  group.add(sunset)

  return { group, sunPosition, curve, sunDisc }
}
