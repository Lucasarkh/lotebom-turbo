<template>
  <div class="space-y-6">
    <UiPageHeader title="Métricas da Equipe" description="Acompanhe o desempenho de seus corretores em tempo real.">
      <template #actions>
        <UiButton variant="primary" @click="openInviteModal">
          <i class="pi pi-user-plus mr-2"></i>Convidar Corretor
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Stats Overview -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <UiCard padding="md" class="!bg-gradient-to-br !from-p-accent !to-blue-700 !border-transparent">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white mb-3">
          <i class="pi pi-users"></i>
        </div>
        <div class="text-2xl font-extrabold text-white">{{ summary.totalRealtors }}</div>
        <CommonAppTooltip text="Total de corretores vinculados à sua equipe na plataforma." position="bottom"><div class="text-sm text-white/80">Corretores na equipe</div></CommonAppTooltip>
      </UiCard>
      <UiCard padding="md">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-500 mb-3">
          <i class="pi pi-target"></i>
        </div>
        <div class="text-2xl font-extrabold text-p-text">{{ summary.totalLeads }}</div>
        <CommonAppTooltip text="Soma de todos os leads gerados pela equipe." position="bottom"><div class="text-sm text-p-text-muted">Leads totais</div></CommonAppTooltip>
      </UiCard>
      <UiCard padding="md">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 mb-3">
          <i class="pi pi-eye"></i>
        </div>
        <div class="text-2xl font-extrabold text-p-text">{{ summary.totalSessions }}</div>
        <CommonAppTooltip text="Total de sessões (visitas) geradas por todos os corretores da equipe." position="bottom"><div class="text-sm text-p-text-muted">Acessos totais</div></CommonAppTooltip>
      </UiCard>
    </div>

    <!-- Metrics Table -->
    <div>
      <UiLoadingState v-if="loading" text="Carregando métricas..." />

      <UiEmptyState
        v-else-if="team.length === 0"
        title="Nenhum corretor na equipe"
        description="Convide corretores para começar a acompanhar métricas."
      >
        <template #action>
          <UiButton variant="primary" size="lg" @click="openInviteModal">Convidar Corretor</UiButton>
        </template>
      </UiEmptyState>

      <UiTable v-else>
        <template #head>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted">Corretor</th>
          <th class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Total de leads gerados pelo corretor." position="bottom">Leads</CommonAppTooltip></th>
          <th class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Total de visitas geradas através do link do corretor." position="bottom">Acessos</CommonAppTooltip></th>
          <th class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Taxa de conversão: percentual de acessos que resultaram em leads." position="bottom">Conversão</CommonAppTooltip></th>
          <th class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-p-text-muted">Link</th>
        </template>
        <tr v-for="r in team" :key="r.id" class="hover:bg-p-overlay/50">
          <td class="px-4 py-3.5">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-p-accent text-sm font-extrabold text-white">{{ r.name?.charAt(0) || '?' }}</div>
              <div>
                <div class="text-sm font-bold text-p-text">{{ r.name }}</div>
                <div class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Corretor Ativo</div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3.5 text-center">
            <UiBadge variant="success">{{ r.leads || 0 }} leads</UiBadge>
          </td>
          <td class="px-4 py-3.5 text-center">
            <span class="text-sm font-semibold text-p-text-secondary">{{ r.accesses || 0 }}</span>
          </td>
          <td class="px-4 py-3.5 text-center">
            <span class="text-sm italic text-p-text-muted">
              {{ r.accesses ? ((r.leads / r.accesses) * 100).toFixed(1) + '%' : '0%' }}
            </span>
          </td>
          <td class="px-4 py-3.5 text-center">
            <UiButton v-if="r.code" variant="ghost" size="sm" @click="copyRealtorLink(r)" title="Copiar link de divulgação">
              <i class="pi pi-copy"></i>
            </UiButton>
            <span v-else class="text-p-text-muted">&mdash;</span>
          </td>
        </tr>
      </UiTable>
    </div>

    <!-- Invite Modal -->
    <UiModal v-model="showInviteModal" title="Convidar Novo Corretor">
      <p class="text-sm text-p-text-secondary mb-5">
        O corretor receberá um link para criar sua conta e será automaticamente vinculado à sua equipe.
      </p>
      <form @submit.prevent="sendInvite">
        <UiInput
          v-model="inviteForm.email"
          type="email"
          label="Email do Corretor"
          placeholder="corretor@imobiliaria.com"
        />
        <div class="mt-5 flex justify-end gap-3">
          <UiButton variant="ghost" type="button" @click="showInviteModal = false">Cancelar</UiButton>
          <UiButton variant="primary" type="submit" :disabled="inviteSending">
            {{ inviteSending ? 'Enviando...' : 'Enviar Convite' }}
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const { get, post } = useApi()
const route = useRoute()
const toast = useToast()

const team = ref<any[]>([])
const loading = ref(true)
const showInviteModal = ref(false)
const inviteSending = ref(false)
const inviteForm = ref({ email: '', role: 'CORRETOR' })

const summary = computed(() => ({
  totalRealtors: team.value.length,
  totalLeads: team.value.reduce((acc, r) => acc + (r.leads || 0), 0),
  totalSessions: team.value.reduce((acc, r) => acc + (r.accesses || 0), 0),
}))

async function fetchMetrics() {
  loading.value = true
  try {
    const agencyId = route.query.agencyId as string
    const url = agencyId ? `/agencies/metrics?agencyId=${agencyId}` : '/agencies/metrics'
    const data = await get(url)
    team.value = data?.team || []
  } catch (err) {
    console.error(err)
    toast.error('Erro ao carregar métricas')
    team.value = []
  } finally {
    loading.value = false
  }
}

function openInviteModal() {
  inviteForm.value = { email: '', role: 'CORRETOR' }
  showInviteModal.value = true
}

async function sendInvite() {
  if (!inviteForm.value.email) {
    toast.error('Email é obrigatório')
    return
  }

  inviteSending.value = true
  try {
    const res = await post('/agencies/invite', inviteForm.value)
    toast.success('Convite enviado com sucesso!')

    const magicLink = `${window.location.origin}/aceitar-convite?token=${res.token}`
    await navigator.clipboard.writeText(magicLink)
    toast.info('Link de convite copiado para a área de transferência')

    showInviteModal.value = false
    fetchMetrics()
  } catch (err: any) {
    toast.error(err.message || 'Erro ao enviar convite')
  } finally {
    inviteSending.value = false
  }
}

function copyRealtorLink(r: any) {
  const url = `${window.location.origin}/?c=${r.code}`
  navigator.clipboard.writeText(url)
  toast.success('Link de divulgação copiado!')
}

onMounted(fetchMetrics)

definePageMeta({ layout: 'painel' })
</script>
