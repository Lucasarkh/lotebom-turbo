import { ref, watch, onUnmounted } from 'vue'

export function useBodyScrollLock(isLocked: ReturnType<typeof ref<boolean>>) {
  let scrollY = 0

  function lock() {
    scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.overflow = 'hidden'
  }

  function unlock() {
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.overflow = ''
    window.scrollTo(0, scrollY)
  }

  watch(isLocked, (val) => {
    if (val) lock()
    else unlock()
  })

  onUnmounted(() => {
    if (isLocked.value) unlock()
  })

  return { lock, unlock }
}
