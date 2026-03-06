<template>
  <div class="mirror-page">
    <header class="mirror-header">
      <div>
        <p class="mirror-kicker">Espelho da Planta</p>
        <h1 class="mirror-title">{{ project?.name || 'Projeto' }}</h1>
        <p class="mirror-subtitle">Visualizacao publica em tempo real.</p>
      </div>
      <button
        v-if="mirrorAbsoluteUrl"
        class="mirror-copy-btn"
        type="button"
        @click="copyMirrorLink"
      >
        Copiar link
      </button>
    </header>

    <div v-if="loading" class="mirror-state">
      <div class="loading-spinner"></div>
      <span>Carregando planta...</span>
    </div>

    <div v-else-if="error" class="mirror-error">
      <h2>Nao foi possivel abrir o espelho da planta.</h2>
      <p>{{ error }}</p>
      <button type="button" class="mirror-retry-btn" @click="loadInitial">Tentar novamente</button>
    </div>

    <main v-else-if="plantMap" class="mirror-map-wrap" :style="mapShellStyle">
      <ClientOnly>
        <PlantMapViewer
          :plant-map="plantMap"
          :show-controls="true"
          :show-legend="true"
          :interactive="true"
        />
        <template #fallback>
          <div class="mirror-state">
            <div class="loading-spinner"></div>
            <span>Preparando visualizacao...</span>
          </div>
        </template>
      </ClientOnly>
    </main>

    <div v-else class="mirror-empty">
      Nenhuma planta cadastrada para este projeto.
    </div>

    <footer class="mirror-footer">
      <span>Atualizacao automatica a cada {{ pollSeconds }}s</span>
      <span v-if="lastSyncAt">Ultima atualizacao: {{ lastSyncAt }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { PlantMap } from '~/composables/plantMap/types'
import PlantMapViewer from '~/components/plantMap/PlantMapViewer.vue'
import { usePublicPlantMap } from '~/composables/plantMap/usePlantMapApi'

const props = defineProps<{
  slug?: string
  id?: string
}>()

const route = useRoute()
const { fetchPublic } = usePublicApi()
const { getPublicPlantMap } = usePublicPlantMap()
const { success: toastSuccess, fromError: toastFromError } = useToast()

const pollSeconds = 15
let pollTimer: ReturnType<typeof setInterval> | null = null

const loading = ref(true)
const error = ref('')
const project = ref<any | null>(null)
const plantMap = ref<PlantMap | null>(null)
const lastSyncAt = ref('')

const previewId = computed(() => (props.id || route.params.id || '') as string)
const projectSlug = computed(() => (props.slug || route.params.slug || '') as string)
const isPreview = computed(() => !!previewId.value)

const mirrorPath = computed(() => {
  if (!project.value) return ''
  if (isPreview.value) return `/preview/${project.value.id}/espelho-planta`
  return `/${project.value.slug}/espelho-planta`
})

const mirrorAbsoluteUrl = computed(() => {
  if (!mirrorPath.value || !process.client) return ''
  return `${window.location.origin}${mirrorPath.value}`
})

const projectEndpoint = computed(() => {
  if (isPreview.value) return `/p/preview/${previewId.value}`
  return `/p/${projectSlug.value}`
})

const mapShellStyle = computed(() => {
  const w = Number(plantMap.value?.imageWidth) || 16
  const h = Number(plantMap.value?.imageHeight) || 9
  return {
    aspectRatio: `${w} / ${h}`,
  }
})

const formatNow = () => {
  const now = new Date()
  return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const refreshPlantMap = async () => {
  if (!project.value?.id) return
  plantMap.value = await getPublicPlantMap(project.value.id, isPreview.value)
  lastSyncAt.value = formatNow()
}

const loadInitial = async () => {
  loading.value = true
  error.value = ''

  try {
    project.value = await fetchPublic(projectEndpoint.value)
    await refreshPlantMap()
  } catch (err) {
    error.value = (err as Error)?.message || 'Erro ao carregar dados do projeto.'
  } finally {
    loading.value = false
  }
}

const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(() => {
    refreshPlantMap().catch(() => null)
  }, pollSeconds * 1000)
}

const stopPolling = () => {
  if (!pollTimer) return
  clearInterval(pollTimer)
  pollTimer = null
}

const handleVisibilityChange = () => {
  if (!process.client) return

  if (document.visibilityState === 'visible') {
    refreshPlantMap().catch(() => null)
    startPolling()
  } else {
    stopPolling()
  }
}

const copyMirrorLink = async () => {
  if (!mirrorAbsoluteUrl.value) return

  try {
    await navigator.clipboard.writeText(mirrorAbsoluteUrl.value)
    toastSuccess('Link do espelho copiado!')
  } catch (err) {
    toastFromError(err, 'Nao foi possivel copiar o link')
  }
}

onMounted(async () => {
  await loadInitial()
  startPolling()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  stopPolling()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.mirror-page {
  min-height: 100vh;
  background: #f4f5f7;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mirror-header {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.mirror-kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #0f766e;
}

.mirror-title {
  margin: 4px 0 0;
  font-size: 24px;
  line-height: 1.1;
  color: #0f172a;
}

.mirror-subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.mirror-copy-btn,
.mirror-retry-btn {
  border: 1px solid #cbd5e1;
  background: #0f172a;
  color: #ffffff;
  border-radius: 10px;
  height: 38px;
  padding: 0 14px;
  font-weight: 700;
  cursor: pointer;
}

.mirror-map-wrap {
  width: 100%;
  min-height: 320px;
  max-height: 72vh;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #dbe2ea;
  background: #111827;
}

.mirror-state,
.mirror-empty,
.mirror-error {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #475569;
  text-align: center;
  padding: 20px;
}

.mirror-error h2 {
  margin: 0;
  font-size: 20px;
  color: #0f172a;
}

.mirror-error p {
  margin: 0;
}

.mirror-footer {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 2px 0;
  color: #64748b;
  font-size: 12px;
  flex-wrap: wrap;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(148, 163, 184, 0.35);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: mirror-spin 0.7s linear infinite;
}

@keyframes mirror-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .mirror-page {
    padding: 12px;
  }

  .mirror-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .mirror-map-wrap {
    min-height: 260px;
    max-height: 62vh;
  }
}
</style>
