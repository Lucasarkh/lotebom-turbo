<template>
  <span ref="wrapperRef" class="relative inline-flex items-center gap-1" @mouseenter="openTooltip" @mouseleave="closeTooltip">
    <slot />
    <span class="inline-flex items-center text-p-text-muted cursor-help shrink-0 transition-colors duration-200 hover:text-p-text-secondary" v-if="!noIcon">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
    </span>
  </span>

  <Teleport to="body">
    <Transition
      enter-active-class="transition-[opacity,transform] duration-150 ease-out"
      leave-active-class="transition-[opacity,transform] duration-100 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <span
        v-if="show"
        ref="bubbleRef"
        class="fixed z-[4000] bg-p-base text-p-text-secondary border border-p-border rounded-lg px-3 py-2 text-xs font-medium leading-relaxed w-max max-w-[280px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl pointer-events-none"
        :style="bubbleStyle"
      >
        {{ text }}
      </span>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  noIcon?: boolean
}>(), {
  position: 'top',
  noIcon: false
})

const show = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)
const bubbleRef = ref<HTMLElement | null>(null)
const resolvedPosition = ref<'top' | 'bottom' | 'left' | 'right'>(props.position)
const bubbleStyle = ref<Record<string, string>>({ top: '0px', left: '0px' })

const GAP = 8
const VIEWPORT_PADDING = 8

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

function updateTooltipPosition() {
  if (!show.value || !wrapperRef.value || !bubbleRef.value) return

  const triggerRect = wrapperRef.value.getBoundingClientRect()
  const bubbleRect = bubbleRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let position: 'top' | 'bottom' | 'left' | 'right' = props.position

  if (position === 'bottom' && triggerRect.bottom + GAP + bubbleRect.height > viewportHeight - VIEWPORT_PADDING) {
    position = 'top'
  } else if (position === 'top' && triggerRect.top - GAP - bubbleRect.height < VIEWPORT_PADDING) {
    position = 'bottom'
  } else if (position === 'left' && triggerRect.left - GAP - bubbleRect.width < VIEWPORT_PADDING) {
    position = 'right'
  } else if (position === 'right' && triggerRect.right + GAP + bubbleRect.width > viewportWidth - VIEWPORT_PADDING) {
    position = 'left'
  }

  let top = 0
  let left = 0

  if (position === 'top') {
    top = triggerRect.top - bubbleRect.height - GAP
    left = triggerRect.left + (triggerRect.width - bubbleRect.width) / 2
  } else if (position === 'bottom') {
    top = triggerRect.bottom + GAP
    left = triggerRect.left + (triggerRect.width - bubbleRect.width) / 2
  } else if (position === 'left') {
    top = triggerRect.top + (triggerRect.height - bubbleRect.height) / 2
    left = triggerRect.left - bubbleRect.width - GAP
  } else {
    top = triggerRect.top + (triggerRect.height - bubbleRect.height) / 2
    left = triggerRect.right + GAP
  }

  left = clamp(left, VIEWPORT_PADDING, viewportWidth - bubbleRect.width - VIEWPORT_PADDING)
  top = clamp(top, VIEWPORT_PADDING, viewportHeight - bubbleRect.height - VIEWPORT_PADDING)

  resolvedPosition.value = position
  bubbleStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`
  }
}

function openTooltip() {
  show.value = true
  nextTick(updateTooltipPosition)
}

function closeTooltip() {
  show.value = false
}

function handleViewportChange() {
  if (!show.value) return
  updateTooltipPosition()
}

onMounted(() => {
  window.addEventListener('scroll', handleViewportChange, true)
  window.addEventListener('resize', handleViewportChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleViewportChange, true)
  window.removeEventListener('resize', handleViewportChange)
})
</script>
