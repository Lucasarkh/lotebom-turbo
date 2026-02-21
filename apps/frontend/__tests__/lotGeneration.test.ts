/// <reference types="vitest" />
// ─── Lot generation geometry tests ───────────────────────
// Tests for determinism, containment, validity, and correctness.

import { describe, it, expect } from 'vitest'
import type { Vec2 } from '../composables/lotEditor/geometry/types'
import type { Block } from '../composables/lotEditor/topology/types'
import { generateLots, type LotGenOptions } from '../composables/lotEditor/topology/lotGeneration'
import {
  clipPolygonByHalfPlane,
  normalizePolygon,
  signedAreaOf,
  polygonAreaAbs,
  isSimplePolygon,
  removeNearDuplicates,
  allVerticesInside,
  roundPolygon,
} from '../composables/lotEditor/geometry/clipping'
import { pointInPolygon } from '../composables/lotEditor/geometry/polygon'

// ─── Test Utilities ──────────────────────────────────────

/**
 * Hash the geometry of generated lots for determinism checking.
 * Produces a stable string hash from rounded vertex coordinates.
 */
function hashGeometry(lots: { polygon: Vec2[] }[]): string {
  const data = lots.map(lot =>
    lot.polygon.map(p => `${Math.round(p.x * 1000) / 1000},${Math.round(p.y * 1000) / 1000}`).join(';')
  ).join('|')
  // Simple string hash
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const chr = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return hash.toString(36) + '_' + data.length
}

/**
 * Create a mock block from a polygon and sides.
 */
function makeBlock(polygon: Vec2[], sides?: Vec2[][]): Block {
  // If no sides provided, create from polygon edges
  if (!sides) {
    sides = []
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length
      sides.push([polygon[i]!, polygon[j]!])
    }
  }
  return {
    id: 'test_block_1',
    edgeCycle: sides.map((_, i) => `edge_${i}`),
    polygon,
    sides,
    status: 'detected',
    lots: [],
  }
}

const DEFAULT_OPTIONS: LotGenOptions = {
  mode: 'grid',
  frontage: 10,
  depth: 25,
  rows: 1,
  cols: 5,
  pixelsPerMeter: 10,
}

// ─── Test Polygons ───────────────────────────────────────

// Convex rectangle (100x80 pixels = 10m x 8m)
const RECT_POLY: Vec2[] = [
  { x: 100, y: 100 },
  { x: 200, y: 100 },
  { x: 200, y: 180 },
  { x: 100, y: 180 },
]

// Right triangle
const TRIANGLE_POLY: Vec2[] = [
  { x: 100, y: 100 },
  { x: 300, y: 100 },
  { x: 100, y: 300 },
]

// L-shaped concave polygon
const L_SHAPE_POLY: Vec2[] = [
  { x: 100, y: 100 },
  { x: 250, y: 100 },
  { x: 250, y: 180 },
  { x: 170, y: 180 },
  { x: 170, y: 260 },
  { x: 100, y: 260 },
]

// Irregular pentagon (convex)
const PENTAGON_POLY: Vec2[] = [
  { x: 200, y: 100 },
  { x: 300, y: 160 },
  { x: 270, y: 280 },
  { x: 130, y: 280 },
  { x: 100, y: 160 },
]

// Near-collinear polygon (flattened hexagon)
const FLAT_HEX_POLY: Vec2[] = [
  { x: 100, y: 200 },
  { x: 150, y: 200.1 }, // nearly collinear
  { x: 300, y: 200 },
  { x: 300, y: 300 },
  { x: 150, y: 299.9 }, // nearly collinear
  { x: 100, y: 300 },
]

// ─── Polygon Clipping Tests ─────────────────────────────

describe('clipPolygonByHalfPlane', () => {
  it('clips a rectangle by a vertical line', () => {
    const poly: Vec2[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 },
      { x: 10, y: 10 }, { x: 0, y: 10 },
    ]
    // Keep x >= 5 (linePoint={5,0}, normal={1,0})
    const result = clipPolygonByHalfPlane(poly, { x: 5, y: 0 }, { x: 1, y: 0 })
    expect(result.length).toBeGreaterThanOrEqual(4)
    const area = polygonAreaAbs(result)
    expect(area).toBeCloseTo(50, 1) // half of 100
    // All points should have x >= 5 - epsilon
    for (const p of result) {
      expect(p.x).toBeGreaterThanOrEqual(4.99)
    }
  })

  it('clips a rectangle by a horizontal line', () => {
    const poly: Vec2[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 },
      { x: 10, y: 10 }, { x: 0, y: 10 },
    ]
    // Keep y <= 7 (linePoint={0,7}, normal={0,-1})
    const result = clipPolygonByHalfPlane(poly, { x: 0, y: 7 }, { x: 0, y: -1 })
    const area = polygonAreaAbs(result)
    expect(area).toBeCloseTo(70, 1)
  })

  it('returns empty array when polygon is entirely outside', () => {
    const poly: Vec2[] = [
      { x: 0, y: 0 }, { x: 5, y: 0 },
      { x: 5, y: 5 }, { x: 0, y: 5 },
    ]
    // Keep x >= 10 — poly is entirely below
    const result = clipPolygonByHalfPlane(poly, { x: 10, y: 0 }, { x: 1, y: 0 })
    expect(result.length).toBeLessThan(3)
  })

  it('returns same polygon when entirely inside', () => {
    const poly: Vec2[] = [
      { x: 5, y: 5 }, { x: 15, y: 5 },
      { x: 15, y: 15 }, { x: 5, y: 15 },
    ]
    // Keep x >= 0
    const result = clipPolygonByHalfPlane(poly, { x: 0, y: 0 }, { x: 1, y: 0 })
    expect(result.length).toBe(4)
    const area = polygonAreaAbs(result)
    expect(area).toBeCloseTo(100, 1)
  })

  it('clips a concave L-shape correctly', () => {
    const result = clipPolygonByHalfPlane(
      L_SHAPE_POLY,
      { x: 160, y: 0 },
      { x: -1, y: 0 }, // keep x <= 160
    )
    expect(result.length).toBeGreaterThanOrEqual(3)
    // All points should have x <= 160.001
    for (const p of result) {
      expect(p.x).toBeLessThanOrEqual(160.01)
    }
  })
})

// ─── Polygon Normalization Tests ─────────────────────────

describe('normalizePolygon', () => {
  it('removes near-duplicate vertices', () => {
    const poly: Vec2[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10.00001, y: 0.00001 },
      { x: 10, y: 10 }, { x: 0, y: 10 },
    ]
    const result = removeNearDuplicates(poly, 0.01)
    expect(result.length).toBe(4) // one duplicate removed
  })

  it('ensures CCW winding', () => {
    // CW polygon
    const cwPoly: Vec2[] = [
      { x: 0, y: 0 }, { x: 0, y: 10 },
      { x: 10, y: 10 }, { x: 10, y: 0 },
    ]
    const result = normalizePolygon(cwPoly)
    expect(result).not.toBeNull()
    expect(signedAreaOf(result!)).toBeGreaterThan(0) // CCW
  })

  it('returns null for degenerate polygon', () => {
    const degenerate: Vec2[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }]
    expect(normalizePolygon(degenerate)).toBeNull()
  })
})

describe('isSimplePolygon', () => {
  it('returns true for convex rectangle', () => {
    expect(isSimplePolygon(RECT_POLY)).toBe(true)
  })

  it('returns true for concave L-shape', () => {
    expect(isSimplePolygon(L_SHAPE_POLY)).toBe(true)
  })

  it('returns false for self-intersecting polygon', () => {
    const bowtie: Vec2[] = [
      { x: 0, y: 0 }, { x: 10, y: 10 },
      { x: 10, y: 0 }, { x: 0, y: 10 },
    ]
    expect(isSimplePolygon(bowtie)).toBe(false)
  })
})

// ─── Lot Generation Tests ────────────────────────────────

describe('generateLots', () => {
  // --- Convex rectangle ---
  describe('convex rectangle', () => {
    const block = makeBlock(RECT_POLY)

    it('generates lots inside the block', () => {
      const lots = generateLots(block, { ...DEFAULT_OPTIONS, cols: 5, rows: 1 })
      expect(lots.length).toBeGreaterThan(0)

      for (const lot of lots) {
        // All vertices must be inside the block (with tolerance)
        expect(allVerticesInside(lot.polygon, RECT_POLY, 1.0)).toBe(true)
      }
    })

    it('generates lots with positive area', () => {
      const lots = generateLots(block, { ...DEFAULT_OPTIONS, cols: 5, rows: 1 })
      for (const lot of lots) {
        expect(lot.area).toBeGreaterThan(0)
      }
    })

    it('generates non-self-intersecting lots', () => {
      const lots = generateLots(block, { ...DEFAULT_OPTIONS, cols: 5, rows: 1 })
      for (const lot of lots) {
        if (lot.polygon.length >= 4) {
          expect(isSimplePolygon(lot.polygon)).toBe(true)
        }
      }
    })

    it('generates lots in dimensions mode', () => {
      const lots = generateLots(block, {
        mode: 'dimensions',
        frontage: 2, // 2m = 20px
        depth: 4,    // 4m = 40px
        rows: 1,
        pixelsPerMeter: 10,
      })
      expect(lots.length).toBeGreaterThan(0)
      for (const lot of lots) {
        expect(allVerticesInside(lot.polygon, RECT_POLY, 1.0)).toBe(true)
      }
    })

    it('generates multiple rows (back-to-back)', () => {
      const lots = generateLots(block, { ...DEFAULT_OPTIONS, cols: 5, rows: 2 })
      expect(lots.length).toBeGreaterThan(5) // at least some lots in second row
      for (const lot of lots) {
        expect(allVerticesInside(lot.polygon, RECT_POLY, 1.0)).toBe(true)
      }
    })
  })

  // --- Triangle ---
  describe('triangle', () => {
    const block = makeBlock(TRIANGLE_POLY)

    it('generates lots inside the triangle', () => {
      const lots = generateLots(block, { ...DEFAULT_OPTIONS, cols: 4, rows: 1 })
      expect(lots.length).toBeGreaterThan(0)
      for (const lot of lots) {
        expect(allVerticesInside(lot.polygon, TRIANGLE_POLY, 1.0)).toBe(true)
      }
    })

    it('discards tiny degenerate fragments', () => {
      const lots = generateLots(block, { ...DEFAULT_OPTIONS, cols: 10, rows: 1 })
      for (const lot of lots) {
        expect(lot.area).toBeGreaterThan(0.5 * 10 * 10) // > 0.5 m²
      }
    })
  })

  // --- Concave (L-shape) ---
  describe('concave L-shape', () => {
    const block = makeBlock(L_SHAPE_POLY)

    it('generates lots inside the L-shape', () => {
      const lots = generateLots(block, { ...DEFAULT_OPTIONS, cols: 5, rows: 1 })
      expect(lots.length).toBeGreaterThan(0)
      for (const lot of lots) {
        expect(allVerticesInside(lot.polygon, L_SHAPE_POLY, 1.0)).toBe(true)
      }
    })
  })

  // --- Irregular pentagon ---
  describe('irregular pentagon', () => {
    const block = makeBlock(PENTAGON_POLY)

    it('generates lots inside the pentagon', () => {
      const lots = generateLots(block, { ...DEFAULT_OPTIONS, cols: 4, rows: 1 })
      expect(lots.length).toBeGreaterThan(0)
      for (const lot of lots) {
        expect(allVerticesInside(lot.polygon, PENTAGON_POLY, 1.0)).toBe(true)
      }
    })
  })

  // --- Near-collinear polygon ---
  describe('near-collinear edges', () => {
    const block = makeBlock(FLAT_HEX_POLY)

    it('generates lots without errors', () => {
      const lots = generateLots(block, { ...DEFAULT_OPTIONS, cols: 5, rows: 1 })
      expect(lots.length).toBeGreaterThan(0)
      for (const lot of lots) {
        expect(lot.area).toBeGreaterThan(0)
        expect(lot.polygon.length).toBeGreaterThanOrEqual(3)
      }
    })
  })

  // --- Various parameters ---
  describe('different params on rectangle', () => {
    const block = makeBlock(RECT_POLY)

    const paramSets = [
      { cols: 1, rows: 1 },
      { cols: 3, rows: 1 },
      { cols: 10, rows: 1 },
      { cols: 5, rows: 2 },
      { cols: 5, rows: 3 },
    ]

    for (const params of paramSets) {
      it(`cols=${params.cols} rows=${params.rows}: all lots inside block`, () => {
        const lots = generateLots(makeBlock(RECT_POLY), {
          ...DEFAULT_OPTIONS,
          ...params,
        })
        for (const lot of lots) {
          expect(allVerticesInside(lot.polygon, RECT_POLY, 1.0)).toBe(true)
          expect(lot.area).toBeGreaterThan(0)
        }
      })
    }
  })
})

// ─── Determinism Tests ───────────────────────────────────

describe('determinism', () => {
  const testCases: { name: string; poly: Vec2[] }[] = [
    { name: 'rectangle', poly: RECT_POLY },
    { name: 'triangle', poly: TRIANGLE_POLY },
    { name: 'L-shape', poly: L_SHAPE_POLY },
    { name: 'pentagon', poly: PENTAGON_POLY },
    { name: 'flat-hex', poly: FLAT_HEX_POLY },
  ]

  for (const { name, poly } of testCases) {
    it(`${name}: 10 runs produce identical geometry`, () => {
      const hashes: string[] = []

      for (let run = 0; run < 10; run++) {
        // Create fresh block each time to avoid mutation effects
        const block = makeBlock([...poly.map(p => ({ ...p }))])
        const lots = generateLots(block, { ...DEFAULT_OPTIONS, cols: 5, rows: 1 })
        hashes.push(hashGeometry(lots))
      }

      // All hashes must be identical
      const first = hashes[0]
      for (let i = 1; i < hashes.length; i++) {
        expect(hashes[i]).toBe(first)
      }
    })
  }

  it('dimensions mode is also deterministic', () => {
    const hashes: string[] = []
    for (let run = 0; run < 10; run++) {
      const block = makeBlock([...RECT_POLY.map(p => ({ ...p }))])
      const lots = generateLots(block, {
        mode: 'dimensions',
        frontage: 3,
        depth: 5,
        rows: 2,
        pixelsPerMeter: 10,
      })
      hashes.push(hashGeometry(lots))
    }
    const first = hashes[0]
    for (let i = 1; i < hashes.length; i++) {
      expect(hashes[i]).toBe(first)
    }
  })
})

// ─── hashGeometry export test ────────────────────────────

describe('hashGeometry', () => {
  it('produces identical hashes for identical input', () => {
    const lots = [
      { polygon: [{ x: 1, y: 2 }, { x: 3, y: 4 }] },
      { polygon: [{ x: 5, y: 6 }, { x: 7, y: 8 }] },
    ]
    expect(hashGeometry(lots)).toBe(hashGeometry(lots))
  })

  it('produces different hashes for different input', () => {
    const a = [{ polygon: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }]
    const b = [{ polygon: [{ x: 1, y: 2 }, { x: 3, y: 5 }] }]
    expect(hashGeometry(a)).not.toBe(hashGeometry(b))
  })
})
