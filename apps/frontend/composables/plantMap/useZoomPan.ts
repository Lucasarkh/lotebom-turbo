import { ref, onMounted, onUnmounted } from 'vue'

export interface Transform {
  x: number
  y: number
  scale: number
}

interface UseZoomPanOptions {
  minScale?: number
  maxScale?: number
  scaleFactor?: number
}

/**
 * Provides zoom (wheel + pinch) and pan (drag) behaviour for an element.
 * All event listeners are added to `containerEl` (the clipping viewport).
 * The transform is applied to `contentEl` (the content being zoomed).
 *
 * Coordinates returned/consumed use the content-element space.
 */
export const useZoomPan = (options: UseZoomPanOptions = {}) => {
  const { minScale = 0.5, maxScale = 6, scaleFactor = 0.1 } = options

  const transform = ref<Transform>({ x: 0, y: 0, scale: 1 })
  const containerEl = ref<HTMLElement | null>(null)
  const contentEl = ref<HTMLElement | null>(null)

  // ── Pan state ──────────────────────────────────────────
  let isPanning = false
  let panStart = { x: 0, y: 0 }
  let transformAtPanStart: Transform = { x: 0, y: 0, scale: 1 }

  // ── Pinch state ────────────────────────────────────────
  let lastPinchDist = 0

  // ── Helpers ────────────────────────────────────────────
  const clampScale = (s: number) => Math.min(maxScale, Math.max(minScale, s))

  const applyZoom = (delta: number, originX: number, originY: number) => {
    const { x, y, scale } = transform.value
    const newScale = clampScale(scale + delta * scale)
    const ratio = newScale / scale

    transform.value = {
      scale: newScale,
      x: originX - ratio * (originX - x),
      y: originY - ratio * (originY - y),
    }
  }

  // ── Wheel zoom ─────────────────────────────────────────
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const rect = containerEl.value!.getBoundingClientRect()
    const ox = e.clientX - rect.left
    const oy = e.clientY - rect.top
    const delta = e.deltaY > 0 ? -scaleFactor : scaleFactor
    applyZoom(delta, ox, oy)
  }

  // ── Mouse pan ──────────────────────────────────────────
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    isPanning = true
    panStart = { x: e.clientX, y: e.clientY }
    transformAtPanStart = { ...transform.value }
    ;(e.currentTarget as HTMLElement).style.cursor = 'grabbing'
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStart.x
    const dy = e.clientY - panStart.y
    transform.value = {
      ...transform.value,
      x: transformAtPanStart.x + dx,
      y: transformAtPanStart.y + dy,
    }
  }

  const onMouseUp = (e: MouseEvent) => {
    isPanning = false
    if (containerEl.value) containerEl.value.style.cursor = 'grab'
  }

  // ── Touch pan + pinch ──────────────────────────────────
  const getTouchDist = (t1: Touch, t2: Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      isPanning = true
      panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      transformAtPanStart = { ...transform.value }
    } else if (e.touches.length === 2) {
      isPanning = false
      lastPinchDist = getTouchDist(e.touches[0], e.touches[1])
    }
  }

  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1 && isPanning) {
      const dx = e.touches[0].clientX - panStart.x
      const dy = e.touches[0].clientY - panStart.y
      transform.value = {
        ...transform.value,
        x: transformAtPanStart.x + dx,
        y: transformAtPanStart.y + dy,
      }
    } else if (e.touches.length === 2) {
      const dist = getTouchDist(e.touches[0], e.touches[1])
      const delta = (dist - lastPinchDist) / 200
      lastPinchDist = dist

      const rect = containerEl.value!.getBoundingClientRect()
      const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left
      const cy = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top
      applyZoom(delta, cx, cy)
    }
  }

  const onTouchEnd = () => {
    isPanning = false
  }

  // ── Reset ──────────────────────────────────────────────
  const resetTransform = () => {
    transform.value = { x: 0, y: 0, scale: 1 }
  }

  // ── Lifecycle ──────────────────────────────────────────
  const attach = () => {
    const el = containerEl.value
    if (!el) return
    el.style.cursor = 'grab'
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
  }

  const detach = () => {
    const el = containerEl.value
    if (!el) return
    el.removeEventListener('wheel', onWheel)
    el.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
  }

  onMounted(attach)
  onUnmounted(detach)

  return {
    transform,
    containerEl,
    contentEl,
    resetTransform,
    /** Programmatically re-attach events (call after containerEl is set) */
    attach,
    detach,
  }
}
