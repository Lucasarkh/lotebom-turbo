<template>
  <div>
    <UiPageHeader title="Reservas" description="Escolha um projeto para abrir a central de reservas.">
      <template #actions>
        <UiButton variant="secondary" to="/painel/projetos">Ver projetos</UiButton>
      </template>
    </UiPageHeader>

    <UiLoadingState v-if="loading" />

    <UiEmptyState
      v-else-if="projects.length === 0"
      title="Nenhum projeto disponível"
      description="Crie ou publique um projeto para centralizar reservas, contratos e liberações."
    >
      <template #action>
        <UiButton variant="primary" to="/painel/projetos">Ir para projetos</UiButton>
      </template>
    </UiEmptyState>

    <div v-else class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <UiCard v-for="project in projects" :key="project.id" padding="lg">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold uppercase tracking-wider text-p-text-muted">Projeto</p>
            <h2 class="mt-2 text-xl font-semibold text-p-text">{{ project.name }}</h2>
            <p class="mt-1 font-mono text-sm text-p-text-muted">/{{ project.slug }}</p>
          </div>
          <UiBadge :variant="project.status === 'PUBLISHED' ? 'success' : 'neutral'">
            {{ project.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho' }}
          </UiBadge>
        </div>

        <p class="mt-4 min-h-[3em] text-sm leading-relaxed text-p-text-secondary">{{ project.description || 'Sem descrição cadastrada.' }}</p>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <div class="rounded-lg border border-p-border bg-p-overlay p-4">
            <strong class="text-2xl font-bold text-p-text">{{ project._count?.leads || 0 }}</strong>
            <span class="mt-1 block text-xs font-bold uppercase tracking-wider text-p-text-muted">Leads</span>
          </div>
          <div class="rounded-lg border border-p-border bg-p-overlay p-4">
            <strong class="text-2xl font-bold text-p-text">{{ project._count?.mapElements || 0 }}</strong>
            <span class="mt-1 block text-xs font-bold uppercase tracking-wider text-p-text-muted">Elementos</span>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap gap-3">
          <UiButton variant="primary" :to="`/painel/projetos/${project.id}/pos-reserva`">Abrir Reservas</UiButton>
          <UiButton variant="secondary" :to="`/painel/projetos/${project.id}`">Abrir Projeto</UiButton>
        </div>
      </UiCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

definePageMeta({ layout: 'painel' })

type ReservationProject = {
  id: string
  name: string
  slug: string
  description?: string | null
  status?: string | null
  _count?: {
    leads?: number
    mapElements?: number
  } | null
}

const { fetchApi } = useApi()
const { fromError: toastFromError } = useToast()

const loading = ref(true)
const projects = ref<ReservationProject[]>([])

const loadProjects = async () => {
  loading.value = true
  try {
    const response = await fetchApi('/projects?page=1&limit=100')
    projects.value = response?.data || []
  } catch (error) {
    toastFromError(error, 'Erro ao carregar central de reservas')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadProjects()
})
</script>
