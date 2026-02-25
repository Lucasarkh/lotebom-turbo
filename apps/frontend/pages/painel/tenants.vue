<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Loteadoras</h1>
        <p>Gerenciamento global de clientes e métricas</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        Nova Loteadora
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Carregando loteadoras...</span>
    </div>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Loteadora</th>
            <th>Projetos</th>
            <th>Corretores</th>
            <th>Leads</th>
            <th>Status</th>
            <th>Cadastrada em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tenants" :key="t.id">
            <td>
              <div style="font-weight: 600;">{{ t.name }}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">{{ t.slug }}</div>
            </td>
            <td>{{ t.metrics.projects }}</td>
            <td>{{ t.metrics.brokers }}</td>
            <td>{{ t.metrics.leads }}</td>
            <td>
              <span class="badge" :class="t.isActive ? 'badge-success' : 'badge-error'">
                {{ t.isActive ? 'Ativa' : 'Desativada' }}
              </span>
            </td>
            <td>{{ formatDate(t.createdAt) }}</td>
            <td>
              <div class="flex gap-2">
                <button class="btn btn-sm btn-outline" @click="toggleStatus(t)">
                  {{ t.isActive ? 'Desativar' : 'Ativar' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Tenant Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Nova Loteadora</h2>
          <button class="close-btn" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="handleCreate">
          <div class="form-group">
            <label class="form-label">Nome da Empresa</label>
            <input v-model="form.tenantName" class="form-input" placeholder="Ex: Loteadora Vista Verde" required @input="generateSlug" />
          </div>
          <div class="form-group">
            <label class="form-label">Slug (URL)</label>
            <input v-model="form.tenantSlug" class="form-input" placeholder="vista-verde" required />
          </div>
          <hr style="margin: var(--space-6) 0; border: 0; border-top: 1px solid var(--border-color);" />
          <h3 style="margin-bottom: var(--space-4);">Usuário Administrador</h3>
          <div class="form-group">
            <label class="form-label">Nome do Responsável</label>
            <input v-model="form.name" class="form-input" placeholder="João Silva" required />
          </div>
          <div class="form-group">
            <label class="form-label">Email de Acesso</label>
            <input v-model="form.email" type="email" class="form-input" placeholder="admin@empresa.com" required autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label">Senha Inicial</label>
            <input v-model="form.password" type="password" class="form-input" placeholder="Min. 6 caracteres" required minlength="6" autocomplete="new-password" />
            <small style="color: var(--text-muted)">O cliente poderá alterar esta senha depois.</small>
          </div>
          
          <div v-if="error" class="alert alert-error">{{ error }}</div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="showModal = false">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Criando...' : 'Criar Loteadora' }}
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
const toast = useToast()

const tenants = ref([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const error = ref('')

const form = ref({
  tenantName: '',
  tenantSlug: '',
  name: '',
  email: '',
  password: ''
})

function generateSlug() {
  form.value.tenantSlug = form.value.tenantName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function loadTenants() {
  loading.value = true
  try {
    tenants.value = await fetchApi('/tenants')
  } catch (err) {
    toast.error('Erro ao carregar loteadoras')
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  form.value = {
    tenantName: '',
    tenantSlug: '',
    name: '',
    email: '',
    password: ''
  }
  showModal.value = true
  error.value = ''
}

async function handleCreate() {
  saving.value = true
  error.value = ''
  try {
    await fetchApi('/tenants', {
      method: 'POST',
      body: form.value
    })
    toast.success('Loteadora criada com sucesso!')
    showModal.value = false
    loadTenants()
  } catch (err) {
    error.value = err.data?.message || 'Erro ao criar loteadora'
  } finally {
    saving.value = false
  }
}

async function toggleStatus(tenant) {
  const newStatus = !tenant.isActive
  try {
    await fetchApi(`/tenants/${tenant.id}/status`, {
      method: 'PATCH',
      body: { isActive: newStatus }
    })
    tenant.isActive = newStatus
    toast.success(`Loteadora ${newStatus ? 'ativada' : 'desativada'} com sucesso!`)
  } catch (err) {
    toast.error('Erro ao alterar status')
  }
}

function formatDate(date) {
  return formatDateToBrasilia(date)
}

onMounted(loadTenants)
</script>
