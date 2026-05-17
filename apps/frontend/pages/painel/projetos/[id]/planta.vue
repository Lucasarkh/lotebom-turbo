<template>
  <div class="space-y-6">
    <div>
      <NuxtLink :to="`/painel/projetos/${projectId}`" class="mb-3 inline-flex items-center gap-1.5 text-sm text-p-text-muted transition-colors hover:text-p-text">
        <i class="bi bi-arrow-left-short text-lg" aria-hidden="true"></i>
        <span>{{ projectName || 'Projeto' }}</span>
      </NuxtLink>
      <UiPageHeader title="Planta Interativa" description="Gerencie a planta do loteamento com hotspots interativos." />
    </div>

    <UiLoadingState v-if="loading" />

    <UiAlert v-else-if="loadError" variant="error" :title="loadError" />

    <div v-else class="flex flex-col gap-6">
      <div class="min-h-[58vh] md:min-h-[70vh]">
        <PlantMapEditor
          :project-id="projectId"
          :initial-plant-map="plantMap"
          @updated="plantMap = $event"
          @hotspots-changed="refreshLotsList"
          @edit-lot="openLotFromEditor"
        />
      </div>

      <PlantLotsManager
        ref="lotsManagerRef"
        :project-id="projectId"
        :project="project"
        @map-changed="reloadPlantMap"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePlantMapApi } from '~/composables/plantMap/usePlantMapApi'
import type { PlantMap } from '~/composables/plantMap/types'
import PlantMapEditor from '~/components/plantMap/PlantMapEditor.vue'
import PlantLotsManager from '~/components/plantMap/PlantLotsManager.vue'
import { useApi } from '~/composables/useApi'

definePageMeta({ layout: 'painel' })

const route = useRoute()
const projectId = route.params.id as string

const { fetchApi } = useApi()
const plantMapApi = usePlantMapApi()

const plantMap = ref<PlantMap | null>(null)
const project = ref<any>(null)
const projectName = ref('')
const projectSlug = ref('')
const loading = ref(true)
const loadError = ref<string | null>(null)
const lotsManagerRef = ref<{
  refreshLots: (page?: number) => Promise<void>
  openLotByMapElementId: (mapElementId: string) => Promise<void>
} | null>(null)

const reloadPlantMap = async () => {
  plantMap.value = await plantMapApi.getPlantMap(projectId).catch(() => plantMap.value)
}

const refreshLotsList = async () => {
  await lotsManagerRef.value?.refreshLots(1)
}

const openLotFromEditor = async (mapElementId: string) => {
  await lotsManagerRef.value?.openLotByMapElementId(mapElementId)

  if (typeof document !== 'undefined') {
    document.getElementById('plant-lots-manager')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

onMounted(async () => {
  try {
    const [projectData, pm] = await Promise.all([
      fetchApi(`/projects/${projectId}`).catch(() => null),
      plantMapApi.getPlantMap(projectId).catch(() => null),
    ])

    if (projectData) {
      project.value = projectData
      projectName.value = projectData.name
      projectSlug.value = projectData.slug
    }

    plantMap.value = pm
  } catch (e: any) {
    loadError.value = e.message ?? 'Erro ao carregar.'
  } finally {
    loading.value = false
  }
})
</script>
