<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Leads</h1>
        <p>Gerenciar leads de todos os projetos</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <select v-model="filters.projectId" class="form-select" @change="loadLeads">
        <option value="">Todos os projetos</option>
        <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <select v-model="filters.status" class="form-select" @change="loadLeads">
        <option value="">Todos os status</option>
        <option value="NEW">Novo</option>
        <option value="CONTACTED">Contatado</option>
        <option value="QUALIFIED">Qualificado</option>
        <option value="NEGOTIATING">Negociando</option>
        <option value="CONVERTED">Convertido</option>
        <option value="LOST">Perdido</option>
      </select>
    </div>

    <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" style="margin-top: var(--space-4);" @click="loadLeads">Tentar novamente</button>
    </div>

    <div v-else-if="leads.length === 0" class="empty-state">
      <h3>Nenhum lead encontrado</h3>
      <p>Leads surgem quando visitantes se cadastram na página pública.</p>
    </div>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Telefone</th>
            <th>Projeto</th>
            <th>Lote</th>
            <th>Corretor</th>
            <th>Status</th>
            <th>Data</th>
            <th v-if="authStore.canEdit">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lead in leads" :key="lead.id" @click="selectedLead = lead" style="cursor:pointer">
            <td><strong>{{ lead.name }}</strong></td>
            <td>{{ lead.email }}</td>
            <td>{{ lead.phone || '—' }}</td>
            <td>{{ lead.project?.name || '—' }}</td>
            <td>{{ lead.lotCode || '—' }}</td>
            <td>{{ lead.realtorLink?.name || '—' }}</td>
            <td>
              <select
                v-if="authStore.canEdit"
                :value="lead.status"
                class="form-select form-select-sm"
                @click.stop
                @change="updateStatus(lead, $event.target.value)"
              >
                <option value="NEW">Novo</option>
                <option value="CONTACTED">Contatado</option>
                <option value="QUALIFIED">Qualificado</option>
                <option value="NEGOTIATING">Negociando</option>
                <option value="CONVERTED">Convertido</option>
                <option value="LOST">Perdido</option>
              </select>
              <span v-else class="badge" :class="statusBadge(lead.status)">{{ statusLabel(lead.status) }}</span>
            </td>
            <td>{{ new Date(lead.createdAt).toLocaleDateString('pt-BR') }}</td>
            <td v-if="authStore.canEdit">
              <button class="btn btn-danger btn-sm" @click.stop="deleteLead(lead)">Excluir</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <CommonPagination :meta="meta" @change="loadLeads" />

    <!-- Detail Modal -->
    <div v-if="selectedLead" class="modal-overlay" @click.self="selectedLead = null">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ selectedLead.name }}</h2>
          <button class="modal-close" @click="selectedLead = null">&times;</button>
        </div>
        <div class="modal-body">
          <p><strong>Email:</strong> {{ selectedLead.email }}</p>
          <p><strong>Telefone:</strong> {{ selectedLead.phone || '—' }}</p>
          <p><strong>Mensagem:</strong> {{ selectedLead.message || '—' }}</p>
          <p><strong>Status:</strong> {{ statusLabel(selectedLead.status) }}</p>
          <p><strong>Corretor:</strong> {{ selectedLead.realtorLink?.name || '—' }}{{ selectedLead.realtorLink?.phone ? ` (${selectedLead.realtorLink.phone})` : '' }}</p>
          <p><strong>Origem:</strong> {{ selectedLead.source || '—' }}</p>
          <p><strong>Data:</strong> {{ new Date(selectedLead.createdAt).toLocaleString('pt-BR') }}</p>
        </div>
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
const leads = ref([])
const projects = ref([])
const meta = ref({ totalItems: 0, itemCount: 0, itemsPerPage: 10, totalPages: 0, currentPage: 1 })
const selectedLead = ref(null)
const filters = ref({ projectId: '', status: '' })

const statusBadge = (s) => ({
  NEW: 'badge-info', CONTACTED: 'badge-warning', QUALIFIED: 'badge-primary',
  NEGOTIATING: 'badge-warning', CONVERTED: 'badge-success', LOST: 'badge-danger',
}[s] || 'badge-neutral')

const statusLabel = (s) => ({
  NEW: 'Novo', CONTACTED: 'Contatado', QUALIFIED: 'Qualificado',
  NEGOTIATING: 'Negociando', CONVERTED: 'Convertido', LOST: 'Perdido',
}[s] || s)

const loadLeads = async (page = 1) => {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams()
    if (filters.value.projectId) params.set('projectId', filters.value.projectId)
    if (filters.value.status) params.set('status', filters.value.status)
    params.set('page', page)
    params.set('limit', 10)
    const qs = params.toString()
    const res = await fetchApi(`/leads${qs ? '?' + qs : ''}`)
    leads.value = res.data
    meta.value = res.meta
  } catch (e) {
    error.value = 'Não foi possível carregar os leads.'
    toastFromError(e, 'Erro ao carregar leads')
  }
  loading.value = false
}

const updateStatus = async (lead, newStatus) => {
  try {
    const updated = await fetchApi(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) })
    Object.assign(lead, updated)
    toastSuccess('Status atualizado')
  } catch (e) {
    toastFromError(e, 'Erro ao atualizar status')
  }
}

const deleteLead = async (lead) => {
  if (!confirm(`Excluir lead "${lead.name}"?`)) return
  try {
    await fetchApi(`/leads/${lead.id}`, { method: 'DELETE' })
    leads.value = leads.value.filter(l => l.id !== lead.id)
    toastSuccess('Lead excluído')
  } catch (e) {
    toastFromError(e, 'Erro ao excluir lead')
  }
}

onMounted(async () => {
  try { projects.value = await fetchApi('/projects') } catch (e) { toastFromError(e, 'Erro ao carregar projetos') }
  await loadLeads()
})
</script>

<style scoped>
.form-select-sm {
  padding: 4px 8px; font-size: 0.8125rem; border-radius: var(--radius-sm);
  border: 1px solid var(--gray-300); background: white;
}
</style>
