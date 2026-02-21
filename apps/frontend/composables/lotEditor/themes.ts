// ─── Theme definitions ───────────────────────────────────
export type ThemeName = 'maquete' | 'minimal' | 'clean'

export interface ThemeColors {
  // Background
  bg: string
  bgGrid: string

  // Roads
  roadFill: string
  roadStroke: string
  roadShadow: string

  // Blocks
  blockFill: string
  blockStroke: string
  blockHover: string

  // Lots by status
  lotAvailable: string
  lotAvailableStroke: string
  lotReserved: string
  lotReservedStroke: string
  lotSold: string
  lotSoldStroke: string
  lotHover: string
  lotSelected: string
  lotText: string

  // Roundabout
  roundaboutFill: string
  roundaboutStroke: string

  // Natural elements
  lakeFill: string
  lakeStroke: string
  greenFill: string
  greenStroke: string
  institutionalFill: string
  institutionalStroke: string

  // Nodes
  nodeDefault: string
  nodeSnap: string
  nodeActive: string

  // UI on top of map
  labelColor: string
}

const maqueteTheme: ThemeColors = {
  bg: '#e8e0d4',
  bgGrid: '#d8d0c4',
  roadFill: '#6b6b6b',
  roadStroke: '#4a4a4a',
  roadShadow: 'rgba(0,0,0,0.18)',
  blockFill: '#d4c9a8',
  blockStroke: '#b8a97e',
  blockHover: '#c8bb9a',
  lotAvailable: '#a8c99a',
  lotAvailableStroke: '#6d9a5b',
  lotReserved: '#f0d080',
  lotReservedStroke: '#c4a040',
  lotSold: '#d4a0a0',
  lotSoldStroke: '#a06060',
  lotHover: 'rgba(255,255,255,0.3)',
  lotSelected: 'rgba(37,99,235,0.35)',
  lotText: '#3d3520',
  roundaboutFill: '#8a8a7a',
  roundaboutStroke: '#5a5a4a',
  lakeFill: 'url(#lakeGradient)',
  lakeStroke: '#5a8aaa',
  greenFill: '#7ab060',
  greenStroke: '#4a8030',
  institutionalFill: '#c0b8d0',
  institutionalStroke: '#8878a0',
  nodeDefault: '#fff',
  nodeSnap: '#2563eb',
  nodeActive: '#ef4444',
  labelColor: '#3d3520',
}

const minimalTheme: ThemeColors = {
  bg: '#ffffff',
  bgGrid: '#f5f5f5',
  roadFill: '#d1d5db',
  roadStroke: '#9ca3af',
  roadShadow: 'rgba(0,0,0,0.06)',
  blockFill: '#f9fafb',
  blockStroke: '#e5e7eb',
  blockHover: '#f3f4f6',
  lotAvailable: '#d1fae5',
  lotAvailableStroke: '#6ee7b7',
  lotReserved: '#fef3c7',
  lotReservedStroke: '#fcd34d',
  lotSold: '#fee2e2',
  lotSoldStroke: '#fca5a5',
  lotHover: 'rgba(0,0,0,0.05)',
  lotSelected: 'rgba(37,99,235,0.2)',
  lotText: '#374151',
  roundaboutFill: '#e5e7eb',
  roundaboutStroke: '#9ca3af',
  lakeFill: '#dbeafe',
  lakeStroke: '#93c5fd',
  greenFill: '#d1fae5',
  greenStroke: '#6ee7b7',
  institutionalFill: '#ede9fe',
  institutionalStroke: '#c4b5fd',
  nodeDefault: '#fff',
  nodeSnap: '#2563eb',
  nodeActive: '#ef4444',
  labelColor: '#374151',
}

const cleanTheme: ThemeColors = {
  bg: '#f1f5f9',
  bgGrid: '#e2e8f0',
  roadFill: '#94a3b8',
  roadStroke: '#64748b',
  roadShadow: 'rgba(0,0,0,0.1)',
  blockFill: '#f8fafc',
  blockStroke: '#cbd5e1',
  blockHover: '#e2e8f0',
  lotAvailable: '#bbf7d0',
  lotAvailableStroke: '#4ade80',
  lotReserved: '#fde68a',
  lotReservedStroke: '#fbbf24',
  lotSold: '#fecaca',
  lotSoldStroke: '#f87171',
  lotHover: 'rgba(37,99,235,0.1)',
  lotSelected: 'rgba(37,99,235,0.25)',
  lotText: '#1e293b',
  roundaboutFill: '#cbd5e1',
  roundaboutStroke: '#64748b',
  lakeFill: 'url(#lakeGradient)',
  lakeStroke: '#60a5fa',
  greenFill: '#86efac',
  greenStroke: '#22c55e',
  institutionalFill: '#c4b5fd',
  institutionalStroke: '#8b5cf6',
  nodeDefault: '#fff',
  nodeSnap: '#2563eb',
  nodeActive: '#ef4444',
  labelColor: '#1e293b',
}

export const themes: Record<ThemeName, ThemeColors> = {
  maquete: maqueteTheme,
  minimal: minimalTheme,
  clean: cleanTheme,
}

export function getTheme(name: ThemeName): ThemeColors {
  return themes[name]
}
