<template>
  <div>
    <UiPageHeader :title="`Olá, ${authStore.user?.name}`" description="Bem-vindo ao seu painel de corretor" />

    <UiLoadingState v-if="loading" />

    <UiEmptyState
      v-else-if="!realtorLink"
      title="Link não configurado"
      description="Você ainda não possui um link de divulgação associado à sua conta. Entre em contato com o administrador da sua loteadora."
      icon="🔗"
    />

    <template v-else>
      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <UiCard padding="md">
          <div class="text-2xl font-bold text-p-text">{{ realtorLink._count.leads }}</div>
          <CommonAppTooltip text="Total de leads captados através do seu link de divulgação." position="bottom"><div class="mt-0.5 text-sm text-p-text-muted">Total de Leads</div></CommonAppTooltip>
        </UiCard>
        <UiCard padding="md">
          <div class="text-2xl font-bold text-p-text">{{ activeCampaigns.length }}</div>
          <CommonAppTooltip text="Número de campanhas de marketing atualmente ativas e vinculadas a você." position="bottom"><div class="mt-0.5 text-sm text-p-text-muted">Campanhas Ativas</div></CommonAppTooltip>
        </UiCard>
        <UiCard padding="md">
          <div class="text-2xl font-bold text-p-text">{{ recentLeads.length }}</div>
          <CommonAppTooltip text="Leads captados recentemente através dos seus links." position="bottom"><div class="mt-0.5 text-sm text-p-text-muted">Leads Recentes</div></CommonAppTooltip>
        </UiCard>
      </div>

      <UiCard class="mt-8">
        <h2 class="mb-4 text-lg font-semibold text-p-text">Seu Link de Divulgação</h2>
        <p class="mb-4 text-sm text-p-text-secondary">Use este link para divulgar os projetos. Qualquer lead gerado através dele será atribuído a você.</p>

        <div v-for="p in realtorLink.projects" :key="p.id" class="mb-4 flex items-center justify-between rounded-lg border border-p-border bg-p-overlay/50 p-4">
          <div class="min-w-0 flex-1">
            <strong class="text-sm text-p-text">{{ p.name }}</strong>
            <div class="mt-1 truncate font-mono text-sm text-p-accent">{{ getProjectUrl(p.slug) }}</div>
          </div>
          <UiButton variant="outline" size="sm" class="ml-4 shrink-0" @click="copyToClipboard(getProjectUrl(p.slug))">
            Copiar Link
          </UiButton>
        </div>
      </UiCard>

      <div class="mt-8">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-p-text">Suas Campanhas</h2>
          <UiButton variant="primary" size="sm" to="/painel/campanhas">Gerenciar Campanhas</UiButton>
        </div>
        <UiEmptyState
          v-if="campaigns.length === 0"
          title="Nenhuma campanha"
          description="Nenhuma campanha criada ainda."
        />
        <UiTable v-else>
          <template #head>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Nome</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Fonte (UTM)</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Status</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Data</th>
          </template>
          <tr v-for="c in campaigns.slice(0, 5)" :key="c.id">
            <td class="px-4 py-3 text-sm text-p-text">{{ c.name }}</td>
            <td class="px-4 py-3 text-sm text-p-text-secondary">{{ c.utmSource }}</td>
            <td class="px-4 py-3"><UiBadge :variant="c.active ? 'success' : 'danger'">{{ c.active ? 'Ativa' : 'Pausada' }}</UiBadge></td>
            <td class="px-4 py-3 text-sm text-p-text-secondary">{{ formatDate(c.createdAt) }}</td>
          </tr>
        </UiTable>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { formatDateToBrasilia } from '~/utils/date'

const authStore = useAuthStore()
const { fetchApi } = useApi()
const toast = useToast()

const loading = ref(true)
const realtorLink = ref(null)
const campaigns = ref([])
const recentLeads = ref([])

const activeCampaigns = computed(() => campaigns.value.filter((c) => c.active))

async function loadData() {
  loading.value = true
  try {
    realtorLink.value = await fetchApi('/realtor-links/me')
    const [leadsData, campaignsData] = await Promise.all([
      fetchApi('/leads'),
      fetchApi('/campaigns')
    ])
    recentLeads.value = leadsData.data || []
    campaigns.value = campaignsData.data || []
  } catch (err) {
    console.error('Error loading dashboard data:', err)
  } finally {
    loading.value = false
  }
}

function getProjectUrl(slug) {
  if (!realtorLink.value) return ''
  const base = `${window.location.origin}/${slug}`
  return `${base}?c=${realtorLink.value.code}`
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
  toast.success('Link copiado para a área de transferência!')
}

function formatDate(date) {
  return formatDateToBrasilia(date)
}

onMounted(loadData)
</script>
