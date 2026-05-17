<template>
  <div>
    <UiPageHeader title="Distribuição de Leads" description="Configure a distribuição automática de leads sem corretor vinculado." />

    <!-- Filter Bar -->
    <div class="mt-6 rounded-xl border border-p-border bg-p-elevated p-4">
      <UiSelect v-model="selectedProjectId" label="Empreendimento" @change="onProjectChange">
        <option value="">Selecione um projeto</option>
        <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
      </UiSelect>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="mt-6">
      <UiLoadingState />
    </div>

    <!-- No project selected -->
    <div v-else-if="!selectedProjectId" class="mt-6">
      <UiCard>
        <UiEmptyState title="Selecione um empreendimento" description="Escolha um projeto acima para configurar a distribuição automática de leads.">
          <template #icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32" class="text-p-text-muted"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </template>
        </UiEmptyState>
      </UiCard>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Config Section -->
      <UiCard class="mt-6">
        <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 class="text-lg font-bold text-p-text">Auto-Distribuição</h3>
            <p class="mt-1 max-w-xl text-sm text-p-text-muted">Quando ativado, leads que chegam sem link de corretor serão distribuídos automaticamente entre os corretores vinculados ao projeto em sistema de rodízio.</p>
          </div>
          <div class="flex shrink-0 items-center gap-3">
            <button class="relative h-7 w-[52px] rounded-full transition-colors" :class="config?.enabled ? 'bg-p-accent' : 'bg-p-overlay'" @click="toggleEnabled">
              <span class="absolute top-[3px] left-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-transform" :class="config?.enabled ? 'translate-x-6' : ''"></span>
            </button>
            <span class="text-xs font-extrabold uppercase tracking-wider" :class="config?.enabled ? 'text-p-accent' : 'text-p-text-muted'">
              {{ config?.enabled ? 'ATIVO' : 'INATIVO' }}
            </span>
          </div>
        </div>
      </UiCard>

      <!-- Queue Section -->
      <UiCard class="mt-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-bold text-p-text">Fila de Distribuição</h3>
            <p class="mt-1 text-sm text-p-text-muted">{{ queueState?.totalBrokers || 0 }} corretores elegíveis</p>
          </div>
          <div class="flex items-center gap-3">
            <div v-if="queueState?.totalBrokers > 0 || queueSearch" class="relative flex items-center">
              <svg class="absolute left-3 h-4 w-4 text-p-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                v-model="queueSearch"
                type="text"
                placeholder="Buscar corretor..."
                class="min-w-[200px] rounded-lg border border-p-border bg-p-raised py-2 pl-9 pr-3 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30"
                @input="debouncedQueueSearch"
              />
            </div>
            <UiButton
              v-if="queueState && queueState.totalBrokers > 0"
              variant="secondary"
              size="sm"
              @click="resetQueue"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              Resetar Fila
            </UiButton>
          </div>
        </div>

        <div v-if="loadingQueue" class="mt-6">
          <UiLoadingState />
        </div>

        <div v-else-if="!queueState || queueState.totalBrokers === 0" class="mt-4">
          <p class="text-sm text-p-text-muted">Nenhum corretor elegível para este projeto. Vincule corretores ao projeto para ativar a distribuição.</p>
        </div>

        <div v-else-if="queueState.brokers.length === 0" class="mt-4">
          <p class="text-sm text-p-text-muted">Nenhum corretor encontrado para "{{ queueSearch }}".</p>
        </div>

        <div v-else class="mt-5">
          <div class="flex flex-col gap-2">
            <div
              v-for="broker in queueState.brokers"
              :key="broker.id"
              class="flex items-center gap-3.5 rounded-xl border px-4 py-3 transition-colors"
              :class="broker.isNext ? 'border-p-accent/25 bg-p-accent/5' : 'border-transparent bg-p-overlay/30'"
            >
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold" :class="broker.isNext ? 'bg-p-accent text-white' : 'bg-p-overlay text-p-text-muted'">{{ broker.position + 1 }}</div>
              <div class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-p-accent bg-p-accent/15 text-[11px] font-bold text-p-accent">
                <img v-if="broker.photoUrl" :src="broker.photoUrl" :alt="broker.name" class="h-full w-full object-cover" />
                <span v-else>{{ getInitials(broker.name) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-p-text">{{ broker.name }}</div>
                <div class="text-xs text-p-text-muted">{{ broker.code }}</div>
              </div>
              <UiBadge v-if="broker.isNext" variant="success" size="sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
                Próximo
              </UiBadge>
            </div>
          </div>

          <!-- Queue Pagination -->
          <div v-if="queueState.meta.totalPages > 1" class="mt-4 flex items-center justify-center gap-4 border-t border-p-border pt-4">
            <button
              class="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-p-border bg-p-elevated text-p-text-secondary transition-colors hover:bg-p-overlay hover:text-p-text disabled:cursor-not-allowed disabled:opacity-30"
              :disabled="queuePage <= 1"
              @click="queuePage--; loadQueue()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="text-sm font-semibold text-p-text-secondary">{{ queuePage }} / {{ queueState.meta.totalPages }}</span>
            <button
              class="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-p-border bg-p-elevated text-p-text-secondary transition-colors hover:bg-p-overlay hover:text-p-text disabled:cursor-not-allowed disabled:opacity-30"
              :disabled="queuePage >= queueState.meta.totalPages"
              @click="queuePage++; loadQueue()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </UiCard>

      <!-- Distribution Log -->
      <UiCard class="mt-6" padding="none">
        <div class="px-5 py-4">
          <h3 class="text-lg font-bold text-p-text">Histórico de Distribuição</h3>
          <p class="mt-1 text-sm text-p-text-muted">{{ logData?.meta?.totalItems || 0 }} registros</p>
        </div>

        <div v-if="loadingLog">
          <UiLoadingState />
        </div>

        <div v-else-if="!logData || logData.data.length === 0" class="px-5 pb-5">
          <p class="text-sm text-p-text-muted">Nenhuma distribuição automática registrada para este projeto.</p>
        </div>

        <div v-else>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-y border-p-border bg-p-raised/50">
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Data/Hora</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Lead</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Corretor</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Posição</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-p-border">
                <tr v-for="entry in logData.data" :key="entry.id">
                  <td class="whitespace-nowrap px-4 py-3 text-sm text-p-text-secondary">{{ formatDate(entry.createdAt) }}</td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-p-text">{{ entry.lead?.name || '—' }}</div>
                    <div v-if="entry.lead?.phone" class="text-xs text-p-text-muted">{{ entry.lead.phone }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-p-text">{{ entry.realtorLink?.name || '—' }}</div>
                    <div v-if="entry.realtorLink?.code" class="text-xs text-p-accent">{{ entry.realtorLink.code }}</div>
                  </td>
                  <td class="px-4 py-3 text-center text-sm font-bold text-p-text-secondary">{{ entry.queuePosition + 1 }}/{{ entry.queueSize }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Log Pagination -->
          <div v-if="logData.meta.totalPages > 1" class="flex items-center justify-center gap-4 border-t border-p-border px-5 py-4">
            <button
              class="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-p-border bg-p-elevated text-p-text-secondary transition-colors hover:bg-p-overlay hover:text-p-text disabled:cursor-not-allowed disabled:opacity-30"
              :disabled="logPage <= 1"
              @click="logPage--; loadLog()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="text-sm font-semibold text-p-text-secondary">{{ logPage }} / {{ logData.meta.totalPages }}</span>
            <button
              class="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-p-border bg-p-elevated text-p-text-secondary transition-colors hover:bg-p-overlay hover:text-p-text disabled:cursor-not-allowed disabled:opacity-30"
              :disabled="logPage >= logData.meta.totalPages"
              @click="logPage++; loadLog()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </UiCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

const api = useApi()
const toast = useToast()
const authStore = useAuthStore()
const canLoadProjectsCatalog = computed(() => {
  return !authStore.isLoteadora || !authStore.hasPanelRestrictions || authStore.canReadFeature('projects')
})

const loading = ref(true)
const projects = ref<any[]>([])
const selectedProjectId = ref('')
const config = ref<any>(null)
const queueState = ref<any>(null)
const logData = ref<any>(null)
const logPage = ref(1)
const queuePage = ref(1)
const queueSearch = ref('')
const loadingQueue = ref(false)
const loadingLog = ref(false)

onMounted(async () => {
  try {
    if (canLoadProjectsCatalog.value) {
      const res = await api.get('/projects')
      projects.value = Array.isArray(res) ? res : (res.data || [])
    } else {
      projects.value = []
    }
  } catch {
    toast.error('Erro ao carregar projetos')
  } finally {
    loading.value = false
  }
})

const onProjectChange = async () => {
  if (!selectedProjectId.value) {
    config.value = null
    queueState.value = null
    logData.value = null
    return
  }
  loading.value = true
  logPage.value = 1
  queuePage.value = 1
  queueSearch.value = ''
  try {
    await Promise.all([loadConfig(), loadQueue(), loadLog()])
  } finally {
    loading.value = false
  }
}

const loadConfig = async () => {
  config.value = await api.get(`/lead-distribution/config/${selectedProjectId.value}`)
}

const loadQueue = async () => {
  loadingQueue.value = true
  try {
    queueState.value = await api.get(`/lead-distribution/queue/${selectedProjectId.value}?page=${queuePage.value}&limit=15&search=${queueSearch.value}`)
  } finally {
    loadingQueue.value = false
  }
}

const loadLog = async () => {
  loadingLog.value = true
  try {
    logData.value = await api.get(`/lead-distribution/log/${selectedProjectId.value}?page=${logPage.value}&limit=15`)
  } finally {
    loadingLog.value = false
  }
}

const debouncedQueueSearch = useDebounceFn(() => {
  queuePage.value = 1
  loadQueue()
}, 500)

const toggleEnabled = async () => {
  if (!selectedProjectId.value) return
  try {
    const newEnabled = !config.value?.enabled
    config.value = await api.patch(`/lead-distribution/config/${selectedProjectId.value}`, { enabled: newEnabled })
    toast.success(newEnabled ? 'Auto-distribuicao ativada' : 'Auto-distribuicao desativada')
    await loadQueue()
  } catch {
    toast.error('Erro ao atualizar configuracao')
  }
}

const resetQueue = async () => {
  if (!confirm('Deseja resetar a fila? O proximo lead sera atribuido ao primeiro corretor.')) return
  try {
    await api.fetchApi(`/lead-distribution/queue/${selectedProjectId.value}/reset`, { method: 'POST' })
    toast.success('Fila resetada')
    await loadQueue()
  } catch {
    toast.error('Erro ao resetar fila')
  }
}

const getInitials = (name: string) => {
  if (!name) return '?'
  const parts = name.split(' ').filter(Boolean)
  const first = parts[0]?.[0]
  const last = parts[parts.length - 1]?.[0]
  if (!first) return '?'
  return parts.length > 1
    ? `${first}${last || first}`.toUpperCase()
    : first.toUpperCase()
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

definePageMeta({
  layout: 'painel'
})
</script>
