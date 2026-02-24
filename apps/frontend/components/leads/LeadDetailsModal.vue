<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal modal-xl">
      <div class="modal-header d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-3">
          <h2>{{ lead.name }}</h2>
          <LeadsLeadStatusBadge :status="lead.status" />
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-neutral btn-sm" @click="$emit('edit', lead)">Editar Dados</button>
          <button class="modal-close" @click="$emit('close')">&times;</button>
        </div>
      </div>

      <div class="modal-body p-0">
        <div class="lead-view">
          <!-- Sidebar: Info Summary -->
          <div class="lead-sidebar">
            <div class="sidebar-section">
              <label class="form-label text-xs uppercase text-gray-400 font-bold mb-2">Contato</label>
              <div class="info-row">
                <span class="icon">✉️</span> <span>{{ lead.email || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="icon">📞</span> <span>{{ lead.phone || '—' }}</span>
              </div>
            </div>

            <div class="sidebar-section">
              <label class="form-label text-xs uppercase text-gray-400 font-bold mb-2">Projeto & Lote</label>
              <div class="info-row">
                <strong>Projeto:</strong> {{ lead.project?.name || '—' }}
              </div>
              <div class="info-row">
                <strong>Lote:</strong> {{ lead.mapElement?.code || lead.lotCode || 'Interesse Geral' }}
              </div>
            </div>

            <div class="sidebar-section">
              <label class="form-label text-xs uppercase text-gray-400 font-bold mb-2">Corretor / Origem</label>
              <div class="info-row">
                <strong>Atribuído a:</strong> {{ lead.realtorLink?.name || 'Pendente' }}
              </div>
              <div class="info-row">
                <strong>Origem:</strong> {{ lead.source || 'Website' }}
              </div>
            </div>

            <hr class="my-4">

            <div class="sidebar-section">
              <label class="form-label text-xs uppercase text-gray-400 font-bold mb-2">Ações Rápidas</label>
              <div class="d-grid gap-2">
                <select 
                  :value="lead.status" 
                  class="form-select"
                  @change="onStatusChange($event.target.value)"
                >
                  <option v-for="(label, code) in statusOptions" :key="code" :value="code">{{ label }}</option>
                </select>
                <button v-if="lead.phone" class="btn btn-success btn-sm w-100" @click="openWhatsApp">
                  Chamar no WhatsApp
                </button>
              </div>
            </div>
          </div>

          <!-- Main Content: Tabs -->
          <div class="lead-main">
            <div class="tabs">
              <button 
                v-for="tab in tabs" 
                :key="tab.id"
                class="tab-btn" 
                :class="{ active: activeTab === tab.id }"
                @click="activeTab = tab.id"
              >
                {{ tab.label }}
                <span v-if="tab.count" class="tab-count">{{ tab.count }}</span>
              </button>
            </div>

            <div class="tab-viewport">
              <!-- General Info -->
              <div v-if="activeTab === 'info'" class="tab-pane">
                <div class="row">
                  <div class="col-md-6 mb-4">
                    <h3>Documentação</h3>
                    <p><strong>CPF:</strong> {{ lead.cpf || '—' }}</p>
                    <p><strong>RG:</strong> {{ lead.rg || '—' }}</p>
                    <p><strong>Nasc:</strong> {{ lead.birthDate ? new Date(lead.birthDate).toLocaleDateString() : '—' }}</p>
                    <p><strong>Estado Civil:</strong> {{ lead.maritalStatus || '—' }}</p>
                    <p><strong>Profissão:</strong> {{ lead.occupation || '—' }}</p>
                  </div>
                  <div class="col-md-6 mb-4">
                    <h3>Endereço</h3>
                    <p><strong>Logradouro:</strong> {{ lead.address || '—' }}</p>
                    <p><strong>CEP:</strong> {{ lead.addressZip || '—' }}</p>
                    <p><strong>Cidade:</strong> {{ lead.addressCity || '—' }} / {{ lead.addressState || '—' }}</p>
                  </div>
                </div>
                <h3>Mensagem / Observação Inicial</h3>
                <blockquote class="message-quote">{{ lead.message || 'Nenhuma mensagem disponível.' }}</blockquote>
              </div>

              <!-- Documents -->
              <div v-if="activeTab === 'docs'" class="tab-pane">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h3>Documentos</h3>
                  <button class="btn btn-neutral btn-sm" @click="showAddDoc = true">+ Anexar</button>
                </div>
                <div v-if="lead.documents?.length" class="doc-grid">
                  <div v-for="doc in lead.documents" :key="doc.id" class="doc-card">
                    <div class="doc-icon">📄</div>
                    <div class="doc-info">
                      <strong>{{ doc.name }}</strong>
                      <span>{{ new Date(doc.createdAt).toLocaleDateString() }}</span>
                    </div>
                    <a :href="doc.url" target="_blank" class="btn btn-sm btn-light">Ver</a>
                  </div>
                </div>
                <p v-else class="text-muted text-center py-4">Nenhum documento anexado.</p>
              </div>

              <!-- Finance -->
              <div v-if="activeTab === 'finance'" class="tab-pane">
                 <div class="d-flex justify-content-between align-items-center mb-3">
                  <h3>Pagamentos & Financeiro</h3>
                  <button v-if="authStore.isLoteadora" class="btn btn-neutral btn-sm" @click="showAddPayment = true">+ Adicionar</button>
                </div>
                <table v-if="lead.payments?.length" class="table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Vencimento</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="p in lead.payments" :key="p.id">
                      <td>{{ paymentLabel(p.type) }}</td>
                      <td>{{ p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}</td>
                      <td>{{ new Date(p.dueDate).toLocaleDateString() }}</td>
                      <td>
                        <span :class="['badge', p.status === 'PAID' ? 'badge-success' : 'badge-warning']">
                          {{ p.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p v-else class="text-muted text-center py-4">Nenhum registro financeiro.</p>
              </div>

              <!-- History -->
              <div v-if="activeTab === 'history'" class="tab-pane">
                <h3>Linha do Tempo</h3>
                <div class="timeline mt-3">
                  <div v-for="h in sortedHistory" :key="h.id" class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-meta">
                      <strong>{{ statusLabel(h.toStatus) }}</strong>
                      <span>{{ formatDateTime(h.createdAt) }}</span>
                    </div>
                    <div v-if="h.notes" class="timeline-content">
                      <p>{{ h.notes }}</p>
                    </div>
                    <div class="timeline-footer">Por {{ h.createdBy }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals Inner -->
    <div v-if="showAddDoc" class="modal-overlay" @click.self="showAddDoc = false">
      <div class="modal sm">
        <div class="modal-header"><h3>Novo Documento</h3></div>
        <div class="modal-body">
           <div class="form-group mb-3">
            <label>Nome (ex: RG Frente)</label>
            <input v-model="newDoc.name" type="text" class="form-control">
          </div>
          <div class="form-group mb-3">
            <label>URL (Simulação)</label>
            <input v-model="newDoc.url" type="text" class="form-control">
          </div>
          <div class="text-end">
            <button class="btn btn-primary" @click="saveDoc" :disabled="!newDoc.name || !newDoc.url">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  lead: { type: Object, required: true }
})
const emit = defineEmits(['close', 'refresh', 'edit'])

const { updateLeadStatus, addDocument, addPayment } = useLeads()
const authStore = useAuthStore()

const activeTab = ref('info')
const tabs = computed(() => {
  const t = [
    { id: 'info', label: 'Dados' },
    { id: 'docs', label: 'Documentos', count: props.lead.documents?.length },
    { id: 'history', label: 'Histórico' }
  ]
  if (authStore.isLoteadora || authStore.isSysAdmin) {
    t.push({ id: 'finance', label: 'Financeiro', count: props.lead.payments?.length })
  }
  return t
})

const sortedHistory = computed(() => {
  return [...(props.lead.history || [])].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
})

const statusOptions = {
  NEW: 'Novo', CONTACTED: 'Contatado', QUALIFIED: 'Qualificado',
  NEGOTIATING: 'Negociando', RESERVATION: 'Reserva Solic.', UNDER_REVIEW: 'Em Análise',
  WAITING_DOCS: 'Aguard. Docs', WAITING_PAYMENT: 'Aguard. Pagto', WON: 'Convertido',
  LOST: 'Perdido', CANCELLED: 'Cancelado', REVERSED: 'Estornado'
}

const statusLabel = (s) => statusOptions[s] || s
const paymentLabel = (p) => ({
  RESERVATION_FEE: 'Taxa de Reserva',
  ENTRY: 'Entrada',
  INSTALLMENT: 'Parcela',
  INTERMEDIARY: 'Intermediária'
}[p] || p)

const formatDateTime = (d) => new Date(d).toLocaleString('pt-BR')

const onStatusChange = async (newStatus) => {
  const notes = prompt('Alguma observação sobre essa mudança de status?') || ''
  await updateLeadStatus(props.lead.id, newStatus, notes)
  emit('refresh')
}

const openWhatsApp = () => {
  const phone = props.lead.phone.replace(/\D/g, '')
  window.open(`https://wa.me/55${phone}`, '_blank')
}

// Docs simplified for now
const showAddDoc = ref(false)
const newDoc = ref({ name: '', url: '', type: 'link' })
const saveDoc = async () => {
  await addDocument(props.lead.id, newDoc.value)
  showAddDoc.value = false
  newDoc.value = { name: '', url: '', type: 'link' }
  emit('refresh')
}

// Similar for payments... truncated for space
</script>

<style scoped>
.lead-view { display: flex; height: 75vh; }
.lead-sidebar { width: 300px; border-right: 1px solid var(--gray-200); padding: var(--space-4); background: var(--gray-50); overflow-y: auto; }
.lead-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.sidebar-section { margin-bottom: var(--space-6); }
.sidebar-section label { display: block; font-size: 0.6875rem; text-transform: uppercase; color: var(--gray-500); font-weight: 600; margin-bottom: var(--space-2); }
.info-row { display: flex; align-items: flex-start; gap: var(--space-2); margin-bottom: var(--space-2); font-size: 0.875rem; }
.info-row .icon { font-size: 1rem; }

.tabs { display: flex; padding: 0 var(--space-4); border-bottom: 1px solid var(--gray-200); background: white; }
.tab-btn { padding: var(--space-4) 0; margin-right: var(--space-6); background: none; border: none; font-weight: 500; color: var(--gray-500); border-bottom: 2px solid transparent; position: relative; cursor: pointer; }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
.tab-count { position: absolute; top: 12px; right: -18px; font-size: 0.625rem; background: var(--gray-100); padding: 1px 4px; border-radius: 4px; color: var(--gray-600); }

.tab-viewport { flex: 1; overflow-y: auto; padding: var(--space-6); background: white; }
.tab-pane h3 { font-size: 1rem; margin-bottom: var(--space-4); }

.message-quote { background: var(--gray-50); padding: var(--space-4); border-left: 4px solid var(--gray-200); font-style: italic; color: var(--gray-700); }

.doc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-4); }
.doc-card { border: 1px solid var(--gray-200); padding: var(--space-3); border-radius: var(--radius-md); display: flex; align-items: center; gap: var(--space-3); }
.doc-icon { font-size: 1.5rem; }
.doc-info { flex: 1; line-height: 1.2; }
.doc-info strong { display: block; font-size: 0.8125rem; }
.doc-info span { font-size: 0.6875rem; color: var(--gray-500); }

.timeline { position: relative; padding-left: 24px; border-left: 2px solid var(--gray-100); }
.timeline-item { margin-bottom: var(--space-6); position: relative; }
.timeline-dot { position: absolute; left: -31px; top: 4px; width: 12px; height: 12px; background: var(--primary); border: 2px solid white; border-radius: 50%; }
.timeline-meta { display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 4px; }
.timeline-content { background: var(--gray-50); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: 0.875rem; }
.timeline-footer { font-size: 0.6875rem; color: var(--gray-400); margin-top: 4px; }
</style>
