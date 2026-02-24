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
        <option value="RESERVATION">Reserva solicitada</option>
        <option value="UNDER_REVIEW">Em análise</option>
        <option value="WAITING_DOCS">Aguardando docs</option>
        <option value="WAITING_PAYMENT">Aguardando pagamento</option>
        <option value="WON">Convertido</option>
        <option value="LOST">Perdido</option>
        <option value="CANCELLED">Cancelado</option>
        <option value="REVERSED">Estornado</option>
      </select>
    </div>

    <div class="actions-bar" style="margin-bottom: var(--space-4);">
      <button class="btn btn-primary" @click="isCreating = true">+ Cadastrar Lead</button>
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
                v-if="authStore.canEdit || authStore.isCorretor"
                :value="lead.status"
                class="form-select form-select-sm"
                @click.stop
                @change="updateStatus(lead, $event.target.value)"
              >
                <option value="NEW">Novo</option>
                <option value="CONTACTED">Contatado</option>
                <option value="QUALIFIED">Qualificado</option>
                <option value="NEGOTIATING">Negociando</option>
                <option value="RESERVATION">Reserva solicitada</option>
                <option value="UNDER_REVIEW">Em análise</option>
                <option value="WAITING_DOCS">Aguardando docs</option>
                <option value="WAITING_PAYMENT">Aguardando pagamento</option>
                <option value="WON">Convertido</option>
                <option value="LOST">Perdido</option>
                <option value="CANCELLED">Cancelado</option>
                <option v-if="authStore.isLoteadora" value="REVERSED">Estornado</option>
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

    <!-- Create Lead Modal -->
    <div v-if="isCreating" class="modal-overlay" @click.self="isCreating = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Novo Lead</h2>
          <button class="modal-close" @click="isCreating = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group mb-3">
            <label>Projeto</label>
            <select v-model="newLeadData.projectId" class="form-select">
              <option value="">Selecione um projeto</option>
              <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="row">
            <div class="col form-group mb-3">
              <label>Nome Completo</label>
              <input v-model="newLeadData.name" type="text" class="form-control" placeholder="Ex: João da Silva">
            </div>
          </div>
          <div class="row">
            <div class="col form-group mb-3">
              <label>Email</label>
              <input v-model="newLeadData.email" type="email" class="form-control" placeholder="joao@email.com">
            </div>
            <div class="col form-group mb-3">
              <label>Telefone</label>
              <input v-model="newLeadData.phone" type="text" class="form-control" placeholder="11999998888">
            </div>
          </div>
          <div class="row">
            <div class="col form-group mb-3">
              <label>CPF</label>
              <input v-model="newLeadData.cpf" type="text" class="form-control" placeholder="000.000.000-00">
            </div>
            <div class="col form-group mb-3">
              <label>RG</label>
              <input v-model="newLeadData.rg" type="text" class="form-control">
            </div>
          </div>
          <div class="form-group mb-3">
            <label>Endereço</label>
            <input v-model="newLeadData.address" type="text" class="form-control">
          </div>
          <div class="form-group mb-3">
            <label>Mensagem/Observações</label>
            <textarea v-model="newLeadData.message" class="form-control" rows="3"></textarea>
          </div>
          <div class="text-end mt-4">
            <button class="btn btn-neutral me-2" @click="isCreating = false">Cancelar</button>
            <button class="btn btn-primary" @click="createLead">Salvar Lead</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="selectedLead" class="modal-overlay" @click.self="selectedLead = null">
      <div class="modal modal-lg">
        <div class="modal-header">
          <div>
            <h2>{{ selectedLead.name }}</h2>
            <span class="badge" :class="statusBadge(selectedLead.status)">{{ statusLabel(selectedLead.status) }}</span>
          </div>
          <button class="modal-close" @click="selectedLead = null">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-section">
              <h3>Informações de Contato</h3>
              <p><strong>Email:</strong> {{ selectedLead.email }}</p>
              <p><strong>Telefone:</strong> {{ selectedLead.phone || '—' }}</p>
              <p><strong>Origem:</strong> {{ selectedLead.source || '—' }}</p>
              <p><strong>Data:</strong> {{ new Date(selectedLead.createdAt).toLocaleString('pt-BR') }}</p>
            </div>
            <div class="detail-section">
              <h3>Dados Cadastrais</h3>
              <p><strong>CPF:</strong> {{ selectedLead.cpf || '—' }}</p>
              <p><strong>RG:</strong> {{ selectedLead.rg || '—' }}</p>
              <p><strong>Endereço:</strong> {{ selectedLead.address || '—' }}</p>
              <p><strong>Corretor:</strong> {{ selectedLead.realtorLink?.name || '—' }}</p>
            </div>
          </div>

          <div class="tabs-container mt-4">
            <div class="tabs">
              <button class="tab-btn" :class="{active: activeTab === 'msg'}" @click="activeTab = 'msg'">Mensagem</button>
              <button class="tab-btn" :class="{active: activeTab === 'docs'}" @click="activeTab = 'docs'">Documentos ({{ selectedLead.documents?.length || 0 }})</button>
              <button v-if="authStore.isLoteadora" class="tab-btn" :class="{active: activeTab === 'finance'}" @click="activeTab = 'finance'">Pagamentos</button>
              <button class="tab-btn" :class="{active: activeTab === 'history'}" @click="activeTab = 'history'">Histórico</button>
            </div>

            <div v-if="activeTab === 'msg'" class="tab-content">
              <p>{{ selectedLead.message || 'Nenhuma mensagem.' }}</p>
            </div>

            <div v-if="activeTab === 'docs'" class="tab-content">
              <ul v-if="selectedLead.documents && selectedLead.documents.length > 0" class="doc-list">
                <li v-for="doc in selectedLead.documents" :key="doc.id">
                  <a :href="doc.url" target="_blank">{{ doc.name }}</a>
                  <span class="doc-meta">Enviado em {{ new Date(doc.createdAt).toLocaleDateString() }} por {{ doc.uploadedBy }}</span>
                </li>
              </ul>
              <p v-else>Nenhum documento anexado.</p>
              <div class="mt-3">
                <button class="btn btn-neutral btn-sm" @click="addDocPrompt">Anexar Documento</button>
              </div>
            </div>

            <div v-if="activeTab === 'finance'" class="tab-content">
              <table v-if="selectedLead.payments && selectedLead.payments.length > 0">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in selectedLead.payments" :key="p.id">
                    <td>{{ p.type }}</td>
                    <td>{{ p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}</td>
                    <td>{{ new Date(p.dueDate).toLocaleDateString() }}</td>
                    <td><span class="badge" :class="p.status === 'PAID' ? 'badge-success' : 'badge-warning'">{{ p.status }}</span></td>
                  </tr>
                </tbody>
              </table>
              <p v-else>Nenhum pagamento registrado.</p>
              <div class="mt-3">
                <button class="btn btn-neutral btn-sm" @click="addPaymentPrompt">Adicionar Pagamento</button>
              </div>
            </div>

            <div v-if="activeTab === 'history'" class="tab-content">
              <div class="timeline">
                <div v-for="h in selectedLead.history" :key="h.id" class="timeline-item">
                  <div class="timeline-date">{{ new Date(h.createdAt).toLocaleString() }}</div>
                  <div class="timeline-content">
                    <strong>{{ statusLabel(h.toStatus) }}</strong> 
                    <p v-if="h.notes">{{ h.notes }}</p>
                    <span class="timeline-author">por {{ h.createdBy }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
const isCreating = ref(false)
const newLeadData = ref({ 
  name: '', email: '', phone: '', projectId: '',
  cpf: '', rg: '', address: '', message: '' 
})

const createLead = async () => {
  if (!newLeadData.value.projectId) return alert('Selecione um projeto')
  try {
    const res = await fetchApi('/leads', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLeadData.value) 
    })
    isCreating.value = false
    newLeadData.value = { name: '', email: '', phone: '', projectId: '', cpf: '', rg: '', address: '', message: '' }
    toastSuccess('Lead cadastrado com sucesso')
    await loadLeads()
  } catch (e) {
    toastFromError(e, 'Erro ao cadastrar lead')
  }
}

const statusBadge = (s) => ({
  NEW: 'badge-info', CONTACTED: 'badge-warning', QUALIFIED: 'badge-primary',
  NEGOTIATING: 'badge-warning', RESERVATION: 'badge-warning', UNDER_REVIEW: 'badge-info',
  WAITING_DOCS: 'badge-warning', WAITING_PAYMENT: 'badge-warning', WON: 'badge-success',
  LOST: 'badge-danger', CANCELLED: 'badge-neutral', REVERSED: 'badge-danger',
}[s] || 'badge-neutral')

const statusLabel = (s) => ({
  NEW: 'Novo', CONTACTED: 'Contatado', QUALIFIED: 'Qualificado',
  NEGOTIATING: 'Negociando', RESERVATION: 'Reserva Solic.', UNDER_REVIEW: 'Em Análise',
  WAITING_DOCS: 'Aguard. Docs', WAITING_PAYMENT: 'Aguard. Pagto', WON: 'Convertido',
  LOST: 'Perdido', CANCELLED: 'Cancelado', REVERSED: 'Estornado',
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
    const updated = await fetchApi(`/leads/${lead.id}/status`, { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }) 
    })
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

const activeTab = ref('msg')

const addDocPrompt = async () => {
  const name = prompt('Nome do documento (ex: RG Frente)?')
  const url = prompt('URL do documento?') 
  if (!name || !url) return
  try {
    await fetchApi(`/leads/${selectedLead.value.id}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, type: 'link' })
    })
    toastSuccess('Documento adicionado')
    const updated = await fetchApi(`/leads/${selectedLead.value.id}`)
    selectedLead.value = updated
  } catch (e) {
    toastFromError(e, 'Erro ao adicionar documento')
  }
}

const addPaymentPrompt = async () => {
  const type = prompt('Tipo (RESERVATION_FEE, ENTRY, INSTALLMENT, INTERMEDIARY)?', 'ENTRY')
  const amountStr = prompt('Valor (ex: 1000.50)?')
  const dueDate = prompt('Vencimento (AAAA-MM-DD)?', new Date().toISOString().split('T')[0])
  if (!type || !amountStr || !dueDate) return
  try {
    const amount = parseFloat(amountStr)
    await fetchApi(`/leads/${selectedLead.value.id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount, dueDate, status: 'PENDING' })
    })
    toastSuccess('Pagamento adicionado')
    const updated = await fetchApi(`/leads/${selectedLead.value.id}`)
    selectedLead.value = updated
  } catch (e) {
    toastFromError(e, 'Erro ao adicionar pagamento')
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
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); background: var(--gray-50); padding: var(--space-4); border-radius: var(--radius-md); }
.detail-section h3 { font-size: 0.875rem; color: var(--gray-600); margin-bottom: var(--space-2); text-transform: uppercase; }
.detail-section p { margin-bottom: 4px; font-size: 0.9375rem; }
.tabs { display: flex; border-bottom: 1px solid var(--gray-200); margin-bottom: var(--space-4); }
.tab-btn { padding: 8px 16px; border: none; background: none; cursor: pointer; color: var(--gray-500); border-bottom: 2px solid transparent; }
.tab-btn.active { color: var(--brand-blue); border-bottom-color: var(--brand-blue); font-weight: 500; }
.tab-content { min-height: 100px; }
.timeline { position: relative; padding-left: 20px; border-left: 2px solid var(--gray-200); }
.timeline-item { position: relative; margin-bottom: var(--space-4); }
.timeline-item::before { content: ''; position: absolute; left: -26px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: var(--brand-blue); border: 2px solid white; }
.timeline-date { font-size: 0.75rem; color: var(--gray-500); }
.timeline-content { font-size: 0.875rem; }
.timeline-author { font-size: 0.75rem; color: var(--gray-400); }
.doc-list { list-style: none; padding: 0; }
.doc-list li { display: flex; flex-direction: column; padding: 8px 0; border-bottom: 1px solid var(--gray-100); }
.doc-meta { font-size: 0.75rem; color: var(--gray-500); }
</style>
