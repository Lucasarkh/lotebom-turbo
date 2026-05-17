<script setup lang="ts">

const { fetchApi } = useApi()
const { success: toastSuccess, error: toastError } = useToast()
const authStore = useAuthStore()
const canWriteSignupLinks = computed(() => authStore.canWriteFeature('signupLinks'))
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição'
const canLoadProjectsCatalog = computed(() => {
  return !authStore.isLoteadora || !authStore.hasPanelRestrictions || authStore.canReadFeature('projects')
})

if (!authStore.isLoteadora || !authStore.canReadFeature('signupLinks')) {
  await navigateTo(authStore.getDashboardRoute())
}

interface InviteCode {
  id: string
  code: string
  description: string | null
  role: string
  projectAssignmentMode: 'NONE' | 'ALL' | 'SELECTED'
  projects: Array<{ id: string; name: string; slug: string }>
  isActive: boolean
  usageCount: number
  maxUses: number | null
  expiresAt: string | null
  createdAt: string
}

interface ProjectOption {
  id: string
  name: string
  slug: string
}

const codes = ref<InviteCode[]>([])
const projects = ref<ProjectOption[]>([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const copiedId = ref<string | null>(null)
const editingCodeId = ref<string | null>(null)
const originalExpiresAt = ref('')
const today = computed(() => getTodayInBrasilia())
const expiresAtMin = computed(() => {
  if (form.value.expiresAt && form.value.expiresAt < today.value) {
    return form.value.expiresAt
  }
  return today.value
})

const form = ref({
  description: '',
  role: 'CORRETOR' as 'CORRETOR' | 'IMOBILIARIA',
  projectAssignmentMode: 'NONE' as 'NONE' | 'ALL' | 'SELECTED',
  projectIds: [] as string[],
  maxUses: '',
  expiresAt: ''
})

const baseUrl = computed(() => {
  if (import.meta.client) {
    return window.location.origin
  }
  return ''
})

function registrationLink(code: string) {
  return `${baseUrl.value}/cadastro/${code}`
}

async function fetchCodes() {
  loading.value = true
  try {
    const inviteCodes = await fetchApi('/agencies/invite-codes')

    const data = inviteCodes
    codes.value = Array.isArray(data) ? data : []

    if (canLoadProjectsCatalog.value) {
      const projectsResponse = await fetchApi('/projects?limit=100')
      projects.value = Array.isArray(projectsResponse?.data) ? projectsResponse.data : []
    } else {
      projects.value = []
    }
  } catch (err: any) {
    console.error('Failed to load invite codes:', err?.message)
    toastError(err?.message || 'Erro ao carregar links de cadastro.')
    codes.value = []
    projects.value = []
  } finally {
    loading.value = false
  }
}

function openModal() {
  editingCodeId.value = null
  originalExpiresAt.value = ''
  form.value = {
    description: '',
    role: 'CORRETOR',
    projectAssignmentMode: 'NONE',
    projectIds: [],
    maxUses: '',
    expiresAt: ''
  }
  showModal.value = true
}

function openEditModal(code: InviteCode) {
  editingCodeId.value = code.id
  originalExpiresAt.value = code.expiresAt ? new Date(code.expiresAt).toISOString().slice(0, 10) : ''
  form.value = {
    description: code.description || '',
    role: code.role as 'CORRETOR' | 'IMOBILIARIA',
    projectAssignmentMode: code.role === 'CORRETOR' ? code.projectAssignmentMode : 'NONE',
    projectIds: code.role === 'CORRETOR' && code.projectAssignmentMode === 'SELECTED'
      ? code.projects.map(project => project.id)
      : [],
    maxUses: code.maxUses ? String(code.maxUses) : '',
    expiresAt: code.expiresAt ? new Date(code.expiresAt).toISOString().slice(0, 10) : ''
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingCodeId.value = null
  originalExpiresAt.value = ''
}

watch(() => form.value.role, (role) => {
  if (role !== 'CORRETOR') {
    form.value.projectAssignmentMode = 'NONE'
    form.value.projectIds = []
  }
})

watch(() => form.value.projectAssignmentMode, (mode) => {
  if (mode !== 'SELECTED') {
    form.value.projectIds = []
  }
})

async function saveCode() {
  if (form.value.role === 'CORRETOR' && form.value.projectAssignmentMode === 'SELECTED' && form.value.projectIds.length === 0) {
    toastError('Selecione ao menos um empreendimento ou escolha "Nenhum" ou "Todos".')
    return
  }

  if (
    form.value.expiresAt &&
    form.value.expiresAt < today.value &&
    form.value.expiresAt !== originalExpiresAt.value
  ) {
    toastError('A expiração deve ser hoje ou uma data futura.')
    return
  }

  saving.value = true
  try {
    const payload: any = {
      description: form.value.description || undefined,
      projectAssignmentMode: form.value.role === 'CORRETOR' ? form.value.projectAssignmentMode : undefined,
      projectIds: form.value.role === 'CORRETOR' && form.value.projectAssignmentMode === 'SELECTED'
        ? form.value.projectIds
        : undefined,
      maxUses: form.value.maxUses ? parseInt(form.value.maxUses) : undefined,
      expiresAt: form.value.expiresAt || undefined
    }
    if (editingCodeId.value) {
      await fetchApi(`/agencies/invite-codes/${editingCodeId.value}`, {
        method: 'PATCH',
        body: payload
      })
      toastSuccess('Link de cadastro atualizado com sucesso.')
    } else {
      payload.role = form.value.role
      await fetchApi('/agencies/invite-codes', { method: 'POST', body: payload })
      toastSuccess('Link de cadastro criado com sucesso.')
    }
    closeModal()
    fetchCodes()
  } catch (err: any) {
    toastError(err.message || (editingCodeId.value ? 'Erro ao atualizar link.' : 'Erro ao criar link.'))
  } finally {
    saving.value = false
  }
}

async function toggleActive(code: InviteCode) {
  try {
    await fetchApi(`/agencies/invite-codes/${code.id}`, {
      method: 'PATCH',
      body: { isActive: !code.isActive }
    })
    code.isActive = !code.isActive
    toastSuccess(code.isActive ? 'Link ativado.' : 'Link desativado.')
  } catch {
    toastError('Erro ao atualizar link.')
  }
}

async function deleteCode(code: InviteCode) {
  if (!confirm(`Excluir o link "${code.description || code.code}"? Esta ação não pode ser desfeita.`)) return
  try {
    await fetchApi(`/agencies/invite-codes/${code.id}`, { method: 'DELETE' })
    codes.value = codes.value.filter(c => c.id !== code.id)
    toastSuccess('Link excluído.')
  } catch {
    toastError('Erro ao excluir link.')
  }
}

async function copyLink(code: InviteCode) {
  const link = registrationLink(code.code)
  try {
    await navigator.clipboard.writeText(link)
    copiedId.value = code.id
    setTimeout(() => { copiedId.value = null }, 2000)
  } catch {
    toastError('Não foi possível copiar o link.')
  }
}

function roleLabel(role: string) {
  return role === 'IMOBILIARIA' ? 'Imobiliária' : 'Corretor'
}

function assignmentLabel(code: InviteCode) {
  if (code.role !== 'CORRETOR') return 'Nao se aplica para imobiliarias.'
  if (code.projectAssignmentMode === 'ALL') return 'Vincula automaticamente em todos os empreendimentos.'
  if (code.projectAssignmentMode === 'SELECTED') {
    if (!code.projects?.length) return 'Vincula automaticamente em projetos selecionados.'
    const firstProject = code.projects[0]
    return code.projects.length === 1
      ? `Vincula automaticamente em ${firstProject?.name || 'um empreendimento'}.`
      : `Vincula automaticamente em ${code.projects.length} empreendimentos selecionados.`
  }
  return 'Nao vincula o corretor a nenhum empreendimento automaticamente.'
}

function assignmentProjectsText(code: InviteCode) {
  if (code.projectAssignmentMode !== 'SELECTED' || !code.projects?.length) return ''
  return code.projects.map(project => project.name).join(', ')
}

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('pt-BR')
}

onMounted(fetchCodes)

definePageMeta({
  layout: 'painel'
})
</script>

<template>
  <div>
    <UiPageHeader title="Links de Cadastro" description="Compartilhe links para que imobiliárias e corretores se cadastrem e se vinculem automaticamente à sua loteadora.">
      <template #actions>
        <UiButton variant="primary" :disabled="!canWriteSignupLinks" :title="!canWriteSignupLinks ? writePermissionHint : undefined" @click="openModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Link
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Info box -->
    <div class="mt-6 flex items-start gap-2.5 rounded-lg border border-p-accent/15 bg-p-accent/5 px-4 py-3 text-sm text-p-text-secondary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" class="mt-0.5 shrink-0 text-p-accent"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>Qualquer pessoa com o link pode se cadastrar e acessar o painel vinculado à sua conta. Desative links não utilizados para manter o controle de acesso.</span>
    </div>

    <div v-if="loading" class="mt-6">
      <UiLoadingState />
    </div>

    <div v-else-if="codes.length === 0" class="mt-6">
      <UiCard>
        <UiEmptyState title="Nenhum link criado" description="Crie seu primeiro link de cadastro para compartilhar com imobiliárias e corretores.">
          <template #icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32" class="text-p-text-muted">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
          </template>
          <template #action>
            <UiButton variant="primary" :disabled="!canWriteSignupLinks" :title="!canWriteSignupLinks ? writePermissionHint : undefined" @click="openModal">Criar Link</UiButton>
          </template>
        </UiEmptyState>
      </UiCard>
    </div>

    <div v-else class="mt-6 flex flex-col gap-3">
      <UiCard v-for="code in codes" :key="code.id" :class="{ 'opacity-60': !code.isActive }">
        <div class="mb-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider" :class="code.role === 'IMOBILIARIA' ? 'border-purple-500/20 bg-purple-500/10 text-purple-400' : 'border-blue-500/20 bg-blue-500/10 text-blue-400'">
              {{ roleLabel(code.role) }}
            </span>
            <UiBadge v-if="!code.isActive" variant="danger">Inativo</UiBadge>
          </div>
          <div class="flex items-center gap-1.5">
            <button class="flex h-[30px] w-[30px] items-center justify-center rounded-md text-p-text-muted transition-colors hover:bg-p-overlay hover:text-p-text" :disabled="!canWriteSignupLinks" :title="!canWriteSignupLinks ? writePermissionHint : 'Editar'" @click="openEditModal(code)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            </button>
            <button class="flex h-[30px] w-[30px] items-center justify-center rounded-md text-p-text-muted transition-colors hover:bg-p-overlay hover:text-p-text" :disabled="!canWriteSignupLinks" :title="!canWriteSignupLinks ? writePermissionHint : (code.isActive ? 'Desativar' : 'Ativar')" @click="toggleActive(code)">
              <svg v-if="code.isActive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2v10"/><path d="M5.636 5.636a9 9 0 1 0 12.728 12.728"/></svg>
            </button>
            <button class="flex h-[30px] w-[30px] items-center justify-center rounded-md text-p-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400" :disabled="!canWriteSignupLinks" :title="!canWriteSignupLinks ? writePermissionHint : 'Excluir'" @click="deleteCode(code)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </div>

        <div class="text-sm text-p-text-secondary">{{ code.description || 'Sem descrição' }}</div>

        <div v-if="code.role === 'CORRETOR'" class="mt-3 flex flex-col gap-1 rounded-md border border-p-border bg-p-raised p-2.5 text-[13px] text-p-text-secondary">
          <strong class="text-p-text">Atribuição automática:</strong>
          <span>{{ assignmentLabel(code) }}</span>
          <small v-if="code.projectAssignmentMode === 'SELECTED' && code.projects?.length" class="text-p-text-muted">
            {{ assignmentProjectsText(code) }}
          </small>
        </div>

        <div class="mt-3 flex items-center gap-2 rounded-md bg-black/20 px-3 py-2">
          <span class="flex-1 truncate font-mono text-[13px] text-p-accent">{{ registrationLink(code.code) }}</span>
          <button class="flex shrink-0 items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold transition-colors" :class="copiedId === code.id ? 'border-p-accent/20 bg-p-accent/15 text-p-accent' : 'border-p-accent/20 bg-p-accent/5 text-p-accent hover:bg-p-accent/10'" @click="copyLink(code)">
            <svg v-if="copiedId !== code.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
            {{ copiedId === code.id ? 'Copiado!' : 'Copiar' }}
          </button>
        </div>

        <div class="mt-3 flex items-center gap-4 text-[13px] text-p-text-muted">
          <span class="flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            {{ code.usageCount }} uso{{ code.usageCount !== 1 ? 's' : '' }}{{ code.maxUses ? ` / ${code.maxUses}` : '' }}
          </span>
          <span v-if="code.expiresAt" class="flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16.5 12"/></svg>
            Expira em {{ formatDate(code.expiresAt) }}
          </span>
        </div>
      </UiCard>
    </div>

    <!-- Create/Edit Modal -->
    <UiModal v-model="showModal" :title="editingCodeId ? 'Editar Link de Cadastro' : 'Novo Link de Cadastro'" size="lg">
      <div class="space-y-5">
        <div>
          <label class="mb-1.5 block text-sm font-semibold text-p-text-secondary">Perfil de acesso <span class="text-red-500">*</span></label>
          <div class="grid grid-cols-2 gap-2.5">
            <label class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-[1.5px] px-3 py-2.5 text-sm font-semibold transition-colors" :class="form.role === 'CORRETOR' ? 'border-p-accent bg-p-accent/10 text-p-accent' : 'border-p-border text-p-text-secondary'" :style="editingCodeId ? 'opacity: 0.65; cursor: not-allowed;' : ''">
              <input type="radio" v-model="form.role" value="CORRETOR" :disabled="!!editingCodeId" class="hidden" />
              <span>Corretor</span>
            </label>
            <label class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-[1.5px] px-3 py-2.5 text-sm font-semibold transition-colors" :class="form.role === 'IMOBILIARIA' ? 'border-p-accent bg-p-accent/10 text-p-accent' : 'border-p-border text-p-text-secondary'" :style="editingCodeId ? 'opacity: 0.65; cursor: not-allowed;' : ''">
              <input type="radio" v-model="form.role" value="IMOBILIARIA" :disabled="!!editingCodeId" class="hidden" />
              <span>Imobiliária</span>
            </label>
          </div>
          <p v-if="editingCodeId" class="mt-1 text-xs text-p-text-muted">O perfil do link nao pode ser alterado depois de criado.</p>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-semibold text-p-text-secondary">Descrição (opcional)</label>
          <input v-model="form.description" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" placeholder="Ex: Link para corretores da Remax" />
        </div>

        <div v-if="form.role === 'CORRETOR'">
          <label class="mb-1.5 block text-sm font-semibold text-p-text-secondary">Atribuição automática de empreendimentos</label>
          <div class="space-y-2.5">
            <label class="flex cursor-pointer gap-2.5 rounded-lg border-[1.5px] p-3 transition-colors" :class="form.projectAssignmentMode === 'NONE' ? 'border-p-accent/45 bg-p-accent/10' : 'border-p-border bg-p-raised'">
              <input v-model="form.projectAssignmentMode" type="radio" value="NONE" class="mt-0.5" />
              <div class="flex flex-col gap-1">
                <strong class="text-sm text-p-text">Nenhum</strong>
                <span class="text-[13px] text-p-text-muted">O corretor entra sem empreendimentos vinculados.</span>
              </div>
            </label>
            <label class="flex cursor-pointer gap-2.5 rounded-lg border-[1.5px] p-3 transition-colors" :class="form.projectAssignmentMode === 'ALL' ? 'border-p-accent/45 bg-p-accent/10' : 'border-p-border bg-p-raised'">
              <input v-model="form.projectAssignmentMode" type="radio" value="ALL" class="mt-0.5" />
              <div class="flex flex-col gap-1">
                <strong class="text-sm text-p-text">Todos</strong>
                <span class="text-[13px] text-p-text-muted">No cadastro, o corretor ja entra vinculado a todos os empreendimentos da loteadora.</span>
              </div>
            </label>
            <label class="flex cursor-pointer gap-2.5 rounded-lg border-[1.5px] p-3 transition-colors" :class="form.projectAssignmentMode === 'SELECTED' ? 'border-p-accent/45 bg-p-accent/10' : 'border-p-border bg-p-raised'">
              <input v-model="form.projectAssignmentMode" type="radio" value="SELECTED" class="mt-0.5" />
              <div class="flex flex-col gap-1">
                <strong class="text-sm text-p-text">Selecionados</strong>
                <span class="text-[13px] text-p-text-muted">Escolha um ou mais empreendimentos para vincular automaticamente.</span>
              </div>
            </label>
          </div>

          <div v-if="form.projectAssignmentMode === 'SELECTED'" class="mt-3 rounded-lg border border-p-border bg-black/15 p-3">
            <div v-if="projects.length === 0" class="text-[13px] text-p-text-muted">
              Nenhum empreendimento cadastrado no tenant.
            </div>
            <div v-else class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label v-for="project in projects" :key="project.id" class="flex cursor-pointer items-start gap-2 rounded-md bg-p-raised p-2.5 text-sm text-p-text-secondary">
                <input v-model="form.projectIds" type="checkbox" :value="project.id" class="mt-0.5" />
                <span>{{ project.name }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-semibold text-p-text-secondary">Limite de usos (opcional)</label>
            <input v-model="form.maxUses" type="number" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" placeholder="Ilimitado" min="1" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-semibold text-p-text-secondary">Expira em (opcional)</label>
            <input v-model="form.expiresAt" :min="expiresAtMin" type="date" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="closeModal">Cancelar</UiButton>
          <UiButton variant="primary" :disabled="saving || !canWriteSignupLinks" :title="!canWriteSignupLinks ? writePermissionHint : undefined" @click="saveCode">
            {{ saving ? (editingCodeId ? 'Salvando...' : 'Criando...') : (editingCodeId ? 'Salvar Alterações' : 'Criar Link') }}
          </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>
