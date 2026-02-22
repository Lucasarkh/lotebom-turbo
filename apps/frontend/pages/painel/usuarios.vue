<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Usuários</h1>
        <p>Gerenciar usuários da empresa</p>
      </div>
      <button class="btn btn-primary" @click="showCreate = true">+ Novo Usuário</button>
    </div>

    <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" style="margin-top: var(--space-4);" @click="loadUsers">Tentar novamente</button>
    </div>

    <div v-else-if="users.length === 0" class="empty-state">
      <h3>Nenhum usuário</h3>
    </div>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr><th>Nome</th><th>Email</th><th>Papel</th><th>Data</th><th>Ações</th></tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td><strong>{{ u.name }}</strong></td>
            <td>{{ u.email }}</td>
            <td>
              <span class="badge" :class="roleBadge(u.role)">{{ roleLabel(u.role) }}</span>
            </td>
            <td>{{ new Date(u.createdAt).toLocaleDateString('pt-BR') }}</td>
            <td>
              <div class="flex gap-2">
                <button class="btn btn-secondary btn-sm" @click="startEdit(u)">Editar</button>
                <button class="btn btn-danger btn-sm" @click="deleteUser(u)" :disabled="u.id === authStore.user?.id">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="meta.totalPages > 1" style="margin-top: var(--space-4); padding: 0 var(--space-4) var(--space-4);">
        <CommonPagination 
          :current-page="meta.page" 
          :total-pages="meta.totalPages" 
          @change="loadUsers" 
        />
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="showCreate || editingUser" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingUser ? 'Editar Usuário' : 'Novo Usuário' }}</h2>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <form @submit.prevent="editingUser ? saveEdit() : createUser()">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nome</label>
              <input v-model="form.name" class="form-input" required minlength="2" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input v-model="form.email" class="form-input" type="email" required :disabled="!!editingUser" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha' }}</label>
              <input v-model="form.password" class="form-input" type="password" :minlength="editingUser ? 0 : 6" :required="!editingUser" :placeholder="editingUser ? 'Deixe vazio para manter a atual' : 'Mín. 6 caracteres'" />
              <div v-if="form.password && form.password.length < 6 && form.password.length > 0" class="form-error">Senha deve ter no mínimo 6 caracteres</div>
            </div>
            <div class="form-group">
              <label class="form-label">Papel</label>
              <select v-model="form.role" class="form-select" required>
                <option value="ADMIN">Administrador</option>
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Visualizador</option>
              </select>
            </div>
            <div v-if="formError" class="alert alert-error">{{ formError }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" @click="closeModal">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="formLoading">
              {{ formLoading ? 'Salvando...' : editingUser ? 'Salvar' : 'Criar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const { fetchApi } = useApi()
const authStore = useAuthStore()
const { success: toastSuccess, fromError: toastFromError } = useToast()

const loading = ref(true)
const error = ref('')
const users = ref([])
const meta = ref({ total: 0, page: 1, limit: 10, totalPages: 0 })
const showCreate = ref(false)
const editingUser = ref(null)
const formLoading = ref(false)
const formError = ref('')
const form = ref({ name: '', email: '', password: '', role: 'EDITOR' })

const roleBadge = (r) => ({ ADMIN: 'badge-danger', EDITOR: 'badge-primary', VIEWER: 'badge-neutral' }[r] || 'badge-neutral')
const roleLabel = (r) => ({ ADMIN: 'Administrador', EDITOR: 'Editor', VIEWER: 'Visualizador' }[r] || r)

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
  showCreate.value = false; editingUser.value = null; formError.value = ''
  form.value = { name: '', email: '', password: '', role: 'EDITOR' }
}

const createUser = async () => {
  if (form.value.password.length < 6) { formError.value = 'Senha deve ter no mínimo 6 caracteres'; return }
  formLoading.value = true; formError.value = ''
  try {
    await fetchApi('/users', { method: 'POST', body: JSON.stringify(form.value) })
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
  editingUser.value = u
  form.value = { name: u.name, email: u.email, password: '', role: u.role }
}

const saveEdit = async () => {
  if (form.value.password && form.value.password.length < 6) { formError.value = 'Senha deve ter no mínimo 6 caracteres'; return }
  formLoading.value = true; formError.value = ''
  try {
    const payload = { name: form.value.name, role: form.value.role }
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
</script>
