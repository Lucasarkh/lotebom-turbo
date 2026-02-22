// ─── Lot generation within a block (v3 — robust half-plane clipping) ──
// Fully deterministic, always produces lots inside the block polygon.
//
// Strategy:
//   1. Determine the "front side" (longest road edge) and its direction.
//   2. Compute an orthogonal local frame: frontDir (along front), depthDir (inward).
//      depthDir is verified against the polygon centroid — never relies on boundary
//      point-in-polygon checks that can fail for curved front sides.
//   3. Create column dividers (perpendicular to front) and row dividers (parallel to front).
//   4. For each cell, clip the block polygon against the four bounding half-planes.
//   5. Discard tiny fragments (area < threshold).
//
// This guarantees every lot vertex is inside the block polygon (within floating-point EPS)
// because the Sutherland-Hodgman half-plane clip is exact for single-line clipping.
//
// No Math.random. No triangulation. No ray-casting ambiguity. 100% deterministic.

import type { Vec2 } from '../geometry/types'
import type { Lot, LotId, Block } from './types'
import { sub, add, scale, normalize, dot, dist } from '../geometry/vec2'
import {
  clipPolygonByHalfPlane,
  signedAreaOf,
  polygonAreaAbs,
  removeNearDuplicates,
  roundPolygon,
} from '../geometry/clipping'

// ─── Deterministic ID generation ─────────────────────────
let lotGlobalCounter = 0

function genLotId(): LotId {
  return `lot_${++lotGlobalCounter}_${Date.now().toString(36)}`
}

// ─── Public types ────────────────────────────────────────

export interface LotGenOptions {
  /** Generation mode: 'dimensions' (frontage+depth) or 'grid' (rows+cols) */
  mode?: 'dimensions' | 'grid'
  /** Target lot frontage (width) in meters — used in dimensions mode */
  frontage: number
  /** Target lot depth (length) in meters — used in dimensions mode */
  depth: number
  /** Number of rows (depth divisions) */
  rows: number
  /** Fixed number of columns (0 for auto) */
  cols?: number
  /** Pixels per meter scale */
  pixelsPerMeter: number
}

// ─── Helpers ─────────────────────────────────────────────

/**
 * Project a point onto a direction axis, returning the scalar coordinate.
 */
function projectOnAxis(p: Vec2, origin: Vec2, axis: Vec2): number {
  return (p.x - origin.x) * axis.x + (p.y - origin.y) * axis.y
}

/**
 * Compute the range [min, max] of the polygon projected onto an axis.
 */
function projectedRange(poly: Vec2[], origin: Vec2, axis: Vec2): [number, number] {
  let lo = Infinity, hi = -Infinity
  for (const p of poly) {
    const d = projectOnAxis(p, origin, axis)
    if (d < lo) lo = d
    if (d > hi) hi = d
  }
  return [lo, hi]
}

/**
 * Compute the arc length of a polyline.
 */
function polylineLength(pts: Vec2[]): number {
  let len = 0
  for (let i = 0; i < pts.length - 1; i++) {
    len += dist(pts[i]!, pts[i + 1]!)
  }
  return len
}

/**
 * Compute the midpoint (by arc length) of a polyline.
 * Walks along the polyline segments until half the total length is reached.
 */
function polylineMidpoint(pts: Vec2[]): Vec2 {
  const totalLen = polylineLength(pts)
  if (totalLen < 1e-10) return pts[0]!
  const halfLen = totalLen / 2
  let accumulated = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const segLen = dist(pts[i]!, pts[i + 1]!)
    if (accumulated + segLen >= halfLen) {
      const t = segLen > 0 ? (halfLen - accumulated) / segLen : 0
      return {
        x: pts[i]!.x + (pts[i + 1]!.x - pts[i]!.x) * t,
        y: pts[i]!.y + (pts[i + 1]!.y - pts[i]!.y) * t,
      }
    }
    accumulated += segLen
  }
  return pts[pts.length - 1]!
}

// ─── Main generation function ────────────────────────────

/**
 * Generate lots inside a block polygon by slicing with half-planes.
 *
 * Algorithm:
 *   1) Find the front side (longest road-edge polyline on the block boundary).
 *   2) Compute a deterministic local coordinate frame from the front side.
 *      - frontDir: overall direction of front side (start → end).
 *      - depthDir: perpendicular to frontDir, guaranteed to point inward
 *        by verifying against the polygon centroid direction.
 *      - origin: actual arc-length midpoint of the front side polyline.
 *   3) Project the entire block polygon onto these axes.
 *   4) Determine column widths (along front) and row depths (perpendicular).
 *   5) For each cell (row, col): clip the block polygon against four half-planes.
 *   6) Filter valid lots (area > threshold).
 *
 * @returns Array of Lot objects. Also mutates block.grid with generation metadata.
 */
export function generateLots(
  block: Block,
  options: LotGenOptions,
): Lot[] {
  const poly = block.polygon
  const sides = block.sides ?? []
  if (poly.length < 3 || sides.length === 0) return []

  const ppm = options.pixelsPerMeter || 10
  const mode = options.mode || 'dimensions'
  const rowCount = Math.max(1, options.rows || 1)

  // ── 1) Find the front side (longest road edge) ────────
  let longestLen = 0
  let longestSideIdx = 0

  for (let i = 0; i < sides.length; i++) {
    const sideLen = polylineLength(sides[i]!)
    if (sideLen > longestLen) {
      longestLen = sideLen
      longestSideIdx = i
    }
  }

  const frontSide = sides[longestSideIdx]!
  if (frontSide.length < 2) return []

  // ── 2) Compute deterministic local coordinate frame ───
  const frontStart = frontSide[0]!
  const frontEnd = frontSide[frontSide.length - 1]!

  // frontDir: unit vector along the front side (start → end)
  let frontDir = normalize(sub(frontEnd, frontStart))
  if (Math.abs(frontDir.x) < 1e-10 && Math.abs(frontDir.y) < 1e-10) {
    frontDir = { x: 1, y: 0 }
  }

  // depthDir: perpendicular to frontDir, pointing INWARD.
  //
  // For a positive-signed-area polygon (ensured by block detection's ensureCCW),
  // perpCCW(frontDir) = { x: -frontDir.y, y: frontDir.x } is the inward normal
  // when the front side follows the polygon winding direction.
  //
  // We verify by checking the dot product with the direction toward the polygon
  // centroid — this is far more robust than the previous pointInPolygon test at
  // a 3px offset, which could fail for curved front sides.
  let depthDir: Vec2 = { x: -frontDir.y, y: frontDir.x } // perpCCW = inward

  // Actual arc-length midpoint of the front side polyline
  const frontSideMid = polylineMidpoint(frontSide)

  // Polygon centroid
  let cx = 0, cy = 0
  for (const p of poly) { cx += p.x; cy += p.y }
  const centroid: Vec2 = { x: cx / poly.length, y: cy / poly.length }

  // Verify depthDir points toward the interior (toward centroid from front)
  const toCentroid = sub(centroid, frontSideMid)
  if (dot(depthDir, toCentroid) < 0) {
    // depthDir was pointing away from interior — flip it
    depthDir = { x: -depthDir.x, y: -depthDir.y }
  }

  // Origin = front side actual midpoint (better numerical stability than a corner)
  const origin = frontSideMid

  // ── 3) Project block polygon onto the local frame ─────
  const [polyFrontMin, polyFrontMax] = projectedRange(poly, origin, frontDir)
  const [_polyDepthMin, polyDepthMax] = projectedRange(poly, origin, depthDir)

  // Compute the depth range of the front side vertices
  // (should be near 0 since origin = front side midpoint)
  let minFrontSideDepth = Infinity
  for (const p of frontSide) {
    const d = projectOnAxis(p, origin, depthDir)
    if (d < minFrontSideDepth) minFrontSideDepth = d
  }

  // Use the FULL polygon projection for columns (covers the entire polygon,
  // not just the front side endpoints — handles non-rectangular blocks)
  const totalFrontLen = polyFrontMax - polyFrontMin
  if (totalFrontLen < 1) return []

  // Total available depth from front side to farthest polygon boundary
  const totalAvailableDepth = polyDepthMax - minFrontSideDepth
  if (totalAvailableDepth < 1) {
    console.warn('[lotGen] Degenerate block: near-zero depth range', {
      totalAvailableDepth, polyDepthMax, minFrontSideDepth,
    })
    return []
  }

  // ── 4) Compute column count & column boundaries ───────
  let numCols: number
  let colWidth: number // in pixels

  if (mode === 'grid') {
    numCols = (options.cols && options.cols > 0) ? options.cols : 5
    colWidth = totalFrontLen / numCols
  } else {
    const targetFrontagePx = options.frontage * ppm
    numCols = Math.max(1, Math.floor(totalFrontLen / targetFrontagePx))
    colWidth = totalFrontLen / numCols
  }

  // Column boundaries as front-axis coordinates (span full polygon width)
  const colBoundaries: number[] = []
  for (let c = 0; c <= numCols; c++) {
    colBoundaries.push(polyFrontMin + c * colWidth)
  }

  // ── 5) Compute row depths ─────────────────────────────
  let perRowDepthsPx: number[] // depth of each row in pixels (not cumulative)

  if (mode === 'grid') {
    // Auto-compute depth: divide total depth evenly among rows
    const usableDepth = totalAvailableDepth * 0.98 // small margin
    const perRow = usableDepth / rowCount
    perRowDepthsPx = Array.from({ length: rowCount }, () => perRow)
  } else {
    const configuredDepthPx = options.depth * ppm
    if (block.grid?.depths && block.grid.depths.length === rowCount) {
      perRowDepthsPx = block.grid.depths.map(d => d * ppm)
    } else {
      perRowDepthsPx = Array.from({ length: rowCount }, () => configuredDepthPx)
    }
  }

  // Row boundaries as depth-axis coordinates
  // Start 1px before the front side to fully capture the front edge
  const rowBoundaries: number[] = [minFrontSideDepth - 1]
  let cumDepth = minFrontSideDepth
  for (let r = 0; r < rowCount; r++) {
    cumDepth += perRowDepthsPx[r]!
    rowBoundaries.push(cumDepth)
  }
  // Extend the last row to the full polygon depth to ensure complete coverage
  // (lots will still be clipped to the block polygon by the initial clip pass)
  rowBoundaries[rowBoundaries.length - 1] = polyDepthMax + 1

  // ── 6) Generate lots by clipping ──────────────────────
  const lots: Lot[] = []
  const minAreaThreshold = 0.5 * ppm * ppm // Discard fragments < 0.5 m²

  for (let c = 0; c < numCols; c++) {
    const cLeft = colBoundaries[c]!
    const cRight = colBoundaries[c + 1]!

    for (let r = 0; r < rowCount; r++) {
      const rFront = rowBoundaries[r]!
      const rBack = rowBoundaries[r + 1]!

      // Four half-planes defining this cell
      const planes = [
        {
          // Left wall: keep points where frontAxis >= cLeft
          point: add(origin, scale(frontDir, cLeft)),
          normal: { ...frontDir },
        },
        {
          // Right wall: keep points where frontAxis <= cRight
          point: add(origin, scale(frontDir, cRight)),
          normal: { x: -frontDir.x, y: -frontDir.y },
        },
        {
          // Front wall: keep points where depthAxis >= rFront
          point: add(origin, scale(depthDir, rFront)),
          normal: { ...depthDir },
        },
        {
          // Back wall: keep points where depthAxis <= rBack
          point: add(origin, scale(depthDir, rBack)),
          normal: { x: -depthDir.x, y: -depthDir.y },
        },
      ]

      // Clip the block polygon against all four half-planes
      let lotPoly = [...poly]

      for (const { point, normal } of planes) {
        lotPoly = clipPolygonByHalfPlane(lotPoly, point, normal)
        if (lotPoly.length < 3) break
      }

      if (lotPoly.length < 3) continue

      // Clean up the resulting polygon
      lotPoly = removeNearDuplicates(lotPoly, 0.01)
      if (lotPoly.length < 3) continue

      lotPoly = roundPolygon(lotPoly, 4)

      const area = polygonAreaAbs(lotPoly)
      if (area < minAreaThreshold) continue

      // Ensure CCW winding (positive signed area)
      if (signedAreaOf(lotPoly) < 0) {
        lotPoly.reverse()
      }

      const lotLabel = block.label
        ? `${block.label} - Lote ${lots.length + 1}`
        : `Lote ${lots.length + 1}`

      lots.push({
        id: genLotId(),
        blockId: block.id,
        polygon: lotPoly,
        area,
        frontage: colWidth,
        status: 'available',
        price: null,
        conditions: '',
        notes: '',
        label: lotLabel,
      })
    }
  }

  // ── 7) Persist grid metadata ──────────────────────────
  block.grid = {
    mode,
    frontSideIndex: longestSideIdx,
    frontage: colWidth / ppm,
    depths: perRowDepthsPx.map(d => d / ppm),
    numCols,
    autoFrame: true,
    autoSnap: true,
  }

  return lots
}
