<template>
  <UiModal v-model="show" size="xl">
    <template #header>
      <div class="flex items-center gap-3 flex-1">
        <h2 class="text-lg font-semibold text-p-text">{{ lead.name }}</h2>
        <LeadsLeadStatusBadge :status="lead.status" />
      </div>
      <UiButton variant="secondary" size="sm" class="mr-2" :disabled="!canWriteLead" :title="!canWriteLead ? writePermissionHint : undefined" @click="$emit('edit', lead)">Editar Dados</UiButton>
    </template>

    <div class="flex -mx-5 -my-5 h-[75vh]">
      <!-- Sidebar: Info Summary -->
      <div class="w-[300px] shrink-0 border-r border-p-border p-4 bg-p-raised overflow-y-auto">
        <!-- Contact -->
        <div class="mb-6">
          <label class="block text-[0.6875rem] uppercase text-p-text-muted font-semibold mb-2">Contato</label>
          <div class="flex items-start gap-2 mb-2 text-sm text-p-text">
            <span class="text-base"><i class="bi bi-envelope-fill" aria-hidden="true"></i></span>
            <span>{{ lead.email || '—' }}</span>
          </div>
          <div class="flex items-start gap-2 mb-2 text-sm text-p-text">
            <span class="text-base"><i class="bi bi-telephone-fill" aria-hidden="true"></i></span>
            <span>{{ lead.phone || '—' }}</span>
          </div>
        </div>

        <!-- Project & Lot -->
        <div class="mb-6">
          <label class="block text-[0.6875rem] uppercase text-p-text-muted font-semibold mb-2">Projeto &amp; Lote</label>
          <div class="flex items-start gap-2 mb-2 text-sm text-p-text">
            <strong>Projeto:</strong> {{ lead.project?.name || '—' }}
          </div>
          <div class="flex items-start gap-2 mb-2 text-sm text-p-text">
            <strong>Lote:</strong> {{ lead.mapElement?.code || lead.lotCode || 'Interesse Geral' }}
          </div>
        </div>

        <!-- Realtor / Source -->
        <div class="mb-6">
          <label class="block text-[0.6875rem] uppercase text-p-text-muted font-semibold mb-2">Corretor / Origem</label>
          <div class="flex items-start gap-2 mb-2 text-sm text-p-text">
            <strong>Atribuído a:</strong> {{ lead.realtorLink?.name || 'Pendente' }}
          </div>
          <div class="flex items-start gap-2 mb-2 text-sm text-p-text">
            <strong>Origem:</strong> {{ lead.source || 'Website' }}
          </div>
          <div v-if="lead.aiChatTranscript" class="mb-2 text-sm">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">Interagiu com IA</span>
          </div>
        </div>

        <hr class="my-4 border-p-border">

        <!-- Quick Actions -->
        <div class="mb-6">
          <label class="block text-[0.6875rem] uppercase text-p-text-muted font-semibold mb-2">Ações Rápidas</label>
          <div class="grid gap-2">
            <UiSelect
              :model-value="lead.status"
              :disabled="!canWriteLead"
              @update:model-value="onStatusChange"
            >
              <option v-for="(label, code) in statusOptions" :key="code" :value="code">{{ label }}</option>
            </UiSelect>
            <UiButton v-if="lead.phone" variant="success" size="sm" class="w-full" @click="openWhatsApp">
              Chamar no WhatsApp
            </UiButton>
            <!-- Reserve lot button for CORRETOR / IMOBILIARIA -->
            <template v-if="(authStore.isCorretor || authStore.isImobiliaria) && canReserve">
              <button v-if="lead.mapElementId" class="w-full inline-flex items-center justify-center gap-2 font-semibold px-3 py-1.5 text-sm rounded-lg bg-gradient-to-br from-green-900 to-green-800 text-green-400 border border-green-700 hover:from-green-800 hover:to-green-700 hover:text-green-300 transition-colors" @click="showReserveConfirm = true">
                <i class="bi bi-lock-fill" aria-hidden="true"></i> Reservar para este Lead
              </button>
              <NuxtLink v-else to="/painel/reservar" class="w-full inline-flex items-center justify-center gap-2 font-semibold px-3 py-1.5 text-sm rounded-lg bg-gradient-to-br from-green-900 to-green-800 text-green-400 border border-green-700 hover:from-green-800 hover:to-green-700 hover:text-green-300 transition-colors text-center">
                <i class="bi bi-lock-fill" aria-hidden="true"></i> Iniciar Reserva de Lote
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>

      <!-- Main Content: Tabs -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <div class="flex px-4 border-b border-p-border bg-p-elevated">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="py-4 mr-6 bg-transparent border-0 font-medium text-p-text-muted border-b-2 border-transparent cursor-pointer relative transition-colors"
            :class="{ 'text-p-accent !border-p-accent': activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
            <span v-if="tab.count" class="absolute top-3 -right-[18px] text-[0.625rem] bg-white/[0.06] px-1 py-px rounded text-p-text-secondary">{{ tab.count }}</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 bg-p-elevated">
          <!-- General Info -->
          <div v-if="activeTab === 'info'">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h3 class="text-base mb-4 text-p-text">Documentação</h3>
                <p class="text-sm text-p-text"><strong>CPF:</strong> {{ lead.cpf || '—' }}</p>
                <p class="text-sm text-p-text"><strong>RG:</strong> {{ lead.rg || '—' }}</p>
                <p class="text-sm text-p-text"><strong>Nasc:</strong> {{ lead.birthDate ? formatDateToBrasilia(lead.birthDate) : '—' }}</p>
                <p class="text-sm text-p-text"><strong>Estado Civil:</strong> {{ lead.maritalStatus || '—' }}</p>
                <p class="text-sm text-p-text"><strong>Profissão:</strong> {{ lead.occupation || '—' }}</p>
              </div>
              <div>
                <h3 class="text-base mb-4 text-p-text">Endereço</h3>
                <p class="text-sm text-p-text"><strong>Logradouro:</strong> {{ lead.address || '—' }}</p>
                <p class="text-sm text-p-text"><strong>CEP:</strong> {{ lead.addressZip || '—' }}</p>
                <p class="text-sm text-p-text"><strong>Cidade:</strong> {{ lead.addressCity || '—' }} / {{ lead.addressState || '—' }}</p>
              </div>
            </div>
            <h3 class="text-base mb-4 text-p-text">Mensagem / Observação Inicial</h3>
            <blockquote class="bg-p-raised p-4 border-l-4 border-p-border italic text-p-text-secondary">{{ lead.message || 'Nenhuma mensagem disponível.' }}</blockquote>
          </div>

          <!-- Documents -->
          <div v-if="activeTab === 'docs'">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-base text-p-text">Documentos</h3>
              <UiButton variant="secondary" size="sm" :disabled="!canWriteLead" :title="!canWriteLead ? writePermissionHint : undefined" @click="showAddDoc = true">+ Anexar</UiButton>
            </div>
            <div v-if="lead.documents?.length" class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              <div v-for="doc in lead.documents" :key="doc.id" class="border border-p-border p-3 rounded-lg flex items-center gap-3">
                <div class="text-2xl text-p-text"><i class="bi bi-file-earmark-text-fill" aria-hidden="true"></i></div>
                <div class="flex-1 leading-tight">
                  <strong class="block text-[0.8125rem] text-p-text">{{ doc.name }}</strong>
                  <span class="text-[0.6875rem] text-p-text-muted">{{ formatDateToBrasilia(doc.createdAt) }}</span>
                </div>
                <a :href="doc.url" target="_blank" class="px-3 py-1.5 text-sm font-semibold rounded-lg text-p-text-secondary hover:bg-p-overlay hover:text-p-text transition-colors">Ver</a>
              </div>
            </div>
            <p v-else class="text-p-text-muted text-center py-4">Nenhum documento anexado.</p>
          </div>

          <!-- Finance -->
          <div v-if="activeTab === 'finance'">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-base text-p-text">Pagamentos &amp; Financeiro</h3>
              <UiButton variant="secondary" size="sm" :disabled="!canWritePayments" :title="!canWritePayments ? paymentsWritePermissionHint : undefined" @click="showAddPayment = true">+ Adicionar</UiButton>
            </div>
            <UiTable v-if="lead.payments?.length">
              <template #head>
                <th class="px-4 py-3 text-left text-xs font-semibold text-p-text-secondary uppercase">Tipo</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-p-text-secondary uppercase">Valor</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-p-text-secondary uppercase">Vencimento</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-p-text-secondary uppercase">Status</th>
              </template>
              <tr v-for="p in lead.payments" :key="p.id">
                <td class="px-4 py-3 text-sm text-p-text">{{ paymentLabel(p.type) }}</td>
                <td class="px-4 py-3 text-sm text-p-text">{{ p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}</td>
                <td class="px-4 py-3 text-sm text-p-text">{{ formatDateToBrasilia(p.dueDate) }}</td>
                <td class="px-4 py-3">
                  <UiBadge :variant="p.status === 'PAID' ? 'success' : 'warning'">{{ p.status }}</UiBadge>
                </td>
              </tr>
            </UiTable>
            <p v-else class="text-p-text-muted text-center py-4">Nenhum registro financeiro.</p>
          </div>

          <!-- History -->
          <div v-if="activeTab === 'history'">
            <h3 class="text-base mb-4 text-p-text">Linha do Tempo</h3>
            <div class="relative pl-6 border-l-2 border-p-border mt-3">
              <div v-for="h in sortedHistory" :key="h.id" class="mb-6 relative">
                <div class="absolute -left-[25px] top-1 w-3 h-3 bg-p-accent border-2 border-p-border rounded-full"></div>
                <div class="flex justify-between text-[0.8125rem] mb-1">
                  <strong class="text-p-text">{{ statusLabel(h.toStatus) }}</strong>
                  <span class="text-p-text-muted">{{ formatDateTime(h.createdAt) }}</span>
                </div>
                <div v-if="h.notes" class="bg-p-raised px-3 py-2 rounded text-sm text-p-text">
                  <p>{{ h.notes }}</p>
                </div>
                <div class="text-[0.6875rem] text-p-text-muted mt-1">Por {{ h.createdBy }}</div>
              </div>
            </div>
          </div>

          <!-- AI Chat -->
          <div v-if="activeTab === 'ai'">
            <h3 class="text-base mb-4 text-p-text">Interação com Assistente Virtual</h3>

            <div v-if="lead.aiChatSummary" class="bg-p-raised p-4 rounded-lg border-l-4 border-indigo-400">
              <label class="block text-[0.6875rem] uppercase text-p-text-muted font-semibold mb-2">Resumo gerado pela IA</label>
              <p class="text-[0.9375rem] leading-relaxed text-p-text-secondary m-0">{{ lead.aiChatSummary }}</p>
            </div>
            <div v-else class="bg-p-raised p-4 rounded-lg border-l-4 border-p-border italic text-p-text-muted">
              <p>Resumo sendo gerado...</p>
            </div>

            <div v-if="parsedTranscript.length" class="mt-4">
              <div class="flex justify-between items-center mb-3">
                <label class="block text-[0.6875rem] uppercase text-p-text-muted font-semibold">
                  Conversa completa ({{ parsedTranscript.length }} mensagens)
                </label>
                <UiButton variant="ghost" size="sm" @click="showFullTranscript = !showFullTranscript">
                  {{ showFullTranscript ? 'Recolher' : 'Expandir' }}
                </UiButton>
              </div>
              <div v-if="showFullTranscript" class="max-h-[400px] overflow-y-auto flex flex-col gap-2">
                <div
                  v-for="(msg, i) in parsedTranscript"
                  :key="i"
                  class="px-3.5 py-2.5 rounded text-sm"
                  :class="msg.role === 'user' ? 'bg-indigo-500/[0.08] border border-indigo-500/15 ml-6' : 'bg-p-raised border border-p-border mr-6'"
                >
                  <strong class="block text-[0.6875rem] uppercase mb-1 text-p-text-muted">{{ msg.role === 'user' ? 'Visitante' : 'Assistente IA' }}</strong>
                  <p class="m-0 leading-relaxed text-p-text">{{ cleanMessageText(msg.text) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UiModal>

  <!-- Reserve Lot Confirmation -->
  <UiModal v-model="showReserveConfirm" title="Confirmar Reserva" size="sm">
    <p class="text-p-text">Deseja reservar o lote <strong>{{ lead.mapElement?.code || lead.lotCode }}</strong> para <strong>{{ lead.name }}</strong>?</p>
    <p class="text-sm text-p-text-muted mt-2">O lote ficará bloqueado para outros compradores imediatamente.</p>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" size="sm" @click="showReserveConfirm = false">Cancelar</UiButton>
        <UiButton size="sm" :disabled="reserving" @click="confirmReserveLot">
          <span v-if="reserving">Reservando...</span>
          <span v-else class="inline-flex items-center gap-1.5">
            <i class="bi bi-lock-fill" aria-hidden="true"></i>
            <span>Confirmar Reserva</span>
          </span>
        </UiButton>
      </div>
    </template>
  </UiModal>

  <!-- Add Document -->
  <UiModal v-model="showAddDoc" title="Novo Documento" size="sm">
    <div class="mb-3">
      <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Nome (ex: RG Frente)</label>
      <input v-model="newDoc.name" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent">
    </div>
    <div class="mb-3">
      <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">URL (Simulação)</label>
      <input v-model="newDoc.url" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent">
    </div>
    <template #footer>
      <div class="flex justify-end">
        <UiButton :disabled="!canWriteLead || !newDoc.name || !newDoc.url" :title="!canWriteLead ? writePermissionHint : undefined" @click="saveDoc">Salvar</UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup>
const props = defineProps({
  lead: { type: Object, required: true }
})
const emit = defineEmits(['close', 'refresh', 'edit'])

const show = ref(true)
watch(show, (val) => {
  if (!val) emit('close')
})

const { updateLeadStatus, addDocument, addPayment } = useLeads()
const authStore = useAuthStore()
const canWriteLead = computed(() => {
  if (authStore.isLoteadora || authStore.isSysAdmin) {
    return authStore.canWriteFeature('leads')
  }
  return true
})
const canReadPayments = computed(() => {
  if (authStore.isLoteadora || authStore.isSysAdmin) {
    return authStore.canReadFeature('payments')
  }
  return false
})
const canWritePayments = computed(() => {
  if (authStore.isLoteadora || authStore.isSysAdmin) {
    return authStore.canWriteFeature('payments')
  }
  return false
})
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição'
const paymentsWritePermissionHint = 'Disponível apenas para usuários com permissão de edição em Pagamentos'

const activeTab = ref('info')

// AI Chat
const showFullTranscript = ref(false)

const parsedTranscript = computed(() => {
  if (!props.lead.aiChatTranscript) return []
  try {
    return JSON.parse(props.lead.aiChatTranscript)
  } catch {
    return []
  }
})

const cleanMessageText = (text) => {
  return text.replace(/:::LOT_CARD[\s\S]*?:::/g, '[Sugestão de lote exibida]').trim()
}

// Reservation state
const showReserveConfirm = ref(false)
const reserving = ref(false)

const canReserve = computed(() => {
  const reservableStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING']
  return reservableStatuses.includes(props.lead.status)
})

const confirmReserveLot = async () => {
  reserving.value = true
  try {
    await updateLeadStatus(props.lead.id, 'RESERVATION', 'Reserva realizada via painel')
    showReserveConfirm.value = false
    emit('refresh')
  } catch (e) {
    // error handled in useLeads
  } finally {
    reserving.value = false
  }
}
const tabs = computed(() => {
  const t = [
    { id: 'info', label: 'Dados' },
    { id: 'docs', label: 'Documentos', count: props.lead.documents?.length },
    { id: 'history', label: 'Histórico' }
  ]
  if (props.lead.aiChatTranscript || props.lead.aiChatSummary) {
    t.splice(1, 0, { id: 'ai', label: 'Chat IA' })
  }
  if (canReadPayments.value) {
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
  LOST: 'Perdido', CANCELLED: 'Cancelado', ABANDONED: 'Abandonou Checkout', REVERSED: 'Estornado'
}

const statusLabel = (s) => statusOptions[s] || s
const paymentLabel = (p) => ({
  RESERVATION_FEE: 'Taxa de Reserva',
  ENTRY: 'Entrada',
  INSTALLMENT: 'Parcela',
  INTERMEDIARY: 'Intermediária'
}[p] || p)

const formatDateTime = (d) => formatDateTimeToBrasilia(d)

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
