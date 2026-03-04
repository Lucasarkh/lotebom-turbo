import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { onMounted, onUnmounted } from 'vue'

/**
 * Composable for reusable GSAP ScrollTrigger animations.
 * Automatically cleans up ScrollTrigger instances on unmount.
 */
export function useScrollAnimations() {
  const triggers: ScrollTrigger[] = []

  onUnmounted(() => {
    triggers.forEach(t => t.kill())
    triggers.length = 0
  })

  /**
   * Fade-up reveal for elements when they enter the viewport.
   */
  function revealOnScroll(
    selector: string | Element | Element[],
    options: {
      y?: number
      x?: number
      duration?: number
      stagger?: number | gsap.StaggerVars
      delay?: number
      ease?: string
      start?: string
      scale?: number
      rotation?: number
      opacity?: number
    } = {}
  ) {
    const {
      y = 60,
      x = 0,
      duration = 0.9,
      stagger = 0.12,
      delay = 0,
      ease = 'power3.out',
      start = 'top 85%',
      scale = 1,
      rotation = 0,
      opacity = 0
    } = options

    const tween = gsap.from(selector, {
      y,
      x,
      opacity,
      scale,
      rotation,
      duration,
      stagger,
      delay,
      ease,
      scrollTrigger: {
        trigger: typeof selector === 'string' ? selector : (Array.isArray(selector) ? selector[0] : selector),
        start,
        toggleActions: 'play none none none',
        once: true
      }
    })

    if (tween.scrollTrigger) {
      triggers.push(tween.scrollTrigger)
    }

    return tween
  }

  /**
   * Create a scroll-triggered timeline.
   */
  function scrollTimeline(
    trigger: string | Element,
    options: {
      start?: string
      end?: string
      scrub?: boolean | number
      once?: boolean
    } = {}
  ) {
    const {
      start = 'top 85%',
      once = true
    } = options

    const st = ScrollTrigger.create({
      trigger,
      start,
      toggleActions: once ? 'play none none none' : 'play reverse play reverse',
      ...(options.scrub !== undefined && { scrub: options.scrub }),
      ...(options.end && { end: options.end })
    })

    triggers.push(st)

    const tl = gsap.timeline({ scrollTrigger: st })
    return tl
  }

  /**
   * Parallax effect: element moves at slower rate during scroll.
   */
  function parallax(
    selector: string | Element,
    options: {
      y?: number
      speed?: number
      start?: string
      end?: string
    } = {}
  ) {
    const {
      y = -80,
      start = 'top bottom',
      end = 'bottom top'
    } = options

    const tween = gsap.to(selector, {
      y,
      ease: 'none',
      scrollTrigger: {
        trigger: selector as string,
        start,
        end,
        scrub: true
      }
    })

    if (tween.scrollTrigger) {
      triggers.push(tween.scrollTrigger)
    }

    return tween
  }

  /**
   * Animated counter that counts up to a target value.
   */
  function animateCounter(
    element: Element,
    target: number,
    options: {
      duration?: number
      prefix?: string
      suffix?: string
      decimals?: number
    } = {}
  ) {
    const {
      duration = 2,
      prefix = '',
      suffix = '',
      decimals = 0
    } = options

    const obj = { val: 0 }

    const tween = gsap.to(obj, {
      val: target,
      duration,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: element,
        start: 'top 85%',
        once: true
      },
      onUpdate() {
        element.textContent = prefix + obj.val.toFixed(decimals) + suffix
      }
    })

    if (tween.scrollTrigger) {
      triggers.push(tween.scrollTrigger)
    }

    return tween
  }

  return {
    revealOnScroll,
    scrollTimeline,
    parallax,
    animateCounter
  }
}
