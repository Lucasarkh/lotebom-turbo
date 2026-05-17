<template>
  <div>
    <UiPageHeader :title="'Usuários'" :description="authStore.isSysAdmin ? 'Gerenciar usuários internos da Lotio' : 'Gerenciar usuários que acessam o sistema da loteadora'">
      <template #actions>
        <UiButton variant="primary" :disabled="!canWriteUsers" :title="!canWriteUsers ? writePermissionHint : undefined" @click="showCreate = true">+ Novo Usuário</UiButton>
      </template>
    </UiPageHeader>

    <UiCard v-if="!authStore.isSysAdmin" class="mt-6">
      <strong class="text-p-text">Escopo deste cadastro</strong>
      <p class="mt-2 text-sm text-p-text-secondary">
        Este gerenciador controla apenas usuários internos do sistema. Imobiliárias e corretores continuam sendo criados
        nos menus próprios, com seus fluxos específicos.
      </p>
    </UiCard>

    <div v-if="loading" class="mt-6">
      <UiLoadingState />
    </div>

    <div v-else-if="error" class="mt-6">
      <UiCard>
        <div class="text-center">
          <p class="text-sm text-p-danger">{{ error }}</p>
          <UiButton variant="primary" class="mt-4" @click="loadUsers">Tentar novamente</UiButton>
        </div>
      </UiCard>
    </div>

    <div v-else-if="users.length === 0" class="mt-6">
      <UiCard padding="none">
        <UiEmptyState title="Nenhum usuário" description="Os usuários internos do sistema aparecerão aqui." icon="👤" />
      </UiCard>
    </div>

    <div v-else class="mt-6">
      <UiTable>
        <template #head>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Nome</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Email</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Tipo</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Acessos</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Data</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Ações</th>
        </template>
        <tr v-for="u in users" :key="u.id">
          <td class="px-4 py-3 text-sm font-semibold text-p-text">{{ u.name }}</td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ u.email }}</td>
          <td class="px-4 py-3 text-sm">
            <UiBadge :variant="roleBadgeVariant(u.role)">{{ roleLabel(u.role) }}</UiBadge>
          </td>
          <td class="px-4 py-3 text-sm">
            <div v-if="u.role === 'SYSADMIN'" class="flex flex-wrap gap-1.5">
              <span class="inline-flex items-center rounded-full bg-p-success/15 px-2 py-0.5 text-[11px] font-semibold text-p-success">Acesso total</span>
            </div>
            <div v-else class="flex flex-wrap gap-1.5">
              <span
                v-for="permission in permissionPreview(u.panelPermissions)"
                :key="`${u.id}-${permission.key}`"
                class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                :class="permission.level === 'write' ? 'bg-p-success/15 text-p-success' : 'bg-blue-500/15 text-blue-400'"
              >
                {{ permission.label }}: {{ permissionLevelLabel(permission.level) }}
              </span>
              <span v-if="permissionPreview(u.panelPermissions).length === 0" class="text-[13px] text-p-text-muted">Sem acessos definidos</span>
            </div>
          </td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ formatDateToBrasilia(u.createdAt) }}</td>
          <td class="px-4 py-3 text-sm">
            <div class="flex gap-2">
              <UiButton variant="secondary" size="xs" :disabled="!canWriteUsers" :title="!canWriteUsers ? writePermissionHint : undefined" @click="startEdit(u)">Editar</UiButton>
              <UiButton variant="danger" size="xs" @click="deleteUser(u)" :disabled="!canWriteUsers || u.id === authStore.user?.id" :title="!canWriteUsers ? writePermissionHint : undefined">Excluir</UiButton>
            </div>
          </td>
        </tr>
      </UiTable>

      <div v-if="meta.totalPages > 1" class="mt-4">
        <CommonPagination
          :current-page="meta.currentPage"
          :total-pages="meta.totalPages"
          @change="loadUsers"
        />
      </div>
    </div>

    <UiModal v-model="showModalFlag" :title="editingUser ? 'Editar Usuário' : 'Novo Usuário'" size="lg">
      <form @submit.prevent="editingUser ? saveEdit() : createUser()">
        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Nome</label>
            <input v-model="form.name" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" required minlength="2" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Email</label>
            <input v-model="form.email" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" type="email" required :disabled="!!editingUser" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">{{ editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha' }}</label>
            <AppPasswordInput v-model="form.password" :required="!editingUser" :placeholder="editingUser ? 'Deixe vazio para manter a atual' : PASSWORD_POLICY_HINT" />
            <p v-if="modalPasswordError" class="mt-1 text-xs text-p-danger">{{ modalPasswordError }}</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Tipo de usuário</label>
            <div class="rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text">
              {{ authStore.isSysAdmin ? 'Administrador do sistema' : 'Usuário interno do sistema' }}
            </div>
          </div>
          <div v-if="!authStore.isSysAdmin">
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Permissões por funcionalidade</label>
            <div class="space-y-3">
              <div v-for="feature in panelFeatures" :key="feature.key" class="grid grid-cols-1 items-center gap-3 rounded-xl border border-p-border bg-p-raised p-3 sm:grid-cols-[1fr_180px]">
                <div class="flex flex-col gap-1">
                  <strong class="text-sm text-p-text">{{ feature.label }}</strong>
                  <small class="text-xs text-p-text-muted">{{ feature.description }}</small>
                </div>
                <select v-model="form.panelPermissions[feature.key]" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text appearance-none focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30">
                  <option value="none">Oculto</option>
                  <option value="read">Leitura</option>
                  <option value="write">Edição</option>
                </select>
              </div>
            </div>
            <p class="mt-2 text-xs text-p-text-muted">Tudo que ficar como oculto será removido do menu e bloqueado nas rotas.</p>
          </div>
          <div v-if="formError">
            <UiAlert variant="error">{{ formError }}</UiAlert>
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="closeModal">Cancelar</UiButton>
          <UiButton variant="primary" :disabled="formLoading" @click="editingUser ? saveEdit() : createUser()">
            {{ formLoading ? 'Salvando...' : editingUser ? 'Salvar' : 'Criar' }}
          </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import {
  getPasswordPolicyError,
  PASSWORD_POLICY_HINT
} from '~/utils/passwordPolicy'
import {
  buildEmptyPanelPermissions,
  countAssignedPanelFeatures,
  normalizePanelPermissions,
  PANEL_FEATURES,
} from '~/utils/panelPermissions'

const { fetchApi } = useApi()
const authStore = useAuthStore()
const { success: toastSuccess, fromError: toastFromError } = useToast()

const loading = ref(true)
const error = ref('')
const users = ref([])
const meta = ref({ total: 0, page: 1, limit: 10, totalPages: 0, currentPage: 1 })
const showCreate = ref(false)
const editingUser = ref(null)
const formLoading = ref(false)
const formError = ref('')
const panelFeatures = PANEL_FEATURES
const canWriteUsers = computed(() => authStore.isSysAdmin || authStore.canWriteFeature('users'))
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição'

const showModalFlag = computed({
  get: () => showCreate.value || !!editingUser.value,
  set: (val) => {
    if (!val) closeModal()
  }
})

const getDefaultRole = () => (authStore.isSysAdmin ? 'SYSADMIN' : 'LOTEADORA')
const buildDefaultForm = () => ({
  name: '',
  email: '',
  password: '',
  role: getDefaultRole(),
  panelPermissions: buildEmptyPanelPermissions()
})

const form = ref(buildDefaultForm())

const modalPasswordError = computed(() => {
  if (!form.value.password) return ''
  return getPasswordPolicyError(form.value.password)
})

const roleBadgeVariant = (r) => ({ SYSADMIN: 'danger', LOTEADORA: 'primary', IMOBILIARIA: 'info', CORRETOR: 'neutral' }[r] || 'neutral')
const roleLabel = (r) => ({ SYSADMIN: 'System Admin', LOTEADORA: 'Usuário do sistema', IMOBILIARIA: 'Imobiliária', CORRETOR: 'Corretor' }[r] || r)
const permissionLevelLabel = (level) => ({ read: 'Leitura', write: 'Edição', none: 'Oculto' }[level] || level)

const permissionPreview = (permissions) => {
  const normalized = normalizePanelPermissions(permissions)
  return panelFeatures
    .filter(feature => normalized[feature.key] !== 'none')
    .map(feature => ({ key: feature.key, label: feature.label, level: normalized[feature.key] }))
}

const loadUsers = async (page = 1) => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetchApi(`/users?page=${page}&limit=10`)
    users.value = res.data
    meta.value = res.meta
  } catch (e) {
    error.value = 'Não foi possível carregar os usuários.'
    toastFromError(e, 'Erro ao carregar usuários')
  }
  loading.value = false
}

const closeModal = () => {
  showCreate.value = false
  editingUser.value = null
  formError.value = ''
  form.value = buildDefaultForm()
}

const validateTenantPermissions = () => {
  if (authStore.isSysAdmin) return true
  if (countAssignedPanelFeatures(form.value.panelPermissions) === 0) {
    formError.value = 'Selecione pelo menos uma funcionalidade com leitura ou edição.'
    return false
  }
  return true
}

const createUser = async () => {
  if (!canWriteUsers.value) return
  const passwordError = getPasswordPolicyError(form.value.password)
  if (passwordError) {
    formError.value = passwordError
    return
  }
  if (!validateTenantPermissions()) return

  formLoading.value = true
  formError.value = ''
  try {
    const payload = {
      name: form.value.name,
      email: form.value.email,
      password: form.value.password,
      role: form.value.role,
      panelPermissions: authStore.isSysAdmin ? undefined : form.value.panelPermissions,
    }
    await fetchApi('/users', { method: 'POST', body: JSON.stringify(payload) })
    await loadUsers(1)
    closeModal()
    toastSuccess('Usuário criado com sucesso!')
  } catch (e) {
    formError.value = e.message
    toastFromError(e, 'Erro ao criar usuário')
  }
  formLoading.value = false
}

const startEdit = (u) => {
  if (!canWriteUsers.value) return
  editingUser.value = u
  form.value = {
    name: u.name,
    email: u.email,
    password: '',
    role: authStore.isSysAdmin ? u.role : 'LOTEADORA',
    panelPermissions: normalizePanelPermissions(u.panelPermissions),
  }
}

const saveEdit = async () => {
  if (!canWriteUsers.value) return
  if (form.value.password) {
    const passwordError = getPasswordPolicyError(form.value.password)
    if (passwordError) {
      formError.value = passwordError
      return
    }
  }
  if (!validateTenantPermissions()) return

  formLoading.value = true
  formError.value = ''
  try {
    const payload = {
      name: form.value.name,
      role: form.value.role,
      panelPermissions: authStore.isSysAdmin ? undefined : form.value.panelPermissions,
    }
    if (form.value.password) payload.password = form.value.password
    const u = await fetchApi(`/users/${editingUser.value.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    Object.assign(editingUser.value, u)
    closeModal()
    toastSuccess('Usuário atualizado!')
  } catch (e) {
    formError.value = e.message
    toastFromError(e, 'Erro ao atualizar usuário')
  }
  formLoading.value = false
}

const deleteUser = async (u) => {
  if (!canWriteUsers.value) return
  if (!confirm(`Excluir "${u.name}"?`)) return
  try {
    await fetchApi(`/users/${u.id}`, { method: 'DELETE' })
    users.value = users.value.filter(x => x.id !== u.id)
    toastSuccess('Usuário excluído')
  } catch (e) {
    toastFromError(e, 'Erro ao excluir usuário')
  }
}

onMounted(loadUsers)

definePageMeta({
  layout: 'painel'
})
</script>
