<script setup lang="ts">
import { ref, onMounted } from 'vue'
const { get, post, put } = useApi()
const toast = useToast()

const agencies = ref<any[]>([])
const search = ref('')
const meta = ref({
  total: 0,
  page: 1,
  limit: 12,
  totalPages: 1
})
const loading = ref(true)
const showModal = ref(false)
const showInviteModal = ref(false)
const editingAgency = ref(null)

const form = ref({
  name: '',
  email: '',
  phone: '',
  creci: ''
})

const inviteForm = ref({
  email: '',
  role: 'IMOBILIARIA',
  agencyId: ''
})

let searchTimeout: any = null
async function fetchAgencies(page = 1) {
  loading.value = true
  try {
    const query = new URLSearchParams({
      page: page.toString(),
      limit: '12',
      search: search.value
    }).toString()

    const res: any = await get(`/agencies?${query}`)
    agencies.value = res.items || []
    meta.value = res.meta || meta.value
  } catch (err) {
    console.error('Fetch error:', err)
    toast.error('Erro ao conectar com o servidor')
    agencies.value = []
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchAgencies(1)
  }, 400)
}

const goToPage = (page: number) => {
  if (page < 1 || page > meta.value.totalPages) return
  fetchAgencies(page)
}

async function saveAgency() {
  if (!form.value.name || !form.value.email) {
    toast.error('Nome e Email são obrigatórios')
    return
  }

  try {
    if (editingAgency.value) {
      await put(`/agencies/${(editingAgency.value as any).id}`, form.value)
      toast.success('Imobiliária atualizada com sucesso')
    } else {
      await post('/agencies', form.value)
      toast.success('Imobiliária cadastrada com sucesso')
    }
    showModal.value = false
    await fetchAgencies()
  } catch (err) {
    toast.error('Ocorreu um erro ao salvar os dados')
  }
}

async function sendInvite() {
  if (!inviteForm.value.email) {
    toast.error('O e-mail é obrigatório para o convite')
    return
  }

  try {
    await post('/agencies/invite', inviteForm.value)
    toast.success('Convite enviado por e-mail!')
    showInviteModal.value = false
    await fetchAgencies() // Refresh to show link button
  } catch (err: any) {
    toast.error(err.data?.message || 'Erro ao processar convite')
  }
}

async function copyInviteLink(agency: any) {
  let token = agency.invites?.[0]?.token

  if (!token) {
    try {
      const res = await post('/agencies/invite', {
        email: agency.email,
        role: 'IMOBILIARIA',
        agencyId: agency.id
      })
      token = res.token
      await fetchAgencies()
    } catch (err: any) {
      toast.error('Erro ao gerar link de convite')
      return
    }
  }

  const magicLink = `${window.location.origin}/aceitar-convite?token=${token}`
  try {
    await navigator.clipboard.writeText(magicLink)
    toast.success('Link de convite copiado!')
  } catch {
    toast.error('Erro ao copiar para a área de transferência')
  }
}

function openEdit(agency: any) {
  editingAgency.value = agency
  form.value = {
    name: agency.name,
    email: agency.email,
    phone: agency.phone || '',
    creci: agency.creci || ''
  }
  showModal.value = true
}

function openInvite(agency: any) {
  inviteForm.value.agencyId = agency.id
  inviteForm.value.email = agency.email // Auto-populate with registered email
  inviteForm.value.role = 'IMOBILIARIA'
  showInviteModal.value = true
}

onMounted(fetchAgencies)

definePageMeta({
  layout: 'painel'
})
</script>

<template>
  <div>
    <UiPageHeader title="Imobiliárias" description="Gestão centralizada de parceiros e canais de venda.">
      <template #actions>
        <div class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div class="relative min-w-[250px]">
            <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-p-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              v-model="search"
              type="text"
              placeholder="Buscar por nome, email ou CRECI..."
              class="w-full rounded-lg border border-p-border bg-p-raised py-2.5 pl-9 pr-3.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30"
              @input="onSearchInput"
            >
          </div>
          <UiButton variant="primary" @click="editingAgency = null; form = { name: '', email: '', phone: '', creci: '' }; showModal = true">
            + Nova Imobiliária
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <!-- Loading -->
    <div v-if="loading" class="mt-6">
      <UiLoadingState />
    </div>

    <!-- Empty State -->
    <div v-else-if="agencies.length === 0" class="mt-6">
      <UiCard>
        <UiEmptyState title="Expanda sua rede de vendas" description="Conecte-se com imobiliárias parceiras para multiplicar o alcance dos seus empreendimentos.">
          <template #action>
            <UiButton variant="primary" @click="showModal = true">Começar Agora</UiButton>
          </template>
        </UiEmptyState>
      </UiCard>
    </div>

    <!-- Agency Cards Grid -->
    <div v-else class="mt-6">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <UiCard v-for="agency in agencies" :key="agency.id">
          <!-- Top: Icon + Status -->
          <div class="mb-3 flex items-center justify-between">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl border border-p-border" :class="agency.isPending ? 'bg-amber-500/10' : 'bg-blue-500/10'">
              <i v-if="agency.isPending" class="pi pi-clock text-amber-400"></i>
              <i v-else class="pi pi-building text-blue-400"></i>
            </div>
            <UiBadge :variant="agency.isActive ? 'success' : 'danger'" size="sm">
              {{ agency.isActive ? 'Ativa' : 'Inativa' }}
            </UiBadge>
          </div>

          <!-- Name + Email -->
          <h3 class="truncate text-lg font-extrabold text-p-text" :title="agency.name">{{ agency.name }}</h3>
          <p class="mb-4 truncate text-sm text-p-text-muted">{{ agency.email }}</p>

          <!-- Stats Row -->
          <div class="mb-4 flex items-center gap-6 rounded-xl border border-p-border bg-p-raised px-4 py-3">
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-p-text-muted">EQUIPE</span>
              <span class="text-sm font-extrabold text-p-text">{{ agency._count?.realtors || 0 }}</span>
            </div>
            <div class="h-7 w-px bg-p-border"></div>
            <div class="flex min-w-0 flex-col gap-0.5">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-p-text-muted">CRECI</span>
              <span class="truncate text-sm font-extrabold text-p-text">{{ agency.creci || '---' }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3">
            <UiButton variant="secondary" size="sm" @click="openEdit(agency)">Ajustar</UiButton>
            <template v-if="agency.isPending">
              <button class="flex h-10 w-10 items-center justify-center rounded-xl border border-p-border bg-blue-500 text-white transition-colors hover:bg-blue-600" @click="openInvite(agency)" title="Enviar E-mail">
                <i class="pi pi-envelope"></i>
              </button>
              <button class="flex h-10 w-10 items-center justify-center rounded-xl border border-p-border bg-p-raised text-p-text-secondary transition-colors hover:bg-p-overlay hover:text-p-text" @click="copyInviteLink(agency)" title="Copiar Link">
                <i class="pi pi-link"></i>
              </button>
            </template>
            <div v-else class="flex h-10 w-10 items-center justify-center text-xl text-blue-500" title="Imobiliária Ativa">
              <i class="pi pi-check-circle"></i>
            </div>
          </div>
        </UiCard>
      </div>

      <!-- Pagination -->
      <div v-if="meta.totalPages > 1" class="mt-8 flex justify-center">
        <div class="flex items-center gap-2 rounded-2xl border border-p-border bg-p-raised p-2">
          <button
            class="flex h-[38px] w-[38px] items-center justify-center rounded-xl text-p-text-muted transition-colors hover:bg-p-overlay hover:text-p-text disabled:cursor-not-allowed disabled:opacity-30"
            :disabled="meta.page === 1"
            @click="goToPage(meta.page - 1)"
          >
            <i class="pi pi-chevron-left"></i>
          </button>
          <button
            v-for="p in meta.totalPages"
            :key="p"
            class="flex h-[38px] w-[38px] items-center justify-center rounded-xl text-sm font-bold transition-colors"
            :class="meta.page === p ? 'bg-p-overlay text-p-accent shadow-sm' : 'text-p-text-muted hover:bg-p-overlay hover:text-p-text'"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="flex h-[38px] w-[38px] items-center justify-center rounded-xl text-p-text-muted transition-colors hover:bg-p-overlay hover:text-p-text disabled:cursor-not-allowed disabled:opacity-30"
            :disabled="meta.page === meta.totalPages"
            @click="goToPage(meta.page + 1)"
          >
            <i class="pi pi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Agency Form Modal -->
    <UiModal v-model="showModal" :title="editingAgency ? 'Editar Imobiliária' : 'Nova Imobiliária'">
      <form @submit.prevent="saveAgency">
        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Nome Fantasia</label>
            <input v-model="form.name" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" placeholder="Ex: Central Brokers S/A">
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">E-mail Corporativo</label>
            <input v-model="form.email" type="email" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" placeholder="contato@empresa.com.br">
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Telefone</label>
              <input v-model="form.phone" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" placeholder="(00) 00000-0000">
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">CRECI Jurídico</label>
              <input v-model="form.creci" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" placeholder="00.000-J">
            </div>
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="showModal = false">Cancelar</UiButton>
          <UiButton variant="primary" @click="saveAgency">Salvar Registro</UiButton>
        </div>
      </template>
    </UiModal>

    <!-- Invite Modal -->
    <UiModal v-model="showInviteModal" title="Enviar Convite">
      <div class="mb-5 flex items-start gap-3 rounded-lg border border-p-accent/15 bg-p-accent/5 px-4 py-3 text-sm text-p-text-secondary">
        <span class="text-lg">&#128161;</span>
        <p>Este link permitirá que o administrador defina sua credencial de acesso exclusiva para esta imobiliária.</p>
      </div>
      <form @submit.prevent="sendInvite">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">E-mail do Destinatário</label>
          <input v-model="inviteForm.email" type="email" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" placeholder="admin@parceiro.com.br">
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="showInviteModal = false">Cancelar</UiButton>
          <UiButton variant="primary" @click="sendInvite">Gerar Link &amp; Enviar</UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>
