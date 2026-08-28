export type LotSealTone = 'sun' | 'nature' | 'view' | 'infra' | 'default'

export interface LotSealVisual {
  icon: string
  tone: LotSealTone
}

const SEAL_MINOR_WORDS = new Set([
  'a',
  'à',
  'às',
  'ao',
  'aos',
  'com',
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'em',
  'na',
  'nas',
  'no',
  'nos',
  'o',
  'os',
  'para',
  'por',
])

const normalizeSealKey = (tag: string) =>
  String(tag ?? '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/**
 * O ícone do selo é derivado do texto — a loteadora cadastra selo livre e a
 * primeira regra que casar define ícone e cor. `LOT_SEAL_SUGGESTIONS` abaixo é
 * o vocabulário com cobertura garantida; fora dele o selo cai no neutro.
 */
const SEAL_VISUALS: Array<{ match: RegExp } & LotSealVisual> = [
  { match: /sol.*(manha|nascent)|(manha|nascent).*sol|face leste|leste/, icon: 'bi-sunrise', tone: 'sun' },
  { match: /sol.*(tarde|poent)|(tarde|poent).*sol|face oeste|oeste/, icon: 'bi-sunset', tone: 'sun' },
  { match: /sol|ensolarad/, icon: 'bi-brightness-high', tone: 'sun' },
  { match: /esquina/, icon: 'bi-signpost-split', tone: 'view' },
  { match: /vista|panoram|horizonte/, icon: 'bi-binoculars', tone: 'view' },
  { match: /amplo|ampla|maior|expans/, icon: 'bi-arrows-angle-expand', tone: 'view' },
  { match: /verde|parque|bosque|arboriz|praca|natur|jardim/, icon: 'bi-tree', tone: 'nature' },
  { match: /lago|lagoa|agua|rio|corrego|nascente d/, icon: 'bi-water', tone: 'nature' },
  { match: /portaria|guarita|segur|acesso|entrada/, icon: 'bi-shield-check', tone: 'infra' },
  { match: /lazer|clube|piscina|playground|academia/, icon: 'bi-bicycle', tone: 'infra' },
  { match: /plano|nivelad/, icon: 'bi-rulers', tone: 'infra' },
  { match: /aclive|declive|desnivel/, icon: 'bi-triangle', tone: 'infra' },
  { match: /comerc|avenida|via |rua /, icon: 'bi-shop', tone: 'infra' },
]

export const FALLBACK_SEAL_VISUAL: LotSealVisual = {
  icon: 'bi-check2-circle',
  tone: 'default',
}

export const resolveSealVisual = (tag: string): LotSealVisual => {
  const key = normalizeSealKey(tag)
  const visual = SEAL_VISUALS.find((candidate) => candidate.match.test(key))

  return visual
    ? { icon: visual.icon, tone: visual.tone }
    : { ...FALLBACK_SEAL_VISUAL }
}

export const hasCustomSealIcon = (tag: string) =>
  resolveSealVisual(tag).icon !== FALLBACK_SEAL_VISUAL.icon

/** `text-transform: capitalize` do CSS escreveria "Sol Da Manhã". */
export const formatSealLabel = (tag: string) =>
  String(tag ?? '')
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLocaleLowerCase('pt-BR')
      if (index > 0 && SEAL_MINOR_WORDS.has(lower)) return lower
      return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1)
    })
    .join(' ')

/** Sugestões do painel: todo item aqui tem ícone próprio garantido. */
export const LOT_SEAL_SUGGESTIONS = [
  'sol da manhã',
  'sol da tarde',
  'esquina',
  'vista livre',
  'próximo à portaria',
  'fundo para área verde',
  'frente para lago',
  'próximo ao lazer',
  'terreno plano',
  'aclive',
  'declive',
  'lote amplo',
  'frente comercial',
]
