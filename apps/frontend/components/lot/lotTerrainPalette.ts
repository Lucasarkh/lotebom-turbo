/**
 * Paleta do simulador 3D do lote. Os tons acompanham o cartão terroso da página
 * de detalhes; as texturas fotográficas entram por cima e recebem estes valores
 * apenas como tinta, para o modelo não brigar com a identidade da tela.
 */
export const LOT_TERRAIN_COLORS = {
  /** Multiplicador aplicado sobre as texturas PBR (1 = cor original). */
  textureTint: 1,
  exposure: 1.06,

  // Céu procedural usado como environment map — dá o reflexo difuso dos materiais.
  envSky: '#fffaf0',
  envHorizon: '#ffeecd',
  envGround: '#e3bd8a',
  contactShadow: '#4b2d18',

  // Fallback procedural: só entra se o pacote de texturas não carregar.
  grassLight: '#c6e487',
  grassMid: '#8db94b',
  grassDark: '#58792e',
  grassBladeLight: 'rgba(255, 255, 255, 0.34)',
  grassBladeDark: 'rgba(60, 92, 30, 0.25)',
  soilLight: '#955e35',
  soilMid: '#6e4023',
  soilDark: '#361d11',

  terrainTopTint: '#bcdf78',
  terrainSideTint: '#7b4b2c',

  bushLight: '#8fbe4c',
  bushDark: '#456f26',

  frontLine: '#f97316',
  frontArrow: '#f97316',
  solar: '#d4880e',

  dimensionLine: '#6b4324',
  dimensionGuide: '#a98159',

  wallAccent: '#8a5a3b',
  pool: '#2f8fbd',
  poolShell: '#9fd8ea',
  poolGrout: '#d8eef6',
  grillMouth: '#3b2a1f',
  poolDeck: '#e5ded2',
  slab: '#e9e4da',
  slabCap: '#f4f1ea',
  frame: '#cfd4d6',
  pavement: '#cfc9bf',
  foundation: '#8e8279',
  wall: '#f5ede0',
  window: '#7eaed0',
  door: '#6b4226',
  roof: '#c4613a',

  setbackLine: '#8b6914',
  viela: '#c8c0b8',

  skyLight: '#fff8df',
  groundLight: '#60391f',
  fillLight: '#ffd1a0',
  sunLight: '#fff1d0',
} as const

export type LotTerrainColors = typeof LOT_TERRAIN_COLORS
