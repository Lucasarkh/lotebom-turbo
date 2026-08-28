<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface SectionNavItem {
  id: string
  label: string
  title: string
}

const props = withDefaults(
  defineProps<{
    /** id da seção -> rótulo curto do trilho. */
    labels: Record<string, string>
    /** id da seção -> texto do tooltip. Cai no rótulo quando ausente. */
    titles?: Record<string, string>
    /** Nasce recolhido atrás de um botão, em vez de fixo sobre o conteúdo. */
    collapsible?: boolean
    /** Distância do topo em que a seção passa a contar como ativa. */
    offset?: number
  }>(),
  { titles: () => ({}), collapsible: false, offset: 150 },
)

const emit = defineEmits<{ (e: 'update:active', id: string): void }>()

const items = ref<SectionNavItem[]>([])
const active = ref('')
const isOpen = ref(false)

let frame: number | null = null

/**
 * A ordem vem da posição real das seções na página, não de uma lista fixa: na
 * landing do empreendimento as seções são reordenáveis via CSS `order`, então
 * a ordem do DOM não é a ordem que o visitante vê.
 */
const refresh = () => {
  const measured = Object.keys(props.labels)
    .map((id) => ({ id, el: document.getElementById(id) }))
    .filter((entry): entry is { id: string; el: HTMLElement } => Boolean(entry.el))
    .map(({ id, el }) => ({ id, top: el.getBoundingClientRect().top }))
    .sort((a, b) => a.top - b.top)

  items.value = measured.map(({ id }) => ({
    id,
    label: props.labels[id] as string,
    title: props.titles?.[id] ?? (props.labels[id] as string),
  }))

  let current = measured[0]?.id ?? ''
  for (const section of measured) {
    if (section.top <= props.offset) current = section.id
  }

  if (current && current !== active.value) {
    active.value = current
    emit('update:active', current)
  }
}

const scheduleRefresh = () => {
  if (frame !== null) return
  frame = window.requestAnimationFrame(() => {
    frame = null
    refresh()
  })
}

const handleNavClick = () => {
  if (props.collapsible) isOpen.value = false
}

const toggleLabel = computed(() =>
  isOpen.value ? 'Fechar navegação das seções' : 'Abrir navegação das seções',
)

onMounted(() => {
  refresh()
  // As seções entram conforme os dados carregam; duas releituras cobrem isso
  // sem precisar observar a árvore inteira.
  window.setTimeout(refresh, 400)
  window.setTimeout(refresh, 1600)
  window.addEventListener('scroll', scheduleRefresh, { passive: true })
  window.addEventListener('resize', scheduleRefresh)
})

onUnmounted(() => {
  if (frame !== null) window.cancelAnimationFrame(frame)
  window.removeEventListener('scroll', scheduleRefresh)
  window.removeEventListener('resize', scheduleRefresh)
})
</script>

<template>
  <div
    v-if="items.length > 1"
    class="section-nav"
    :class="{ 'is-collapsible': collapsible, 'is-open': isOpen }"
  >
    <button
      v-if="collapsible"
      type="button"
      class="section-nav-toggle"
      :aria-expanded="isOpen"
      :aria-label="toggleLabel"
      :title="toggleLabel"
      @click="isOpen = !isOpen"
    >
      <i
        class="bi"
        :class="isOpen ? 'bi-chevron-left' : 'bi-list-ul'"
        aria-hidden="true"
      ></i>
    </button>

    <nav
      class="section-nav-rail"
      :aria-hidden="collapsible && !isOpen"
      aria-label="Seções da página"
    >
      <a
        v-for="item in items"
        :key="item.id"
        :href="`#${item.id}`"
        class="nav-dot"
        :class="{ 'is-active': active === item.id }"
        :title="item.title"
        :tabindex="collapsible && !isOpen ? -1 : 0"
        @click="handleNavClick"
      >
        <span
          class="dot"
          aria-hidden="true"
        ></span>
        <span class="label">{{ item.label }}</span>
      </a>
    </nav>
  </div>
</template>

<style scoped>
/* O wrapper não desenha nada: trilho e aba se posicionam sozinhos, senão o
   translate de um interfere no do outro. */
.section-nav {
  display: contents;
}

.section-nav-rail {
  position: fixed;
  top: 50%;
  left: 30px;
  transform: translateY(-50%);
  z-index: 140;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 70px;
  max-height: 76vh;
  overflow-y: auto;
  padding: 24px 0;
  background: white;
  border-radius: 50px;
  border: 1px solid #d2d2d7;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  scrollbar-width: none;
}

.section-nav-rail::-webkit-scrollbar {
  display: none;
}

.nav-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 12px 0;
  text-decoration: none;
  transition: all 0.3s;
}

.nav-dot .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d2d2d7;
  transition: all 0.3s;
}

.nav-dot .label {
  margin-top: 8px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: #86868b;
  text-align: center;
  line-height: 1.2;
}

.nav-dot:hover .dot,
.nav-dot.is-active .dot {
  background: #0071e3;
  transform: scale(1.2);
}

.nav-dot:hover .label,
.nav-dot.is-active .label {
  color: #0071e3;
}

/* Recolhido: o trilho sai da tela e sobra só a aba de abrir, para não cobrir
   carrossel nem conteúdo de borda a borda. */
.section-nav.is-collapsible .section-nav-rail {
  left: 12px;
  transform: translate(calc(-100% - 24px), -50%);
  opacity: 0;
  pointer-events: none;
  transition:
    transform 0.28s ease,
    opacity 0.2s ease;
}

.section-nav.is-collapsible.is-open .section-nav-rail {
  transform: translate(0, -50%);
  opacity: 1;
  pointer-events: auto;
}

.section-nav-toggle {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  z-index: 141;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 58px;
  padding: 0;
  border: 1px solid #d2d2d7;
  border-left: 0;
  border-radius: 0 14px 14px 0;
  background: white;
  color: #1d1d1f;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transition:
    transform 0.28s ease,
    color 0.2s ease;
}

.section-nav-toggle:hover {
  color: #0071e3;
}

.section-nav.is-collapsible.is-open .section-nav-toggle {
  transform: translate(81px, -50%);
  color: #0071e3;
}

@media (max-width: 1100px) {
  .section-nav {
    display: none;
  }
}
</style>
