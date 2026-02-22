<template>
  <div>
    <!-- Header -->
    <div class="page-header" style="align-items: center; border-bottom: 1px solid var(--gray-100); padding-bottom: var(--space-6); margin-bottom: var(--space-6);">
      <div style="flex: 1;">
        <div class="flex items-center gap-2" style="margin-bottom: var(--space-2);">
          <NuxtLink :to="`/painel/projetos/${projectId}`" class="btn btn-ghost btn-sm" style="padding-left: 0;">
            &larr; {{ projectName || 'Projeto' }}
          </NuxtLink>
        </div>
        <h1 style="margin: 0; font-size: 1.4rem;">🗺️ Planta Interativa</h1>
        <p style="margin: 0; color: var(--gray-500);">Gerencie a planta do loteamento com hotspots interativos.</p>
      </div>

      <div class="flex items-center gap-2">
        <a
          v-if="projectSlug && tenantSlug"
          :href="`/${tenantSlug}/${projectSlug}#planta`"
          target="_blank"
          class="btn btn-sm btn-outline"
          style="border-radius: 64px; padding-left: 16px; padding-right: 16px;"
        >
          🌐 Ver página pública
        </a>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state" style="height: 400px; display:flex; align-items:center; justify-content:center;">
      <div class="loading-spinner"></div>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="card" style="max-width: 500px; color: var(--danger);">
      {{ loadError }}
    </div>

    <!-- Editor -->
    <div v-else style="height: calc(100vh - 200px); min-height: 500px;">
      <PlantMapEditor
        :project-id="projectId"
        :initial-plant-map="plantMap"
        @updated="plantMap = $event"
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
import { useApi } from '~/composables/useApi'

definePageMeta({ layout: 'default' })

const route = useRoute()
const projectId = route.params.id as string

const { fetchApi } = useApi()
const plantMapApi = usePlantMapApi()

const plantMap = ref<PlantMap | null>(null)
const projectName = ref('')
const projectSlug = ref('')
const tenantSlug = ref('')
const loading = ref(true)
const loadError = ref<string | null>(null)

onMounted(async () => {
  try {
    // Load project info + plant map in parallel
    const [project, pm] = await Promise.all([
      fetchApi(`/projects/${projectId}`).catch(() => null),
      plantMapApi.getPlantMap(projectId).catch(() => null),
    ])

    if (project) {
      projectName.value = project.name
      projectSlug.value = project.slug
      tenantSlug.value = project.tenant?.slug ?? ''
    }

    plantMap.value = pm
  } catch (e: any) {
    loadError.value = e.message ?? 'Erro ao carregar.'
  } finally {
    loading.value = false
  }
})
</script>
