<template>
  <div class="space-y-6">
    <div>
      <NuxtLink :to="`/painel/projetos/${projectId}`" class="mb-3 inline-flex items-center gap-1.5 text-sm text-p-text-muted transition-colors hover:text-p-text">
        <i class="bi bi-arrow-left-short text-lg" aria-hidden="true"></i>
        <span>{{ projectName || 'Projeto' }}</span>
      </NuxtLink>
      <UiPageHeader title="Panorama 360°" description="Gerencie vistas panorâmicas com beacons de texto e linha do tempo.">
        <template #actions>
          <a
            v-if="projectSlug"
            :href="`/${projectSlug}#panorama`"
            target="_blank"
            class="inline-flex items-center gap-2 rounded-full border border-p-info/30 bg-p-info-subtle px-5 py-2 text-sm font-bold text-p-text transition-all hover:-translate-y-0.5 hover:border-p-info/50"
          >
            <i class="bi bi-globe2" aria-hidden="true"></i>
            <span>Ver página pública</span>
          </a>
        </template>
      </UiPageHeader>
    </div>

    <UiLoadingState v-if="loading" />

    <UiAlert v-else-if="loadError" variant="error" :title="loadError" />

    <div v-else class="min-h-[500px]" style="height: calc(100vh - 200px);">
      <PanoramaEditor
        :project-id="projectId"
        :initial-panoramas="panoramas"
        :can-edit="authStore.canEdit"
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
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'painel' })

const route = useRoute()
const projectId = route.params.id as string
const authStore = useAuthStore()

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
