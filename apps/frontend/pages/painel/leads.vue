<template>
  <div>
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <h1>Gestão de Leads</h1>
        <p>Acompanhe o funil de vendas e gerencie interessados em tempo real.</p>
      </div>
      <div class="d-flex gap-2">
        <div class="view-toggle">
          <button 
            type="button"
            class="toggle-btn" 
            :class="{ active: viewMode === 'kanban' }" 
            @click="viewMode = 'kanban'"
          >
            Kanban
          </button>
          <button 
            type="button"
            class="toggle-btn" 
            :class="{ active: viewMode === 'table' }" 
            @click="viewMode = 'table'"
          >
            Tabela
          </button>
        </div>
        <button class="btn btn-primary" @click="showCreateModal = true">+ Novo Lead</button>
      </div>
    </div>

    <!-- Enhanced Filters -->
    <div class="filter-card">
      <div class="filter-group">
        <label class="form-label">Projeto</label>
        <select v-model="filters.projectId" class="form-select" @change="loadLeads(filters)">
          <option value="">Todos os projetos</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="form-label">Status</label>
        <select v-model="filters.status" class="form-select" @change="loadLeads(filters)">
          <option value="">Todos os status</option>
          <option value="NEW">Novo</option>
          <option value="CONTACTED">Contatado</option>
          <option value="QUALIFIED">Qualificado</option>
          <option value="NEGOTIATING">Negociando</option>
          <option value="RESERVATION">Reserva solicitada</option>
          <option value="WON">Convertido</option>
          <option value="LOST">Perdido</option>
          <option value="ABANDONED">Abandonou Checkout</option>
        </select>
      </div>
      <div class="filter-group flex-2">
        <label class="form-label">Buscar nome ou e-mail</label>
        <input v-model="filters.search" type="text" class="form-input" placeholder="Pesquisar..." @keyup.enter="loadLeads(filters)">
      </div>
      <div class="filter-actions mt-auto">
        <button class="btn btn-secondary btn-sm" @click="resetFilters">Limpar</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state flex-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="leads.length === 0" class="empty-state py-12">
      <div class="empty-icon">📭</div>
      <h3>Nenhum lead encontrado</h3>
      <p>Ajuste os filtros ou cadastre um novo lead manual.</p>
    </div>

    <div v-else class="content-view">
      <!-- Kanban View -->
      <LeadsLeadKanban 
        v-if="viewMode === 'kanban'" 
        :leads="leads" 
        @select="viewLead" 
      />

      <!-- Table View -->
      <div v-else class="table-wrapper">
        <table class="table-modern">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Projeto</th>
              <th>Corretor</th>
              <th>Status</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in leads" :key="lead.id" class="clickable-row" @click="viewLead(lead)">
              <td>
                <div class="d-flex flex-column">
                  <strong>{{ lead.name }}</strong>
                  <span v-if="lead.isRecurrent" class="badge-recurrent-tag">Recorrente</span>
                </div>
              </td>
              <td>
                <div class="small-info">
                  <span>{{ lead.email || '—' }}</span>
                  <span>{{ lead.phone || '—' }}</span>
                </div>
              </td>
              <td>{{ lead.project?.name || '—' }}</td>
              <td>{{ lead.realtorLink?.name || 'Direto' }}</td>
              <td><LeadsLeadStatusBadge :status="lead.status" /></td>
              <td>{{ formatDateToBrasilia(lead.createdAt) }}</td>
              <td @click.stop>
                <div class="d-flex gap-1">
                  <button class="btn-icon btn-sm" title="Editar" @click="editLead(lead)">✏️</button>
                  <button v-if="authStore.isAdmin || authStore.isLoteadora" class="btn-icon btn-sm" title="Excluir" @click="onDeleteLead(lead)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="p-4 border-top">
          <CommonPagination :meta="meta" @change="loadLeads(filters, $event)" />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <LeadsLeadFormModal 
      v-if="showCreateModal" 
      :projects="projects"
      @close="showCreateModal = false" 
      @saved="loadLeads(filters)" 
    />

    <LeadsLeadFormModal 
      v-if="showEditModal" 
      :lead="editingLead"
      :projects="projects"
      @close="showEditModal = false" 
      @saved="loadLeads(filters)" 
    />

    <LeadsLeadDetailsModal 
      v-if="selectedLead" 
      :lead="selectedLead" 
      @close="selectedLead = null" 
      @refresh="onDetailsRefresh"
      @edit="onDetailsEdit"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const { leads, loading, meta, projects, loadLeads, loadProjects, getLead } = useLeads()
const authStore = useAuthStore()
const { fromError, success: toastSuccess } = useToast()

const viewMode = ref('kanban')

// Persistence of view preference
onMounted(() => {
  const savedView = localStorage.getItem('lotio_leads_view_mode')
  if (savedView) {
    viewMode.value = savedView
  }
})

watch(viewMode, (newVal) => {
  localStorage.setItem('lotio_leads_view_mode', newVal)
})

const filters = ref({ projectId: '', status: '', search: '' })
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingLead = ref(null)
const selectedLead = ref(null)

const resetFilters = () => {
  filters.value = { projectId: '', status: '', search: '' }
  loadLeads()
}

const viewLead = async (lead) => {
  const fullLead = await getLead(lead.id)
  selectedLead.value = fullLead
}

const editLead = (lead) => {
  editingLead.value = lead
  showEditModal.value = true
}

const onDetailsEdit = (lead) => {
  selectedLead.value = null
  editLead(lead)
}

const onDetailsRefresh = async () => {
  if (selectedLead.value) {
    selectedLead.value = await getLead(selectedLead.value.id)
  }
  await loadLeads(filters.value)
}

const onDeleteLead = async (lead) => {
  if (!confirm(`Deseja realmente excluir o lead ${lead.name}?`)) return
  try {
    const { fetchApi } = useApi()
    await fetchApi(`/leads/${lead.id}`, { method: 'DELETE' })
    toastSuccess('Lead excluído')
    await loadLeads(filters.value)
  } catch (e) {
    fromError(e, 'Erro ao excluir lead')
  }
}

onMounted(async () => {
  await loadProjects()
  await loadLeads()
})
</script>

<style scoped>
.page-header { margin-bottom: var(--space-6); border-bottom: 2px solid var(--gray-100); padding-bottom: var(--space-4); }

.view-toggle { 
  background: var(--gray-100); 
  border-radius: var(--radius-md); 
  display: flex; 
  padding: 4px; 
  gap: 4px;
  height: 48px;
}
.toggle-btn { 
  border: none; 
  background: none; 
  padding: 0 16px; 
  font-weight: 600; 
  font-size: 0.875rem; 
  color: var(--gray-500); 
  cursor: pointer; 
  border-radius: var(--radius-sm);
  transition: all 200ms ease;
  flex: 1;
  white-space: nowrap;
}
.toggle-btn.active { 
  background: white; 
  color: var(--primary); 
  box-shadow: var(--shadow-sm);
}

.filter-card { 
  background: white; 
  border-radius: var(--radius-lg); 
  padding: var(--space-5); 
  margin-bottom: var(--space-6); 
  box-shadow: var(--shadow-sm); 
  display: flex; 
  gap: var(--space-5); 
  align-items: flex-end; 
  flex-wrap: wrap; 
  border: 1px solid var(--gray-200); 
}
.filter-group { flex: 1; min-width: 200px; }
.flex-2 { flex: 2; }
.filter-actions { padding-bottom: 4px; }

.table-modern { width: 100%; border-collapse: collapse; }
.clickable-row { cursor: pointer; transition: background 150ms; }
.clickable-row:hover { background: var(--gray-50); }

.small-info { display: flex; flex-direction: column; font-size: 0.8125rem; color: var(--gray-600); gap: 2px; }

.badge-recurrent-tag { 
  font-size: 0.625rem; 
  background: var(--warning-light); 
  color: var(--warning); 
  padding: 1px 6px; 
  border-radius: 4px; 
  font-weight: 700; 
  width: fit-content;
  margin-top: 2px;
}

.table-wrapper { 
  background: white; 
  border: 1px solid var(--gray-200); 
  border-radius: var(--radius-lg); 
  overflow: hidden; 
}

.loading-state, .empty-state {
  text-align: center;
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
}

.empty-icon { font-size: 2.5rem; margin-bottom: var(--space-4); }

.d-flex { display: flex; }
.justify-content-between { justify-content: space-between; }
.align-items-center { align-items: center; }
.flex-column { flex-direction: column; }
.gap-1 { gap: var(--space-1); }
.gap-2 { gap: var(--space-2); }
.mt-auto { margin-top: auto; }
.py-12 { padding-top: var(--space-12); padding-bottom: var(--space-12); }
.p-4 { padding: var(--space-4); }
.border-top { border-top: 1px solid var(--gray-100); }
</style>
