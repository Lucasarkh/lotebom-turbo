type CSS2DObjectClass = typeof import('three/examples/jsm/renderers/CSS2DRenderer.js').CSS2DObject
type CSS2DObjectInstance = import('three/examples/jsm/renderers/CSS2DRenderer.js').CSS2DObject

export type LabelKind = 'measure' | 'front' | 'setback' | 'sun' | 'viela' | 'area'

export type LabelFactory = (text: string, kind: LabelKind, modifier?: string) => CSS2DObjectInstance

/**
 * Etiquetas em HTML sobre o canvas (CSS2DRenderer) no lugar de sprites de canvas.
 * Ganho duplo: texto nitido em qualquer zoom ou densidade de tela, e tipografia
 * e cor herdadas dos tokens do design system em vez de redesenhadas em bitmap.
 */
export const createLabelFactory = (CSS2DObject: CSS2DObjectClass): LabelFactory =>
  (text, kind, modifier) => {
    const element = document.createElement('div')
    element.className = `lot3d-label lot3d-label--${kind}${modifier ? ` lot3d-label--${modifier}` : ''}`
    element.textContent = text
    const label = new CSS2DObject(element)
    label.center.set(0.5, 0.5)
    return label
  }

/** Remove do DOM os elementos das etiquetas antes de descartar o grupo. */
export const detachLabels = (root: import('three').Object3D) => {
  root.traverse((node) => {
    const element = (node as { element?: HTMLElement }).element
    element?.remove()
  })
}
