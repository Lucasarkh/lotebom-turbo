<template>
  <div>
    <div class="page-header" style="border-bottom: 1px solid var(--gray-100); padding-bottom: var(--space-6); margin-bottom: var(--space-6);">
      <div style="flex: 1;">
        <div class="flex items-center gap-2" style="margin-bottom: var(--space-1);">
          <NuxtLink :to="`/painel/projetos/${projectId}`" class="btn btn-ghost btn-sm" style="padding-left: 0; color: var(--gray-500);">
            ← {{ projectName || 'Projeto' }}
          </NuxtLink>
        </div>
        <h1 style="margin: 0; font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em;">🌄 Panorama 360°</h1>
        <p style="margin: 0; color: var(--gray-500); font-weight: 500;">Gerencie vistas panorâmicas com beacons de texto e linha do tempo.</p>
      </div>

      <div class="flex items-center gap-2">
        <a
          v-if="projectSlug"
          :href="`/${projectSlug}#panorama`"
          target="_blank"
          class="btn btn-sm btn-primary"
          style="border-radius: var(--radius-full); padding-left: var(--space-5); padding-right: var(--space-5); height: 38px;"
        >
          <span style="font-size: 1rem;">🌐</span>
          <span>Ver página pública</span>
        </a>
      </div>
    </div>

    <div v-if="loading" class="loading-state" style="height: 400px; display:flex; align-items:center; justify-content:center;">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="loadError" class="card" style="max-width: 500px; color: var(--danger);">
      {{ loadError }}
    </div>

    <div v-else style="height: calc(100vh - 200px); min-height: 500px;">
      <PanoramaEditor
        :project-id="projectId"
        :initial-panoramas="panoramas"
        @updated="panoramas = $event"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePanoramaApi } from '~/composables/panorama/usePanoramaApi'
import type { Panorama } from '~/composables/panorama/types'
import PanoramaEditor from '~/components/panorama/PanoramaEditor.vue'
import { useApi } from '~/composables/useApi'

definePageMeta({ layout: 'default' })

const route = useRoute()
const projectId = route.params.id as string

const { fetchApi } = useApi()
const panoramaApi = usePanoramaApi()

const panoramas = ref<Panorama[]>([])
const projectName = ref('')
const projectSlug = ref('')
const loading = ref(true)
const loadError = ref<string | null>(null)

onMounted(async () => {
  try {
    const [project, panos] = await Promise.all([
      fetchApi(`/projects/${projectId}`).catch(() => null),
      panoramaApi.getPanoramas(projectId).catch(() => []),
    ])

    if (project) {
      projectName.value = project.name
      projectSlug.value = project.slug
    }

    panoramas.value = panos
  } catch (e: any) {
    loadError.value = e.message ?? 'Erro ao carregar.'
  } finally {
    loading.value = false
  }
})
</script>
