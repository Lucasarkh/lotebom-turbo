/* ─── Tile Renderer: Beautiful 2D tile rendering for Konva ─── */
import type { TileRenderShape } from './types'
import { getTileById } from './types'

/**
 * Returns an array of Konva shape descriptors that visually render a tile.
 * Each shape will be rendered inside a Konva Group at the tile's position.
 * Coordinates are relative to (0, 0) = top-left of the tile.
 */
export function renderTile(tileId: string, cellSize: number, isSelected: boolean = false, lotLabel?: string, lotStatus?: string): TileRenderShape[] {
  const tile = getTileById(tileId)
  if (!tile) return renderFallback(cellSize, cellSize, isSelected)

  const w = tile.gridW * cellSize
  const h = tile.gridH * cellSize

  switch (tileId) {
    case 'road-straight': return renderRoadStraight(cellSize, isSelected)
    case 'road-curve': return renderRoadCurve(cellSize, isSelected)
    case 'road-t': return renderRoadT(cellSize, isSelected)
    case 'road-cross': return renderRoadCross(cellSize, isSelected)
    case 'road-deadend': return renderRoadDeadend(cellSize, isSelected)
    case 'roundabout': return renderRoundabout(cellSize, isSelected)
    case 'sidewalk': return renderSidewalk(cellSize, isSelected)

    case 'lot-small':
    case 'lot-medium':
    case 'lot-large':
    case 'lot-wide':
    case 'lot-commercial':
      return renderLot(w, h, isSelected, lotLabel, lotStatus, tileId === 'lot-commercial')

    case 'tree': return renderTree(cellSize, isSelected)
    case 'tree-cluster': return renderTreeCluster(cellSize, isSelected)
    case 'park': return renderPark(cellSize, isSelected)
    case 'lake-small': return renderLake(w, h, isSelected)
    case 'lake-large': return renderLake(w, h, isSelected)
    case 'grass': return renderGrass(cellSize, isSelected)

    case 'gate': return renderGate(w, h, isSelected)
    case 'guardhouse': return renderGuardhouse(cellSize, isSelected)
    case 'parking': return renderParking(w, h, isSelected)
    case 'playground': return renderPlayground(w, h, isSelected)
    case 'dirt': return renderDirt(cellSize, isSelected)
    case 'label': return renderLabel(w, h, isSelected)

    default: return renderFallback(w, h, isSelected)
  }
}

// ─── Selection highlight helper ──────────────────────
function selectionBorder(w: number, h: number): TileRenderShape[] {
  return [{
    type: 'rect',
    config: {
      x: -2, y: -2, width: w + 4, height: h + 4,
      fill: 'transparent', stroke: '#2563eb', strokeWidth: 2.5,
      dash: [6, 3], cornerRadius: 3, listening: false,
    },
  }]
}

// ─── Road Straight (horizontal, rotatable) ───────────
function renderRoadStraight(cs: number, sel: boolean): TileRenderShape[] {
  const m = cs * 0.12 // margin – grass edge
  const shapes: TileRenderShape[] = []

  // Asphalt (full cell)
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: cs, height: cs, fill: '#475569', stroke: 'transparent', listening: false } })
  // Edge lines
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: cs, height: 2, fill: '#94a3b8', listening: false } })
  shapes.push({ type: 'rect', config: { x: 0, y: cs - 2, width: cs, height: 2, fill: '#94a3b8', listening: false } })
  // Center dashed line
  shapes.push({ type: 'line', config: { points: [0, cs / 2, cs, cs / 2], stroke: '#fbbf24', strokeWidth: 1.5, dash: [6, 6], listening: false } })

  if (sel) shapes.push(...selectionBorder(cs, cs))
  return shapes
}

// ─── Road Curve ──────────────────────────────────────
function renderRoadCurve(cs: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []

  // Quarter-circle asphalt from origin corner
  shapes.push({ type: 'arc', config: {
    x: 0, y: 0, innerRadius: 0, outerRadius: cs, angle: 90,
    fill: '#475569', stroke: 'transparent', clockwise: false, listening: false,
  }})

  // Outer edge arc
  shapes.push({ type: 'arc', config: {
    x: 0, y: 0, innerRadius: cs - 2, outerRadius: cs, angle: 90,
    fill: '#94a3b8', stroke: 'transparent', clockwise: false, listening: false,
  }})

  // Center lane arc
  shapes.push({ type: 'arc', config: {
    x: 0, y: 0, innerRadius: cs / 2 - 1, outerRadius: cs / 2 + 1, angle: 90,
    fill: 'transparent', stroke: '#fbbf24', strokeWidth: 1.5, dash: [5, 5], clockwise: false, listening: false,
  }})

  if (sel) shapes.push(...selectionBorder(cs, cs))
  return shapes
}

// ─── Road T-intersection ─────────────────────────────
function renderRoadT(cs: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []

  // Full asphalt background
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: cs, height: cs, fill: '#475569', listening: false } })

  // Edge line on top
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: cs, height: 2, fill: '#94a3b8', listening: false } })

  // Center markings
  shapes.push({ type: 'line', config: { points: [0, cs / 2, cs * 0.3, cs / 2], stroke: '#fbbf24', strokeWidth: 1.5, dash: [4, 4], listening: false } })
  shapes.push({ type: 'line', config: { points: [cs * 0.7, cs / 2, cs, cs / 2], stroke: '#fbbf24', strokeWidth: 1.5, dash: [4, 4], listening: false } })
  shapes.push({ type: 'line', config: { points: [cs / 2, cs / 2, cs / 2, cs], stroke: '#fbbf24', strokeWidth: 1.5, dash: [4, 4], listening: false } })

  if (sel) shapes.push(...selectionBorder(cs, cs))
  return shapes
}

// ─── Road Cross ─────────────────────────────────────
function renderRoadCross(cs: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []

  // Full asphalt
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: cs, height: cs, fill: '#475569', listening: false } })

  // Center crossing marks
  shapes.push({ type: 'line', config: { points: [0, cs / 2, cs, cs / 2], stroke: '#fbbf24', strokeWidth: 1.5, dash: [5, 5], listening: false } })
  shapes.push({ type: 'line', config: { points: [cs / 2, 0, cs / 2, cs], stroke: '#fbbf24', strokeWidth: 1.5, dash: [5, 5], listening: false } })

  if (sel) shapes.push(...selectionBorder(cs, cs))
  return shapes
}

// ─── Road Dead-end ──────────────────────────────────
function renderRoadDeadend(cs: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []

  // Asphalt base from left ending with rounded cap
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: cs * 0.65, height: cs, fill: '#475569', listening: false } })
  shapes.push({ type: 'circle', config: { x: cs * 0.65, y: cs / 2, radius: cs / 2, fill: '#475569', listening: false } })
  // Edge lines
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: cs * 0.6, height: 2, fill: '#94a3b8', listening: false } })
  shapes.push({ type: 'rect', config: { x: 0, y: cs - 2, width: cs * 0.6, height: 2, fill: '#94a3b8', listening: false } })
  // Center line
  shapes.push({ type: 'line', config: { points: [0, cs / 2, cs * 0.55, cs / 2], stroke: '#fbbf24', strokeWidth: 1.5, dash: [4, 4], listening: false } })

  if (sel) shapes.push(...selectionBorder(cs, cs))
  return shapes
}

// ─── Roundabout (2×2) ───────────────────────────────
function renderRoundabout(cs: number, sel: boolean): TileRenderShape[] {
  const s = cs * 2 // total size
  const shapes: TileRenderShape[] = []

  // Full asphalt background (matches road tiles when adjacent)
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: s, height: s, fill: '#475569', cornerRadius: 0, listening: false } })

  // Outer ring road
  shapes.push({ type: 'ring', config: {
    x: s / 2, y: s / 2, innerRadius: s * 0.2, outerRadius: s * 0.42,
    fill: '#4b5563', stroke: '#334155', strokeWidth: 0.5, listening: false,
  }})

  // Green center island
  shapes.push({ type: 'circle', config: {
    x: s / 2, y: s / 2, radius: s * 0.2,
    fill: '#4ade80', stroke: '#16a34a', strokeWidth: 1.5, listening: false,
  }})

  // Decorative center circle
  shapes.push({ type: 'circle', config: {
    x: s / 2, y: s / 2, radius: s * 0.08,
    fill: '#86efac', stroke: '#22c55e', strokeWidth: 1, listening: false,
  }})

  // Dashed ring lane marking
  shapes.push({ type: 'ring', config: {
    x: s / 2, y: s / 2, innerRadius: s * 0.30, outerRadius: s * 0.32,
    fill: 'transparent', stroke: '#fbbf24', strokeWidth: 1, dash: [5, 5], listening: false,
  }})

  // Approach center lines (full-width, connecting to adjacent road tiles)
  shapes.push({ type: 'line', config: { points: [s / 2, 0, s / 2, s / 2 - s * 0.42], stroke: '#fbbf24', strokeWidth: 1, dash: [4, 4], listening: false } })
  shapes.push({ type: 'line', config: { points: [s / 2, s / 2 + s * 0.42, s / 2, s], stroke: '#fbbf24', strokeWidth: 1, dash: [4, 4], listening: false } })
  shapes.push({ type: 'line', config: { points: [0, s / 2, s / 2 - s * 0.42, s / 2], stroke: '#fbbf24', strokeWidth: 1, dash: [4, 4], listening: false } })
  shapes.push({ type: 'line', config: { points: [s / 2 + s * 0.42, s / 2, s, s / 2], stroke: '#fbbf24', strokeWidth: 1, dash: [4, 4], listening: false } })

  if (sel) shapes.push(...selectionBorder(s, s))
  return shapes
}

// ─── Sidewalk ───────────────────────────────────────
function renderSidewalk(cs: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []
  // Thin sidewalk strip (narrower than road)
  const h = cs * 0.35
  const yOff = (cs - h) / 2
  shapes.push({ type: 'rect', config: { x: 0, y: yOff, width: cs, height: h, fill: '#d6d3d1', stroke: '#bbb5b0', strokeWidth: 0.5, cornerRadius: 1, listening: false } })
  // Subtle brick pattern
  const brickH = h / 2
  for (let row = 0; row < 2; row++) {
    const offset = row % 2 === 0 ? 0 : cs / 6
    for (let col = -1; col < 4; col++) {
      const x = col * (cs / 3) + offset
      shapes.push({ type: 'rect', config: {
        x: Math.max(0, x), y: yOff + row * brickH,
        width: Math.min(cs / 3 - 1, cs - Math.max(0, x)),
        height: brickH - 1,
        fill: '#ccc7c3', stroke: '#bab4b0', strokeWidth: 0.25, cornerRadius: 0.5, listening: false,
      }})
    }
  }
  if (sel) shapes.push(...selectionBorder(cs, cs))
  return shapes
}

// ─── Lots ───────────────────────────────────────────
function renderLot(w: number, h: number, sel: boolean, label?: string, status?: string, isCommercial: boolean = false): TileRenderShape[] {
  const shapes: TileRenderShape[] = []

  // Status-based colors
  let baseFill = isCommercial ? '#fef3c7' : '#d1fae5'
  let borderColor = isCommercial ? '#d97706' : '#16a34a'
  let grassColor = isCommercial ? '#fde68a' : '#86efac'
  let textColor = isCommercial ? '#92400e' : '#166534'

  if (status === 'SOLD') {
    baseFill = '#fee2e2'; borderColor = '#dc2626'; grassColor = '#fca5a5'; textColor = '#991b1b'
  } else if (status === 'RESERVED') {
    baseFill = '#fef3c7'; borderColor = '#d97706'; grassColor = '#fde68a'; textColor = '#92400e'
  }

  // Base grass
  shapes.push({ type: 'rect', config: {
    x: 0, y: 0, width: w, height: h,
    fill: baseFill, stroke: borderColor, strokeWidth: 1.5, cornerRadius: 3, listening: false,
  }})

  // Inner grass texture (lighter inner rect)
  shapes.push({ type: 'rect', config: {
    x: 4, y: 4, width: w - 8, height: h - 8,
    fill: grassColor, stroke: 'transparent', cornerRadius: 2, opacity: 0.4, listening: false,
  }})

  // Grass dots pattern
  for (let gx = 8; gx < w - 8; gx += 12) {
    for (let gy = 8; gy < h - 8; gy += 12) {
      if (Math.sin(gx * 0.7 + gy * 1.3) > 0.3) {
        shapes.push({ type: 'circle', config: {
          x: gx + (Math.sin(gx + gy) * 2), y: gy + (Math.cos(gx * gy) * 2), radius: 1.2,
          fill: grassColor, opacity: 0.6, listening: false,
        }})
      }
    }
  }

  // Status icon in corner
  if (status === 'SOLD') {
    shapes.push({ type: 'text', config: { x: 5, y: 4, text: '🔴', fontSize: 10, listening: false } })
  } else if (status === 'RESERVED') {
    shapes.push({ type: 'text', config: { x: 5, y: 4, text: '🟡', fontSize: 10, listening: false } })
  }

  // Lot label
  if (label) {
    shapes.push({ type: 'text', config: {
      x: 0, y: h / 2 - 7, width: w, height: 20,
      text: label, fontSize: Math.min(13, w / (label.length * 0.6)),
      fontFamily: 'Inter, sans-serif', fontStyle: 'bold',
      fill: textColor, align: 'center', verticalAlign: 'middle', listening: false,
    }})
  }

  if (sel) shapes.push(...selectionBorder(w, h))
  return shapes
}

// ─── Trees ──────────────────────────────────────────
function renderTree(cs: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []
  // Shadow
  shapes.push({ type: 'ellipse', config: {
    x: cs / 2 + 2, y: cs / 2 + 4, radiusX: cs * 0.32, radiusY: cs * 0.2,
    fill: 'rgba(0,0,0,0.1)', listening: false,
  }})
  // Trunk
  shapes.push({ type: 'circle', config: { x: cs / 2, y: cs / 2 + 2, radius: cs * 0.08, fill: '#92400e', listening: false } })
  // Canopy
  shapes.push({ type: 'circle', config: { x: cs / 2, y: cs / 2 - 1, radius: cs * 0.3, fill: '#22c55e', stroke: '#16a34a', strokeWidth: 1, listening: false } })
  // Highlight
  shapes.push({ type: 'circle', config: { x: cs / 2 - 3, y: cs / 2 - 4, radius: cs * 0.12, fill: '#4ade80', opacity: 0.6, listening: false } })

  if (sel) shapes.push(...selectionBorder(cs, cs))
  return shapes
}

// ─── Tree Cluster (2×2) ─────────────────────────────
function renderTreeCluster(cs: number, sel: boolean): TileRenderShape[] {
  const s = cs * 2
  const shapes: TileRenderShape[] = []

  // Multiple trees with varying sizes and positions
  const trees = [
    { x: s * 0.28, y: s * 0.3, r: s * 0.17 },
    { x: s * 0.68, y: s * 0.25, r: s * 0.15 },
    { x: s * 0.45, y: s * 0.62, r: s * 0.19 },
    { x: s * 0.2, y: s * 0.72, r: s * 0.13 },
    { x: s * 0.75, y: s * 0.7, r: s * 0.16 },
  ]

  for (const t of trees) {
    // Shadow
    shapes.push({ type: 'ellipse', config: { x: t.x + 2, y: t.y + 3, radiusX: t.r * 0.9, radiusY: t.r * 0.5, fill: 'rgba(0,0,0,0.08)', listening: false } })
    // Trunk
    shapes.push({ type: 'circle', config: { x: t.x, y: t.y + 2, radius: t.r * 0.2, fill: '#92400e', listening: false } })
    // Canopy
    shapes.push({ type: 'circle', config: { x: t.x, y: t.y, radius: t.r, fill: '#22c55e', stroke: '#16a34a', strokeWidth: 0.8, listening: false } })
    // Highlight
    shapes.push({ type: 'circle', config: { x: t.x - t.r * 0.25, y: t.y - t.r * 0.3, radius: t.r * 0.4, fill: '#4ade80', opacity: 0.5, listening: false } })
  }

  if (sel) shapes.push(...selectionBorder(s, s))
  return shapes
}

// ─── Park (3×3) ─────────────────────────────────────
function renderPark(cs: number, sel: boolean): TileRenderShape[] {
  const s = cs * 3
  const shapes: TileRenderShape[] = []

  // Green base
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: s, height: s, fill: '#bbf7d0', stroke: '#16a34a', strokeWidth: 1.5, cornerRadius: 6, listening: false } })

  // Walking path (curved via points)
  shapes.push({ type: 'line', config: {
    points: [0, s * 0.5, s * 0.2, s * 0.45, s * 0.4, s * 0.55, s * 0.6, s * 0.45, s * 0.8, s * 0.55, s, s * 0.5],
    stroke: '#d6d3d1', strokeWidth: 6, lineCap: 'round', lineJoin: 'round', tension: 0.4, listening: false,
  }})
  shapes.push({ type: 'line', config: {
    points: [s * 0.5, 0, s * 0.45, s * 0.3, s * 0.55, s * 0.5, s * 0.45, s * 0.7, s * 0.5, s],
    stroke: '#d6d3d1', strokeWidth: 4, lineCap: 'round', lineJoin: 'round', tension: 0.3, listening: false,
  }})

  // Trees
  const parkTrees = [
    { x: s * 0.15, y: s * 0.2, r: s * 0.07 },
    { x: s * 0.82, y: s * 0.18, r: s * 0.08 },
    { x: s * 0.2, y: s * 0.78, r: s * 0.065 },
    { x: s * 0.85, y: s * 0.82, r: s * 0.07 },
    { x: s * 0.5, y: s * 0.25, r: s * 0.06 },
    { x: s * 0.7, y: s * 0.5, r: s * 0.055 },
  ]
  for (const t of parkTrees) {
    shapes.push({ type: 'circle', config: { x: t.x + 1, y: t.y + 2, radius: t.r, fill: 'rgba(0,0,0,0.07)', listening: false } })
    shapes.push({ type: 'circle', config: { x: t.x, y: t.y, radius: t.r, fill: '#22c55e', stroke: '#16a34a', strokeWidth: 0.6, listening: false } })
  }

  // Bench (small rect)
  shapes.push({ type: 'rect', config: { x: s * 0.35, y: s * 0.7, width: s * 0.08, height: s * 0.03, fill: '#92400e', cornerRadius: 1, listening: false } })

  if (sel) shapes.push(...selectionBorder(s, s))
  return shapes
}

// ─── Lake ───────────────────────────────────────────
function renderLake(w: number, h: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []

  // Green surround
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: w, height: h, fill: '#d1fae5', cornerRadius: 4, listening: false } })

  // Water body (ellipsoid)
  shapes.push({ type: 'ellipse', config: {
    x: w / 2, y: h / 2, radiusX: w * 0.42, radiusY: h * 0.4,
    fill: '#38bdf8', stroke: '#0ea5e9', strokeWidth: 1.5, listening: false,
  }})

  // Water highlight
  shapes.push({ type: 'ellipse', config: {
    x: w * 0.4, y: h * 0.4, radiusX: w * 0.2, radiusY: h * 0.15,
    fill: '#7dd3fc', opacity: 0.6, listening: false,
  }})

  // Wave lines
  for (let i = 0; i < 3; i++) {
    const yOff = h * 0.4 + i * h * 0.12
    shapes.push({ type: 'line', config: {
      points: [w * 0.3, yOff, w * 0.4, yOff - 2, w * 0.5, yOff, w * 0.6, yOff - 2, w * 0.7, yOff],
      stroke: '#bae6fd', strokeWidth: 1, tension: 0.5, listening: false,
    }})
  }

  // Shore vegetation
  const plants = [
    { x: w * 0.15, y: h * 0.35 }, { x: w * 0.12, y: h * 0.6 },
    { x: w * 0.85, y: h * 0.45 }, { x: w * 0.8, y: h * 0.7 },
  ]
  for (const p of plants) {
    shapes.push({ type: 'circle', config: { x: p.x, y: p.y, radius: w * 0.03, fill: '#22c55e', opacity: 0.7, listening: false } })
  }

  if (sel) shapes.push(...selectionBorder(w, h))
  return shapes
}

// ─── Grass ──────────────────────────────────────────
function renderGrass(cs: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: cs, height: cs, fill: '#d1fae5', stroke: '#bbf7d0', strokeWidth: 0.5, listening: false } })
  // Grass blades
  for (let i = 0; i < 6; i++) {
    const x = cs * 0.15 + (i * cs * 0.13)
    const y = cs * 0.3 + Math.sin(i * 1.5) * cs * 0.2
    shapes.push({ type: 'line', config: {
      points: [x, y + 5, x - 1.5, y - 3, x, y - 6],
      stroke: '#4ade80', strokeWidth: 1.5, lineCap: 'round', tension: 0.3, listening: false,
    }})
  }
  if (sel) shapes.push(...selectionBorder(cs, cs))
  return shapes
}

// ─── Gate (1×2) ─────────────────────────────────────
function renderGate(w: number, h: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []

  // Road base
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: w, height: h, fill: '#475569', cornerRadius: 2, listening: false } })

  // Gate structure (two pillars)
  const pillarW = w * 0.25
  shapes.push({ type: 'rect', config: { x: 0, y: h * 0.3, width: pillarW, height: h * 0.4, fill: '#fbbf24', stroke: '#b45309', strokeWidth: 1.5, cornerRadius: 2, listening: false } })
  shapes.push({ type: 'rect', config: { x: w - pillarW, y: h * 0.3, width: pillarW, height: h * 0.4, fill: '#fbbf24', stroke: '#b45309', strokeWidth: 1.5, cornerRadius: 2, listening: false } })

  // Top beam
  shapes.push({ type: 'rect', config: { x: 0, y: h * 0.3, width: w, height: 4, fill: '#f59e0b', stroke: '#b45309', strokeWidth: 0.5, listening: false } })

  // Boom barrier
  shapes.push({ type: 'line', config: { points: [pillarW, h * 0.5, w - pillarW, h * 0.5], stroke: '#ef4444', strokeWidth: 3, dash: [6, 4], lineCap: 'round', listening: false } })

  // Lane markings on road
  shapes.push({ type: 'line', config: { points: [w / 2, 0, w / 2, h * 0.3], stroke: '#fbbf24', strokeWidth: 1, dash: [3, 3], listening: false } })
  shapes.push({ type: 'line', config: { points: [w / 2, h * 0.7, w / 2, h], stroke: '#fbbf24', strokeWidth: 1, dash: [3, 3], listening: false } })

  if (sel) shapes.push(...selectionBorder(w, h))
  return shapes
}

// ─── Guardhouse ─────────────────────────────────────
function renderGuardhouse(cs: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []

  // Ground
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: cs, height: cs, fill: '#e7e5e4', cornerRadius: 2, listening: false } })

  // Building base
  const bx = cs * 0.15, by = cs * 0.2, bw = cs * 0.7, bh = cs * 0.6
  shapes.push({ type: 'rect', config: { x: bx, y: by, width: bw, height: bh, fill: '#fed7aa', stroke: '#c2410c', strokeWidth: 1.5, cornerRadius: 2, listening: false } })

  // Roof
  shapes.push({ type: 'rect', config: { x: bx - 3, y: by - 4, width: bw + 6, height: 6, fill: '#dc2626', stroke: '#b91c1c', strokeWidth: 0.5, cornerRadius: 2, listening: false } })

  // Window
  shapes.push({ type: 'rect', config: { x: cs * 0.35, y: cs * 0.35, width: cs * 0.3, height: cs * 0.2, fill: '#bfdbfe', stroke: '#60a5fa', strokeWidth: 0.8, cornerRadius: 1, listening: false } })

  // Door
  shapes.push({ type: 'rect', config: { x: cs * 0.4, y: cs * 0.6, width: cs * 0.2, height: cs * 0.2, fill: '#92400e', cornerRadius: 1, listening: false } })

  if (sel) shapes.push(...selectionBorder(cs, cs))
  return shapes
}

// ─── Parking ────────────────────────────────────────
function renderParking(w: number, h: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []

  // Asphalt base
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: w, height: h, fill: '#64748b', stroke: '#475569', strokeWidth: 1, cornerRadius: 3, listening: false } })

  // Parking lines
  const spotW = w / 6
  for (let i = 1; i < 6; i++) {
    shapes.push({ type: 'line', config: {
      points: [i * spotW, h * 0.1, i * spotW, h * 0.45],
      stroke: '#f8fafc', strokeWidth: 1.5, listening: false,
    }})
    shapes.push({ type: 'line', config: {
      points: [i * spotW, h * 0.55, i * spotW, h * 0.9],
      stroke: '#f8fafc', strokeWidth: 1.5, listening: false,
    }})
  }

  // Horizontal boundary lines
  shapes.push({ type: 'line', config: { points: [spotW * 0.5, h * 0.45, w - spotW * 0.5, h * 0.45], stroke: '#f8fafc', strokeWidth: 1, listening: false } })
  shapes.push({ type: 'line', config: { points: [spotW * 0.5, h * 0.55, w - spotW * 0.5, h * 0.55], stroke: '#f8fafc', strokeWidth: 1, listening: false } })
  shapes.push({ type: 'line', config: { points: [spotW * 0.5, h * 0.1, w - spotW * 0.5, h * 0.1], stroke: '#f8fafc', strokeWidth: 1, listening: false } })
  shapes.push({ type: 'line', config: { points: [spotW * 0.5, h * 0.9, w - spotW * 0.5, h * 0.9], stroke: '#f8fafc', strokeWidth: 1, listening: false } })

  // P letter
  shapes.push({ type: 'text', config: { x: 0, y: h * 0.35, width: w, text: '🅿️', fontSize: 16, align: 'center', listening: false } })

  if (sel) shapes.push(...selectionBorder(w, h))
  return shapes
}

// ─── Playground ─────────────────────────────────────
function renderPlayground(w: number, h: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []

  // Sandy ground
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: w, height: h, fill: '#fde68a', stroke: '#f59e0b', strokeWidth: 1.5, cornerRadius: 4, listening: false } })

  // Swing set
  shapes.push({ type: 'line', config: { points: [w * 0.2, h * 0.2, w * 0.2, h * 0.55], stroke: '#78716c', strokeWidth: 2, listening: false } })
  shapes.push({ type: 'line', config: { points: [w * 0.4, h * 0.2, w * 0.4, h * 0.55], stroke: '#78716c', strokeWidth: 2, listening: false } })
  shapes.push({ type: 'line', config: { points: [w * 0.18, h * 0.2, w * 0.42, h * 0.2], stroke: '#78716c', strokeWidth: 2.5, listening: false } })
  // Swing seats
  shapes.push({ type: 'line', config: { points: [w * 0.27, h * 0.22, w * 0.25, h * 0.48], stroke: '#a8a29e', strokeWidth: 1, listening: false } })
  shapes.push({ type: 'rect', config: { x: w * 0.23, y: h * 0.48, width: 6, height: 2, fill: '#dc2626', listening: false } })
  shapes.push({ type: 'line', config: { points: [w * 0.33, h * 0.22, w * 0.35, h * 0.48], stroke: '#a8a29e', strokeWidth: 1, listening: false } })
  shapes.push({ type: 'rect', config: { x: w * 0.33, y: h * 0.48, width: 6, height: 2, fill: '#2563eb', listening: false } })

  // Slide
  shapes.push({ type: 'line', config: { points: [w * 0.65, h * 0.25, w * 0.65, h * 0.6], stroke: '#78716c', strokeWidth: 2, listening: false } })
  shapes.push({ type: 'line', config: { points: [w * 0.65, h * 0.25, w * 0.85, h * 0.6], stroke: '#f59e0b', strokeWidth: 3, lineCap: 'round', listening: false } })

  // Sandbox
  shapes.push({ type: 'rect', config: { x: w * 0.15, y: h * 0.68, width: w * 0.7, height: h * 0.22, fill: '#d4a574', stroke: '#92400e', strokeWidth: 1, cornerRadius: 3, listening: false } })

  if (sel) shapes.push(...selectionBorder(w, h))
  return shapes
}

// ─── Dirt ───────────────────────────────────────────
function renderDirt(cs: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: cs, height: cs, fill: '#d4a574', stroke: '#b8860b', strokeWidth: 0.5, listening: false } })
  // Dirt texture dots
  for (let i = 0; i < 8; i++) {
    const x = cs * 0.1 + (Math.sin(i * 2.5) * 0.5 + 0.5) * cs * 0.8
    const y = cs * 0.1 + (Math.cos(i * 1.7) * 0.5 + 0.5) * cs * 0.8
    shapes.push({ type: 'circle', config: { x, y, radius: 1.5, fill: '#b8860b', opacity: 0.3, listening: false } })
  }
  if (sel) shapes.push(...selectionBorder(cs, cs))
  return shapes
}

// ─── Label ──────────────────────────────────────────
function renderLabel(w: number, h: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []
  // Transparent background with subtle dashed border
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: w, height: h, fill: 'rgba(255,255,255,0.5)', stroke: '#94a3b8', strokeWidth: 0.5, dash: [4, 4], cornerRadius: 2, listening: false } })
  if (sel) shapes.push(...selectionBorder(w, h))
  return shapes
}

// ─── Fallback ───────────────────────────────────────
function renderFallback(w: number, h: number, sel: boolean): TileRenderShape[] {
  const shapes: TileRenderShape[] = []
  shapes.push({ type: 'rect', config: { x: 0, y: 0, width: w, height: h, fill: '#f1f5f9', stroke: '#94a3b8', strokeWidth: 1, dash: [4, 4], cornerRadius: 2, listening: false } })
  shapes.push({ type: 'text', config: { x: 0, y: h / 2 - 7, width: w, text: '?', fontSize: 14, fill: '#94a3b8', align: 'center', listening: false } })
  if (sel) shapes.push(...selectionBorder(w, h))
  return shapes
}

/**
 * Get a simplified miniature render of a tile for the palette preview.
 * Smaller, less detailed version of the full render.
 */
export function renderTilePreview(tileId: string, size: number): TileRenderShape[] {
  const tile = getTileById(tileId)
  if (!tile) return []

  const w = size
  const h = size * (tile.gridH / tile.gridW)

  switch (tileId) {
    case 'road-straight':
      return [
        { type: 'rect', config: { x: 0, y: 0, width: w, height: h, fill: '#475569', cornerRadius: 2 } },
        { type: 'line', config: { points: [0, h / 2, w, h / 2], stroke: '#fbbf24', strokeWidth: 1, dash: [3, 3] } },
      ]
    case 'road-curve':
      return [
        { type: 'arc', config: { x: 0, y: 0, innerRadius: 0, outerRadius: h, angle: 90, fill: '#475569' } },
      ]
    case 'road-t':
      return [
        { type: 'rect', config: { x: 0, y: 0, width: w, height: h, fill: '#475569', cornerRadius: 2 } },
      ]
    case 'road-cross':
      return [
        { type: 'rect', config: { x: 0, y: 0, width: w, height: h, fill: '#475569', cornerRadius: 2 } },
      ]
    case 'road-deadend':
      return [
        { type: 'rect', config: { x: 0, y: h * 0.1, width: w * 0.65, height: h * 0.8, fill: '#475569', cornerRadius: 2 } },
        { type: 'circle', config: { x: w * 0.6, y: h / 2, radius: h * 0.4, fill: '#475569' } },
      ]
    case 'roundabout':
      return [
        { type: 'rect', config: { x: 0, y: 0, width: w, height: h, fill: '#475569', cornerRadius: 2 } },
        { type: 'circle', config: { x: w / 2, y: h / 2, radius: w * 0.15, fill: '#4ade80' } },
      ]
    case 'sidewalk':
      return [
        { type: 'rect', config: { x: 0, y: h * 0.3, width: w, height: h * 0.4, fill: '#d6d3d1', stroke: '#bbb5b0', strokeWidth: 0.5 } },
      ]
    default: {
      // Generic preview based on tile style
      const style = tile.defaultStyle
      return [
        { type: 'rect', config: { x: 1, y: 1, width: w - 2, height: h - 2, fill: style.fill || '#e2e8f0', stroke: style.stroke || '#94a3b8', strokeWidth: 1, cornerRadius: 2 } },
      ]
    }
  }
}
