<script setup lang="ts">
definePageMeta({ layout: 'painel' })

const { fetchApi } = useApi()
const { success: toastSuccess, error: toastError } = useToast()
const authStore = useAuthStore()

if (!authStore.isCorretor) {
  await navigateTo(authStore.getDashboardRoute())
}

interface RealtorLink {
  id: string
  code: string
  name: string
  email: string | null
  phone: string | null
  creci: string | null
  enabled: boolean
  notes?: string | null
  isPending?: boolean
  projects: { id: string; name: string; slug: string }[]
  _count: { leads: number }
}

const link = ref<RealtorLink | null>(null)
const loading = ref(true)
const requestingAccess = ref(false)
const copiedKey = ref<string | null>(null)

const baseUrl = computed(() => {
  if (import.meta.client) return window.location.origin
  return ''
})

function projectLink(slug: string) {
  return `${baseUrl.value}/${slug}?c=${link.value?.code}`
}

const isPendingLink = computed(() => {
  if (!link.value) return false
  if (link.value.isPending) return true
  return typeof link.value.notes === 'string' && link.value.notes.includes('[PENDING_APPROVAL_REQUEST]')
})

async function fetchLink() {
  loading.value = true
  try {
    const data = await fetchApi('/realtor-links/me')
    link.value = data as RealtorLink
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.status === 404) {
      link.value = null
    } else {
      toastError('Erro ao carregar seus links.')
    }
  } finally {
    loading.value = false
  }
}

async function copyLink(key: string, text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => { copiedKey.value = null }, 2000)
    toastSuccess('Link copiado!')
  } catch {
    toastError('Não foi possível copiar o link.')
  }
}

async function requestAccess() {
  requestingAccess.value = true
  try {
    const res = await fetchApi('/realtor-links/me/request-access', { method: 'POST' })
    const requestedLink = res?.realtorLink as RealtorLink | undefined
    if (requestedLink) {
      link.value = requestedLink
    }
    toastSuccess(res?.message || 'Solicitação enviada para a loteadora.')
  } catch (err: any) {
    toastError(err?.message || 'Não foi possível enviar sua solicitação no momento.')
  } finally {
    requestingAccess.value = false
  }
}

onMounted(fetchLink)
</script>

<template>
  <div class="space-y-6">
    <UiPageHeader title="Meus Links" description="Compartilhe seus links personalizados com clientes interessados nos loteamentos." />

    <UiLoadingState v-if="loading" />

    <UiEmptyState v-else-if="!link" title="Nenhum vínculo encontrado" description="Você ainda não foi vinculado a nenhuma loteadora. Entre em contato com seu gestor.">
      <template #icon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" class="text-p-text-muted">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </svg>
      </template>
      <template #action>
        <UiButton variant="primary" :disabled="requestingAccess" @click="requestAccess">
          {{ requestingAccess ? 'Enviando solicitação...' : 'Solicitar link para loteadora' }}
        </UiButton>
      </template>
    </UiEmptyState>

    <template v-else>
      <!-- Corretor info card -->
      <UiCard>
        <div class="flex flex-wrap items-center gap-8">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold uppercase tracking-wider text-p-text-muted">Seu código de corretor</span>
            <div class="flex items-center gap-2">
              <span class="font-mono text-base font-bold text-p-accent">{{ link.code }}</span>
              <button
                class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors"
                :class="copiedKey === 'code' ? 'border-p-accent/30 bg-p-accent/10 text-p-accent' : 'border-p-accent/20 bg-p-accent/5 text-p-accent hover:bg-p-accent/10'"
                @click="copyLink('code', link.code)"
              >
                <svg v-if="copiedKey !== 'code'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                {{ copiedKey === 'code' ? 'Copiado!' : 'Copiar' }}
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold uppercase tracking-wider text-p-text-muted">Leads recebidos</span>
            <span class="text-lg font-bold text-p-text">{{ link._count.leads }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold uppercase tracking-wider text-p-text-muted">Status</span>
            <UiBadge :variant="isPendingLink ? 'warning' : (link.enabled ? 'success' : 'danger')">
              {{ isPendingLink ? 'Pendente' : (link.enabled ? 'Ativo' : 'Inativo') }}
            </UiBadge>
          </div>
        </div>
        <div v-if="isPendingLink" class="mt-3 rounded-lg border border-p-warning/20 bg-p-warning/5 px-3.5 py-2 text-sm text-p-warning">
          Sua solicitação está pendente de aprovação pela loteadora.
        </div>
        <div v-if="!link.enabled && !isPendingLink" class="mt-3 rounded-lg border border-p-danger/20 bg-p-danger/5 px-3.5 py-2 text-sm text-p-danger">
          Seu vínculo está inativo. Entre em contato com seu gestor para reativar.
        </div>
        <div v-if="!link.enabled && !isPendingLink" class="mt-3">
          <UiButton variant="primary" :disabled="requestingAccess" @click="requestAccess">
            {{ requestingAccess ? 'Enviando solicitação...' : 'Solicitar reativação para loteadora' }}
          </UiButton>
        </div>
      </UiCard>

      <!-- How it works -->
      <div class="flex items-start gap-2.5 rounded-xl border border-p-accent/15 bg-p-accent/5 px-4 py-3 text-sm text-p-text-secondary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" class="mt-0.5 shrink-0 text-p-accent"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Quando um cliente acessar um loteamento pelo seu link e preencher o formulário de interesse, o lead será atribuído automaticamente a você.</span>
      </div>

      <!-- No projects -->
      <UiEmptyState v-if="isPendingLink" title="Solicitação em análise" description="Assim que sua solicitação for aprovada, seus links aparecerão aqui.">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" class="text-p-text-muted">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </template>
      </UiEmptyState>

      <UiEmptyState v-else-if="link.projects.length === 0" title="Nenhum loteamento vinculado" description="Você ainda não possui loteamentos ativos no seu perfil.">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" class="text-p-text-muted">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18"/>
          </svg>
        </template>
      </UiEmptyState>

      <!-- Project links -->
      <div v-else class="flex flex-col gap-3">
        <UiCard v-for="project in link.projects" :key="project.id" class="transition-colors hover:border-p-accent/20">
          <div class="mb-3 flex items-center gap-2.5">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-p-accent/10 text-p-accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h3 class="text-base font-bold text-p-text">{{ project.name }}</h3>
          </div>

          <div class="mb-2.5 flex items-center gap-2 rounded-lg bg-p-raised px-3 py-2">
            <span class="flex-1 truncate font-mono text-[13px] text-p-accent">{{ projectLink(project.slug) }}</span>
            <button
              class="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors"
              :class="copiedKey === project.id ? 'border-p-accent/30 bg-p-accent/10 text-p-accent' : 'border-p-accent/20 bg-p-accent/5 text-p-accent hover:bg-p-accent/10'"
              @click="copyLink(project.id, projectLink(project.slug))"
            >
              <svg v-if="copiedKey !== project.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
              {{ copiedKey === project.id ? 'Copiado!' : 'Copiar Link' }}
            </button>
          </div>

          <a
            :href="projectLink(project.slug)"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-[13px] text-p-text-muted transition-colors hover:text-p-accent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Abrir página do loteamento
          </a>
        </UiCard>
      </div>
    </template>
  </div>
</template>
