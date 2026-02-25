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
              <div v-if="t.customDomain" style="font-size: 0.75rem; color: var(--primary);">🌐 {{ t.customDomain }}</div>
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
                <button class="btn btn-sm btn-ghost" @click="openProjectList(t)" title="Ver Empreendimentos">
                  📂 Ver Projetos
                </button>
                <button class="btn btn-sm btn-ghost" @click="openEditModal(t)" title="Editar Loteadora">
                  ✏️
                </button>
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
          <h2>{{ editingId ? 'Editar Loteadora' : 'Nova Loteadora' }}</h2>
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
          <div class="form-group">
            <label class="form-label">Domínio Customizado (Ex: vendas.loteadora.com)</label>
            <input v-model="form.customDomain" class="form-input" placeholder="vendas.meu-site.com.br" />
          </div>
          <hr v-if="!editingId" style="margin: var(--space-6) 0; border: 0; border-top: 1px solid var(--border-color);" />
          <div v-if="!editingId">
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
          </div>
          
          <div v-if="error" class="alert alert-error">{{ error }}</div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="showModal = false">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Processando...' : (editingId ? 'Salvar Alterações' : 'Criar Loteadora') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Projects List Modal -->
    <div v-if="showProjectsModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header">
          <div>
            <h2>Empreendimentos - {{ selectedTenant?.name }}</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Configure domínios customizados para projetos desta loteadora.</p>
          </div>
          <button class="close-btn" @click="showProjectsModal = false">&times;</button>
        </div>
        
        <div v-if="loadingProjects" class="loading-state">
          <div class="loading-spinner"></div>
        </div>
        <div v-else-if="tenantProjects.length === 0" class="empty-state">
          <p>Nenhum empreendimento cadastrado para esta loteadora.</p>
        </div>
        <div v-else class="table-wrapper" style="max-height: 400px; overflow-y: auto;">
          <table>
            <thead>
              <tr>
                <th>Empreendimento</th>
                <th>Slug</th>
                <th>Domínio Customizado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in tenantProjects" :key="p.id">
                <td><strong>{{ p.name }}</strong></td>
                <td>/{{ p.slug }}</td>
                <td>
                  <div v-if="editingProjectId === p.id" style="display: flex; gap: 8px;">
                    <input v-model="projectForm.customDomain" class="form-input btn-sm" placeholder="vendas.site.com" @keyup.enter="saveProjectDomain(p)" />
                    <button class="btn btn-sm btn-primary" @click="saveProjectDomain(p)">💾</button>
                    <button class="btn btn-sm btn-ghost" @click="editingProjectId = null">✕</button>
                  </div>
                  <div v-else @dblclick="editProjectDomain(p)" style="cursor: pointer; min-height: 20px;">
                    {{ p.customDomain || '—' }} <span style="opacity: 0.5; font-size: 0.75rem;">✏️</span>
                  </div>
                </td>
                <td>
                  <button class="btn btn-sm btn-ghost" @click="editProjectDomain(p)">
                    Configurar Domínio
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" @click="showProjectsModal = false">Fechar</button>
        </div>
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
const editingId = ref(null)

const showProjectsModal = ref(false)
const selectedTenant = ref(null)
const loadingProjects = ref(false)
const tenantProjects = ref([])
const editingProjectId = ref(null)
const projectForm = ref({ customDomain: '' })

const form = ref({
  tenantName: '',
  tenantSlug: '',
  customDomain: '',
  name: '',
  email: '',
  password: ''
})

function generateSlug() {
  if (editingId.value) return
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
  editingId.value = null
  form.value = {
    tenantName: '',
    tenantSlug: '',
    customDomain: '',
    name: '',
    email: '',
    password: ''
  }
  showModal.value = true
  error.value = ''
}

function openEditModal(tenant) {
  editingId.value = tenant.id
  form.value = {
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    customDomain: tenant.customDomain || '',
    name: '—', // Not editable here
    email: '—',
    password: '—'
  }
  showModal.value = true
  error.value = ''
}

async function handleCreate() {
  saving.value = true
  error.value = ''
  try {
    if (editingId.value) {
      // Logic for Update
      await fetchApi(`/tenants/${editingId.value}`, {
        method: 'PATCH',
        body: {
          name: form.value.tenantName,
          slug: form.value.tenantSlug,
          customDomain: form.value.customDomain || null
        }
      })
      toast.success('Loteadora atualizada!')
    } else {
      // Logic for Create
      await fetchApi('/tenants', {
        method: 'POST',
        body: form.value
      })
      toast.success('Loteadora criada com sucesso!')
    }
    showModal.value = false
    loadTenants()
  } catch (err) {
    error.value = err.data?.message || 'Erro ao processar'
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

// ── Projects Management ──────────────────────────────────
async function openProjectList(tenant) {
  selectedTenant.value = tenant
  showProjectsModal.value = true
  loadingProjects.value = true
  try {
    // We use the tenant ID as a header to resolve context via Middleware
    const res = await fetchApi('/projects', {
      headers: { 'x-tenant-id': tenant.id }
    })
    tenantProjects.value = res.data
  } catch (err) {
    toast.error('Erro ao carregar empreendimentos')
  } finally {
    loadingProjects.value = false
  }
}

function editProjectDomain(project) {
  editingProjectId.value = project.id
  projectForm.value.customDomain = project.customDomain || ''
}

async function saveProjectDomain(project) {
  try {
    const updated = await fetchApi(`/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'x-tenant-id': selectedTenant.value.id },
      body: { customDomain: projectForm.value.customDomain || null }
    })
    
    // Update locally
    project.customDomain = updated.customDomain
    editingProjectId.value = null
    toast.success('Domínio do projeto atualizado!')
  } catch (err) {
    toast.error(err.data?.message || 'Erro ao atualizar domínio')
  }
}

function formatDate(date) {
  return formatDateToBrasilia(date)
}

onMounted(loadTenants)
</script>
