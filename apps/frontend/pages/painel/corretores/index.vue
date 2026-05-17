<script setup lang="ts">
import {
  getPasswordPolicyError,
  PASSWORD_POLICY_HINT
} from '~/utils/passwordPolicy'
const auth = useAuthStore()
const { get, post, patch, delete: del } = useApi()
const toast = useToast()
const authStore = useAuthStore()
const canWriteRealtors = computed(() => authStore.canWriteFeature('realtors'))
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição'
const canLoadProjectsCatalog = computed(() => {
  return !authStore.isLoteadora || !authStore.hasPanelRestrictions || authStore.canReadFeature('projects')
})
const router = useRouter()

type RealtorProject = {
  id: string
  name: string
  slug: string
}

type RealtorRecord = {
  id: string
  name: string
  phone: string
  creci?: string | null
  code: string
  projects?: RealtorProject[]
  user?: {
    email: string
  } | null
  isPending?: boolean
  notes?: string | null
}

type RealtorPayload = {
  name: string
  phone: string
  creci: string
  code: string
  projectIds: string[]
  accountEmail?: string
  accountPassword?: string
}

type ApiError = {
  data?: {
    message?: string
  }
}

const realtors = ref<RealtorRecord[]>([])
const projects = ref<RealtorProject[]>([])
const loading = ref(true)
const showModal = ref(false)
const showInviteModal = ref(false)
const editingRealtor = ref<RealtorRecord | null>(null)
const approvingId = ref<string | null>(null)

const emailError = ref('')
const codeError = ref('')
const emailAvailable = ref(false)
const codeAvailable = ref(false)
const emailLoading = ref(false)
const codeLoading = ref(false)

const inviteForm = ref({
  email: '',
  role: 'CORRETOR',
  agencyId: ''
})

let emailDebounceTimer: any = null
let codeDebounceTimer: any = null

const { maskPhone } = useMasks()

const form = ref({
  name: '',
  phone: '',
  creci: '',
  code: '',
  projectIds: [] as string[],
  accountEmail: '',
  accountPassword: ''
})
const accountPasswordError = computed(() => {
  if (editingRealtor.value || !form.value.accountPassword) return ''
  return getPasswordPolicyError(form.value.accountPassword)
})

watch(() => form.value.phone, (v) => { if (v) form.value.phone = maskPhone(v) })

watch(() => form.value.accountEmail, (email) => {
  if (editingRealtor.value) return
  emailError.value = ''
  emailAvailable.value = false
  if (!email || !email.includes('@')) return

  clearTimeout(emailDebounceTimer)
  emailDebounceTimer = setTimeout(async () => {
    emailLoading.value = true
    try {
      const res = await get(`/realtor-links/check-email?email=${email}`)
      if (!res.available) {
        emailError.value = 'Já existe um usuário com este email.'
      } else {
        emailAvailable.value = true
      }
    } catch {
      // Ignora erro na verificação
    } finally {
      emailLoading.value = false
    }
  }, 600)
})

watch(() => form.value.code, (code) => {
  codeError.value = ''
  codeAvailable.value = false
  if (!code) return

  clearTimeout(codeDebounceTimer)
  codeDebounceTimer = setTimeout(async () => {
    codeLoading.value = true
    try {
      const excludeId = editingRealtor.value?.id || ''
      const res = await get(`/realtor-links/check-code?code=${code}&excludeId=${excludeId}`)
      if (!res.available) {
        codeError.value = 'Este código já está sendo usado por outro corretor.'
      } else {
        codeAvailable.value = true
      }
    } catch {
      // Ignora erro na verificação
    } finally {
      codeLoading.value = false
    }
  }, 600)
})

const slugManuallyEdited = ref(false)

function onNameInput() {
  if (!slugManuallyEdited.value) {
    form.value.code = form.value.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}

async function fetchData() {
  loading.value = true
  try {
    const res = await get('/realtor-links')
    realtors.value = res
    if (canLoadProjectsCatalog.value) {
      const projectsRes = await get('/projects')
      projects.value = projectsRes.data
    } else {
      projects.value = []
    }
  } catch (error) {
    console.error('Error fetching realtors:', error)
    toast.error('Erro ao carregar dados')
  } finally {
    loading.value = false
  }
}

async function saveRealtor() {
  if (!canWriteRealtors.value) return
  if (emailError.value || codeError.value) {
    toast.error('Por favor, corrija os erros no formulário antes de salvar.')
    return
  }
  if (!editingRealtor.value && accountPasswordError.value) {
    toast.error(accountPasswordError.value)
    return
  }

  try {
    const payload: RealtorPayload = {
      ...form.value,
      phone: form.value.phone.replace(/\D/g, '')
    }

    if (!payload.accountEmail) {
      payload.accountEmail = undefined
    }
    if (!payload.accountPassword) {
      payload.accountPassword = undefined
    }

    if (editingRealtor.value) {
      payload.accountEmail = undefined
      payload.accountPassword = undefined
      await patch(`/realtor-links/${editingRealtor.value.id}`, payload)
      toast.success('Corretor atualizado com sucesso')
    } else {
      await post('/realtor-links', payload)
      toast.success('Corretor criado com sucesso')
    }
    showModal.value = false
    slugManuallyEdited.value = false
    emailError.value = ''
    codeError.value = ''
    emailAvailable.value = false
    codeAvailable.value = false
    fetchData()
  } catch (error) {
    toast.error((error as ApiError)?.data?.message || 'Erro ao salvar corretor')
  }
}

async function removeRealtor(id: string) {
  if (!canWriteRealtors.value) return
  if (!confirm('Tem certeza que deseja remover este corretor?')) return
  try {
    await del(`/realtor-links/${id}`)
    toast.success('Corretor removido')
    fetchData()
  } catch (error) {
    toast.error('Erro ao remover corretor')
  }
}

function openCreate() {
  if (!canWriteRealtors.value) return
  editingRealtor.value = null
  form.value = { name: '', phone: '', creci: '', code: '', projectIds: [], accountEmail: '', accountPassword: '' }
  slugManuallyEdited.value = false
  emailError.value = ''
  codeError.value = ''
  emailAvailable.value = false
  codeAvailable.value = false
  showModal.value = true
}

function openEdit(realtor: RealtorRecord) {
  if (!canWriteRealtors.value) return
  editingRealtor.value = realtor
  form.value = {
    name: realtor.name,
    phone: realtor.phone,
    creci: realtor.creci || '',
    code: realtor.code,
    projectIds: realtor.projects?.map((project) => project.id) || [],
    accountEmail: '',
    accountPassword: ''
  }
  slugManuallyEdited.value = true
  emailError.value = ''
  codeError.value = ''
  emailAvailable.value = false
  codeAvailable.value = false
  showModal.value = true
}

function getProjectNames(realtor: RealtorRecord) {
  if (!realtor.projects || realtor.projects.length === 0) return 'Todos'
  return realtor.projects.map((project) => project.name).join(', ')
}

function isPendingRealtor(realtor: any) {
  return realtor?.isPending || (typeof realtor?.notes === 'string' && realtor.notes.includes('[PENDING_APPROVAL_REQUEST]'))
}

async function approvePendingRealtor(realtor: any) {
  if (!canWriteRealtors.value) return
  approvingId.value = realtor.id
  try {
    await patch(`/realtor-links/${realtor.id}`, { enabled: true })
    toast.success('Solicitação aprovada. Corretor ativado com sucesso.')
    await fetchData()
  } catch (error) {
    toast.error((error as ApiError)?.data?.message || 'Erro ao aprovar solicitação do corretor')
  } finally {
    approvingId.value = null
  }
}

function copyLink(realtor: RealtorRecord, project: RealtorProject | null = null) {
  let url = ''
  const linkedProjects = realtor.projects ?? []

  if (project) {
    url = `${window.location.origin}/${project.slug}?c=${realtor.code}`
  } else if (linkedProjects.length > 0) {
    // If no specific project provided, copy the first one
    const p = linkedProjects[0]
    url = p ? `${window.location.origin}/${p.slug}?c=${realtor.code}` : `${window.location.origin}/p?c=${realtor.code}`
  } else {
    // Fallback if no projects
    url = `${window.location.origin}/p?c=${realtor.code}`
  }

  navigator.clipboard.writeText(url)
  toast.success('Link copiado!')
}

async function sendInvite() {
  if (!canWriteRealtors.value) return
  if (!inviteForm.value.email) {
    toast.error('O e-mail é obrigatório para o convite')
    return
  }

  try {
    await post('/agencies/invite', inviteForm.value)
    toast.success('Convite enviado por e-mail!')
    showInviteModal.value = false
    await fetchData() // Refresh
  } catch (err: any) {
    toast.error(err.data?.message || 'Erro ao processar convite')
  }
}

function openInvite() {
  if (!canWriteRealtors.value) return
  inviteForm.value.email = ''
  inviteForm.value.role = 'CORRETOR'
  // No agencyId = Direct broker if LOTEADORA, or the API will handle if it's IMOBILIARIA
  inviteForm.value.agencyId = ''
  showInviteModal.value = true
}

onMounted(fetchData)

definePageMeta({
  layout: 'painel'
})
</script>

<template>
  <div>
    <UiPageHeader title="Gestão de Corretores" description="Gerencie os links e CRECI dos corretores">
      <template #actions>
        <UiButton variant="outline" :disabled="!canWriteRealtors" :title="!canWriteRealtors ? writePermissionHint : undefined" @click="openInvite">
          Convidar Corretor via E-mail
        </UiButton>
        <UiButton variant="primary" :disabled="!canWriteRealtors" :title="!canWriteRealtors ? writePermissionHint : undefined" @click="openCreate">
          Vincular Corretor Manualmente
        </UiButton>
      </template>
    </UiPageHeader>

    <div v-if="loading" class="mt-6">
      <UiLoadingState text="Carregando..." />
    </div>

    <div v-else class="mt-6">
      <UiCard v-if="realtors.length === 0" padding="none">
        <UiEmptyState title="Nenhum corretor cadastrado" description="Cadastre corretores para gerenciar links de divulgação dos seus loteamentos." icon="👥" />
      </UiCard>

      <UiTable v-else>
        <template #head>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Nome</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">CRECI</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Projetos / Links</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Telefone</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Conta</th>
          <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-p-text-secondary">Ações</th>
        </template>
        <tr v-for="realtor in realtors" :key="realtor.id" class="cursor-pointer transition-colors hover:bg-p-overlay/50" @click="router.push(`/painel/corretores/${realtor.id}`)">
          <td class="px-4 py-3 text-sm text-p-text">
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">{{ realtor.name[0] }}</div>
              <strong>{{ realtor.name }}</strong>
            </div>
          </td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ realtor.creci || '-' }}</td>
          <td class="px-4 py-3 text-sm text-p-text">
            <div v-if="realtor.projects?.length" class="flex flex-col gap-2">
              <div v-for="p in realtor.projects" :key="p.id" class="flex items-center justify-between gap-3 rounded bg-p-raised px-2 py-1 text-[13px]">
                <span class="font-medium text-p-text">{{ p.name }}</span>
                <button class="rounded border border-p-border px-2 py-0.5 text-[11px] text-p-text-muted transition-colors hover:border-blue-500 hover:text-blue-500" @click.stop="copyLink(realtor, p)" title="Copiar Link deste projeto">
                  Copiar Link
                </button>
              </div>
            </div>
            <span v-else class="text-p-text-muted">Nenhum projeto selecionado</span>
          </td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ realtor.phone }}</td>
          <td class="px-4 py-3 text-sm">
            <div class="flex flex-col items-start gap-2">
              <UiBadge v-if="isPendingRealtor(realtor)" variant="warning">Pendente</UiBadge>
              <UiBadge v-else-if="realtor.user" variant="success">{{ realtor.user.email }}</UiBadge>
              <UiBadge v-else variant="neutral">Sem conta</UiBadge>
              <button
                v-if="isPendingRealtor(realtor)"
                class="rounded border border-amber-400/35 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 transition-colors hover:border-amber-400 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!canWriteRealtors || approvingId === realtor.id"
                :title="!canWriteRealtors ? writePermissionHint : undefined"
                @click.stop="approvePendingRealtor(realtor)"
              >
                {{ approvingId === realtor.id ? 'Aprovando...' : 'Aprovar' }}
              </button>
            </div>
          </td>
          <td class="px-4 py-3 text-sm text-right">
            <div class="flex items-center justify-end gap-2">
              <button class="rounded p-1 text-p-text-muted transition-colors hover:bg-p-overlay hover:text-blue-500" :disabled="!canWriteRealtors" @click.stop="openEdit(realtor)" :title="!canWriteRealtors ? writePermissionHint : 'Editar'">
                <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="rounded p-1 text-p-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500" :disabled="!canWriteRealtors" @click.stop="removeRealtor(realtor.id)" :title="!canWriteRealtors ? writePermissionHint : 'Remover'">
                <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      </UiTable>
    </div>

    <!-- Create/Edit Modal -->
    <UiModal v-model="showModal" :title="editingRealtor ? 'Editar Corretor' : 'Novo Corretor'" size="lg">
      <form @submit.prevent="saveRealtor">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Nome do Corretor <span class="text-red-500">*</span></label>
            <input v-model="form.name" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" placeholder="Nome completo" required @input="onNameInput">
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Código de Indicação (Slug) <span class="text-red-500">*</span></label>
            <div class="relative">
              <input v-model="form.code" type="text" class="w-full rounded-lg border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:outline-none focus:ring-2 focus:ring-p-accent/30" :class="codeError ? 'border-red-500' : codeAvailable ? 'border-green-500 pr-8' : 'border-p-border focus:border-p-accent'" placeholder="joao-corretor" required>
              <span v-if="codeAvailable" class="absolute right-2.5 top-1/2 -translate-y-1/2 font-bold text-green-500">&#10003;</span>
            </div>
            <p v-if="codeError" class="mt-1 text-xs text-red-500">{{ codeError }}</p>
            <p v-else-if="codeLoading" class="mt-1 text-xs text-p-text-muted">Verificando...</p>
            <p v-else class="mt-1 text-xs text-p-text-muted">Usado no link: ?c={{ form.code || '...' }}</p>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">CRECI</label>
            <input v-model="form.creci" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" placeholder="Ex: 12345-F">
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Telefone (WhatsApp) <span class="text-red-500">*</span></label>
            <input v-model="form.phone" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" placeholder="(DD) 9XXXX-XXXX" required>
          </div>
        </div>

        <!-- Account credentials section (only for new corretores) -->
        <div v-if="!editingRealtor" class="mt-6 border-t border-p-border pt-6">
          <h3 class="text-base font-semibold text-p-text">Conta de Acesso</h3>
          <p class="mb-3 text-xs text-p-text-muted">Crie uma conta para o corretor acessar o painel e acompanhar seus leads e campanhas.</p>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Email de Acesso *</label>
              <div class="relative">
                <input v-model="form.accountEmail" type="email" class="w-full rounded-lg border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:outline-none focus:ring-2 focus:ring-p-accent/30" :class="emailError ? 'border-red-500' : emailAvailable ? 'border-green-500 pr-8' : 'border-p-border focus:border-p-accent'" placeholder="corretor@email.com" required autocomplete="off">
                <span v-if="emailAvailable" class="absolute right-2.5 top-1/2 -translate-y-1/2 font-bold text-green-500">&#10003;</span>
              </div>
              <p v-if="emailError" class="mt-1 text-xs text-red-500">{{ emailError }}</p>
              <p v-else-if="emailLoading" class="mt-1 text-xs text-p-text-muted">Verificando...</p>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Senha Inicial *</label>
              <AppPasswordInput v-model="form.accountPassword" :placeholder="PASSWORD_POLICY_HINT" required autocomplete="new-password" />
              <p v-if="accountPasswordError" class="mt-1 text-xs text-red-500">{{ accountPasswordError }}</p>
              <p class="mt-1 text-xs text-p-text-muted">O corretor poderá alterar depois no painel.</p>
            </div>
          </div>
        </div>

        <div v-if="editingRealtor && editingRealtor.user" class="mt-6 border-t border-p-border pt-6">
          <h3 class="text-base font-semibold text-p-text">Conta de Acesso</h3>
          <p class="text-xs text-p-text-muted">{{ editingRealtor.user.email }} — Conta ativa</p>
        </div>

        <div class="mt-6">
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Empreendimentos Vinculados</label>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label v-for="p in projects" :key="p.id" class="flex items-center gap-2 rounded-lg border border-p-border bg-p-raised px-3 py-2 text-sm text-p-text-secondary cursor-pointer hover:bg-p-overlay">
              <input type="checkbox" :value="p.id" v-model="form.projectIds" class="accent-p-accent">
              <span>{{ p.name }}</span>
            </label>
          </div>
          <p class="mt-1 text-xs text-p-text-muted" v-if="projects.length === 0">Nenhum empreendimento cadastrado.</p>
          <p class="mt-1 text-xs text-p-text-muted" v-else>Selecione os empreendimentos que este corretor poderá divulgar.</p>
        </div>

      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="showModal = false">Cancelar</UiButton>
          <UiButton variant="primary" :disabled="!canWriteRealtors" :title="!canWriteRealtors ? writePermissionHint : undefined" @click="saveRealtor">Salvar</UiButton>
        </div>
      </template>
    </UiModal>

    <!-- Invite Modal -->
    <UiModal v-model="showInviteModal" title="Convidar Corretor">
      <p class="mb-5 text-sm text-p-text-muted">Envie um e-mail de convite para o corretor se cadastrar sozinho.</p>
      <form @submit.prevent="sendInvite">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">E-mail do Corretor</label>
          <input
            v-model="inviteForm.email"
            type="email"
            class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30"
            placeholder="email@corretor.com.br"
            required
          >
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="showInviteModal = false">Cancelar</UiButton>
          <UiButton variant="primary" :disabled="!canWriteRealtors || !inviteForm.email" :title="!canWriteRealtors ? writePermissionHint : undefined" @click="sendInvite">Enviar Convite</UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>
