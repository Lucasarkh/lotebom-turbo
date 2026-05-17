<template>
  <div class="space-y-6">
    <UiLoadingState v-if="loading" />

    <div v-else-if="error" class="flex min-h-[55vh] flex-col items-center justify-center gap-3.5">
      <p class="text-p-text-secondary">{{ error }}</p>
      <UiButton variant="primary" @click="loadPage">Tentar novamente</UiButton>
    </div>

    <template v-else>
      <div>
        <NuxtLink :to="`/painel/projetos/${projectId}`" class="mb-3 inline-flex items-center gap-1.5 text-sm text-p-text-muted transition-colors hover:text-p-text">
          <i class="bi bi-arrow-left-short text-lg" aria-hidden="true"></i>
          <span>Voltar ao Projeto</span>
        </NuxtLink>
        <UiPageHeader title="Reservas" description="Centralize o acompanhamento da reserva, organize contratos e execute as acoes operacionais sem espalhar atalhos pelo painel.">
          <template #actions>
            <UiButton variant="primary" :disabled="saving" @click="saveConfig">
              {{ saving ? 'Salvando...' : 'Salvar configuracao' }}
            </UiButton>
          </template>
        </UiPageHeader>
      </div>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div class="rounded-2xl border border-p-border bg-p-elevated p-5">
          <span class="mb-2 block text-xs font-bold uppercase tracking-widest text-p-text-muted">Reservas em fluxo</span>
          <strong class="text-3xl font-bold text-p-text">{{ metrics.summary.totalReservations }}</strong>
        </div>
        <div class="rounded-2xl border border-p-border bg-p-elevated p-5">
          <span class="mb-2 block text-xs font-bold uppercase tracking-widest text-p-text-muted">Vendas confirmadas</span>
          <strong class="text-3xl font-bold text-p-text">{{ metrics.summary.totalSales }}</strong>
        </div>
        <div class="rounded-2xl border border-p-border bg-p-elevated p-5">
          <span class="mb-2 block text-xs font-bold uppercase tracking-widest text-p-text-muted">Conversao</span>
          <strong class="text-3xl font-bold text-p-text">{{ metrics.summary.conversionRate }}%</strong>
        </div>
        <div class="rounded-2xl border border-p-border bg-p-elevated p-5">
          <span class="mb-2 block text-xs font-bold uppercase tracking-widest text-p-text-muted">Fechamento medio</span>
          <strong class="text-3xl font-bold text-p-text">{{ metrics.summary.averageClosingHours }}h</strong>
        </div>
        <div class="rounded-2xl border border-p-border bg-p-elevated p-5">
          <span class="mb-2 block text-xs font-bold uppercase tracking-widest text-p-text-muted">Contratos assinados</span>
          <strong class="text-3xl font-bold text-p-text">{{ metrics.summary.contractSignedRate }}%</strong>
        </div>
      </div>

      <UiCard padding="lg" class="col-span-full">
        <div class="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <h2 class="text-lg font-semibold text-p-text">Central de reservas</h2>
            <p class="mt-1.5 text-sm leading-relaxed text-p-text-muted">Edite dados da reserva, libere o lote, cancele a reserva ou confirme a venda sem sair deste menu.</p>
          </div>
          <UiButton variant="secondary" :disabled="reservationsLoading" @click="loadReservations">
            {{ reservationsLoading ? 'Atualizando...' : 'Atualizar lista' }}
          </UiButton>
        </div>

        <div v-if="reservationsLoading" class="mt-4 text-p-text-muted">Carregando reservas...</div>
        <div v-else-if="!reservations.length" class="mt-4 text-p-text-muted">Nenhuma reserva encontrada para este projeto.</div>
        <div v-else class="mt-4 flex flex-col gap-4">
          <article
            v-for="reservation in reservations"
            :key="reservation.leadId"
            class="space-y-4 rounded-2xl border border-p-border bg-p-overlay/50 p-5"
          >
            <div class="flex flex-col items-start justify-between gap-4 sm:flex-row">
              <div>
                <p class="mb-2 text-xs font-bold uppercase tracking-widest text-p-text-muted">{{ reservation.projectName }}</p>
                <h3 class="mb-1 text-base font-semibold text-p-text">{{ reservation.customerName || 'Cliente sem nome' }}</h3>
                <p class="text-sm text-p-text-secondary">
                  Lote {{ reservation.lotCode || 'Nao definido' }}
                  <span v-if="reservation.block">· Quadra {{ reservation.block }}</span>
                </p>
              </div>
              <span
                class="inline-flex min-w-[110px] items-center justify-center rounded-full px-3 py-1.5 text-xs font-bold"
                :class="reservation.cancelledAt ? 'bg-p-danger-subtle text-p-danger' : 'bg-p-success-subtle text-p-success'"
              >
                {{ reservation.cancelledAt ? 'Encerrada' : 'Ativa' }}
              </span>
            </div>

            <div class="grid grid-cols-1 gap-2.5 text-sm text-p-text-secondary sm:grid-cols-3">
              <span><strong class="text-p-text">E-mail:</strong> {{ reservation.customerEmail || '—' }}</span>
              <span><strong class="text-p-text">WhatsApp:</strong> {{ reservation.customerPhone || '—' }}</span>
              <span><strong class="text-p-text">Status:</strong> {{ formatLeadStatus(reservation.leadStatus) }}</span>
              <span><strong class="text-p-text">Etapa:</strong> {{ formatStepLabel(reservation.currentStep) }}</span>
              <span><strong class="text-p-text">Expira em:</strong> {{ formatReservationExpiry(reservation.reservationExpiresAt) }}</span>
              <span><strong class="text-p-text">Contrato:</strong> {{ formatContractStatus(reservation.contractStatus) }}</span>
            </div>

            <div class="flex flex-wrap gap-2.5">
              <UiButton variant="secondary" size="sm" @click="openReservationEditor(reservation)">Editar reserva</UiButton>
              <UiButton
                variant="ghost"
                size="sm"
                :disabled="reservationActingLeadId === reservation.leadId || !reservation.actions?.canRelease"
                @click="runReservationAction(reservation, 'release', 'Reserva liberada com sucesso.')"
              >
                {{ reservationActingLeadId === reservation.leadId ? 'Processando...' : 'Liberar reserva' }}
              </UiButton>
              <UiButton
                variant="danger"
                size="sm"
                :disabled="reservationActingLeadId === reservation.leadId || !reservation.actions?.canCancel"
                @click="runReservationAction(reservation, 'cancel', 'Reserva cancelada com sucesso.')"
              >
                Cancelar reserva
              </UiButton>
              <UiButton
                variant="success"
                size="sm"
                :disabled="reservationActingLeadId === reservation.leadId || !reservation.actions?.canConfirmSale"
                @click="confirmSaleReservation(reservation)"
              >
                Confirmar venda
              </UiButton>
            </div>
          </article>
        </div>
      </UiCard>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UiCard padding="lg">
          <h2 class="text-lg font-semibold text-p-text">Regras do fluxo</h2>
          <p class="mt-1.5 text-sm leading-relaxed text-p-text-muted">Defina quais campos e documentos sao obrigatorios e em quais estados civis o cadastro do conjugue sera exigido.</p>

          <div class="mt-5 space-y-5">
            <label class="flex items-center gap-2 text-sm text-p-text-secondary">
              <input v-model="form.autoGenerateContract" type="checkbox" class="accent-p-accent" />
              <span>Gerar contrato automaticamente quando a etapa estiver liberada</span>
            </label>

            <div>
              <label class="mb-1.5 block text-sm font-semibold text-p-text-secondary">Provedor de assinatura</label>
              <select v-model="form.signatureProvider" class="w-full rounded-lg border border-p-border bg-p-overlay px-3 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none">
                <option value="MANUAL">Manual</option>
                <option value="DOCUSIGN">DocuSign</option>
                <option value="CLICKSIGN">Clicksign</option>
                <option value="ZAPSIGN">ZapSign</option>
              </select>
            </div>

            <div>
              <h3 class="text-sm font-semibold text-p-text">Campos obrigatorios</h3>
              <p class="mb-3 text-xs text-p-text-muted">Esses campos aparecem no cadastro do titular.</p>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label v-for="field in fieldOptions" :key="field.field" class="flex items-center gap-2 rounded-xl bg-p-overlay/50 px-3.5 py-3 text-sm text-p-text-secondary">
                  <input v-model="field.required" type="checkbox" class="accent-p-accent" />
                  <span>{{ field.label }}</span>
                </label>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-semibold text-p-text">Documentos obrigatorios</h3>
              <p class="mb-3 text-xs text-p-text-muted">O cliente so avanca para simulacao depois de enviar todos os itens marcados.</p>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label v-for="doc in documentOptions" :key="doc.documentType" class="flex items-center gap-2 rounded-xl bg-p-overlay/50 px-3.5 py-3 text-sm text-p-text-secondary">
                  <input v-model="doc.required" type="checkbox" class="accent-p-accent" />
                  <span>{{ doc.label }}</span>
                </label>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-semibold text-p-text">Estados civis que exigem conjugue</h3>
              <p class="mb-3 text-xs text-p-text-muted">Use valores como CASADO e UNIAO_ESTAVEL.</p>
              <div class="mb-3 flex flex-wrap gap-2.5">
                <span v-for="(status, index) in form.requireSpouseWhenMaritalStatus" :key="`${status}-${index}`" class="inline-flex items-center gap-2 rounded-full bg-p-success-subtle px-3 py-1.5 text-sm text-p-success">
                  {{ status }}
                  <button type="button" class="cursor-pointer border-0 bg-transparent text-current" @click="removeSpouseStatus(index)">x</button>
                </span>
              </div>
              <div class="flex gap-3">
                <input v-model="newSpouseStatus" class="flex-1 rounded-lg border border-p-border bg-p-overlay px-3 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Digite um estado civil e pressione adicionar" @keydown.enter.prevent="addSpouseStatus" />
                <UiButton variant="secondary" @click="addSpouseStatus">Adicionar</UiButton>
              </div>
            </div>
          </div>
        </UiCard>

        <UiCard padding="lg">
          <h2 class="text-lg font-semibold text-p-text">Tabelas de pagamento</h2>
          <p class="mt-1.5 text-sm leading-relaxed text-p-text-muted">Monte combinacoes comerciais por empreendimento com entrada minima, limite de parcelas e cenarios prontos para o cliente aprovar.</p>

          <div class="mt-5 space-y-4">
            <article v-for="(table, tableIndex) in form.paymentTables" :key="table.localId" class="space-y-3.5 rounded-2xl border border-p-border bg-p-overlay/50 p-4">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold text-p-text">{{ table.name || `Tabela ${tableIndex + 1}` }}</h3>
                <UiButton variant="danger" size="sm" @click="removePaymentTable(tableIndex)">Remover</UiButton>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label class="space-y-1.5">
                  <span class="text-xs font-medium text-p-text-secondary">Nome</span>
                  <input v-model="table.name" class="w-full rounded-lg border border-p-border bg-p-overlay px-3 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" placeholder="Tabela Comercial Prime" />
                </label>
                <label class="space-y-1.5">
                  <span class="text-xs font-medium text-p-text-secondary">Entrada minima (%)</span>
                  <input v-model.number="table.entryMinPercent" type="number" min="0" class="w-full rounded-lg border border-p-border bg-p-overlay px-3 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" />
                </label>
                <label class="space-y-1.5">
                  <span class="text-xs font-medium text-p-text-secondary">Maximo de parcelas</span>
                  <input v-model.number="table.maxInstallments" type="number" min="1" class="w-full rounded-lg border border-p-border bg-p-overlay px-3 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" />
                </label>
                <label class="space-y-1.5">
                  <span class="text-xs font-medium text-p-text-secondary">Indice de correcao</span>
                  <input v-model="table.correctionIndex" class="w-full rounded-lg border border-p-border bg-p-overlay px-3 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" placeholder="INCC" />
                </label>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <h4 class="text-xs font-semibold text-p-text-secondary">Cenarios da tabela</h4>
                  <UiButton variant="secondary" size="sm" @click="addCondition(tableIndex)">Nova condicao</UiButton>
                </div>

                <div v-for="(condition, conditionIndex) in table.conditions" :key="condition.localId" class="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                  <input v-model.number="condition.numberInstallments" type="number" min="1" class="rounded-lg border border-p-border bg-p-overlay px-3 py-2 text-sm text-p-text focus:border-p-accent focus:outline-none" placeholder="Parcelas" />
                  <input v-model.number="condition.entryAmount" type="number" min="0" class="rounded-lg border border-p-border bg-p-overlay px-3 py-2 text-sm text-p-text focus:border-p-accent focus:outline-none" placeholder="Entrada" />
                  <input v-model.number="condition.installmentAmount" type="number" min="0" class="rounded-lg border border-p-border bg-p-overlay px-3 py-2 text-sm text-p-text focus:border-p-accent focus:outline-none" placeholder="Valor da parcela" />
                  <input v-model.number="condition.totalAmount" type="number" min="0" class="rounded-lg border border-p-border bg-p-overlay px-3 py-2 text-sm text-p-text focus:border-p-accent focus:outline-none" placeholder="Total estimado" />
                  <UiButton variant="danger" size="sm" @click="removeCondition(tableIndex, conditionIndex)">Excluir</UiButton>
                </div>
              </div>
            </article>

            <UiButton variant="secondary" @click="addPaymentTable">Adicionar tabela</UiButton>
          </div>
        </UiCard>

        <UiCard padding="lg">
          <h2 class="text-lg font-semibold text-p-text">Templates de contrato</h2>
          <p class="mt-1.5 text-sm leading-relaxed text-p-text-muted">Use variaveis como &#123;&#123;cliente_nome&#125;&#125;, &#123;&#123;cliente_cpf&#125;&#125;, &#123;&#123;lote_numero&#125;&#125;, &#123;&#123;quadra&#125;&#125;, &#123;&#123;valor_total&#125;&#125;, &#123;&#123;entrada&#125;&#125; e &#123;&#123;parcelas&#125;&#125;.</p>

          <div class="mt-5 space-y-4">
            <article v-for="(template, templateIndex) in form.contractTemplates" :key="template.localId" class="space-y-3.5 rounded-2xl border border-p-border bg-p-overlay/50 p-4">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold text-p-text">{{ template.title || `Template ${templateIndex + 1}` }}</h3>
                <UiButton variant="danger" size="sm" @click="removeTemplate(templateIndex)">Remover</UiButton>
              </div>

              <label class="block space-y-1.5">
                <span class="text-xs font-medium text-p-text-secondary">Titulo</span>
                <input v-model="template.title" class="w-full rounded-lg border border-p-border bg-p-overlay px-3 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" placeholder="Contrato de compra e venda" />
              </label>
              <label class="block space-y-1.5">
                <span class="text-xs font-medium text-p-text-secondary">Conteudo</span>
                <textarea v-model="template.contentTemplate" class="w-full resize-y rounded-lg border border-p-border bg-p-overlay px-3 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" rows="8" placeholder="Escreva o texto base do contrato."></textarea>
              </label>
              <label class="flex items-center gap-2 text-sm text-p-text-secondary">
                <input :checked="template.isActive" type="checkbox" class="accent-p-accent" @change="setTemplateActive(templateIndex)" />
                <span>Usar como template ativo</span>
              </label>
            </article>

            <UiButton variant="secondary" @click="addTemplate">Adicionar template</UiButton>
          </div>
        </UiCard>

        <UiCard padding="lg">
          <h2 class="text-lg font-semibold text-p-text">Abandono por etapa</h2>
          <p class="mt-1.5 text-sm leading-relaxed text-p-text-muted">Veja onde o cliente costuma parar antes da confirmacao da venda.</p>

          <div v-if="metrics.abandonmentByStep?.length" class="mt-4 space-y-3">
            <article v-for="item in metrics.abandonmentByStep" :key="item.step" class="flex items-center justify-between gap-4 rounded-xl bg-p-overlay/50 p-3.5">
              <div>
                <strong class="block text-sm text-p-text">{{ item.step }}</strong>
                <p class="mt-1 text-xs text-p-text-muted">{{ formatStepLabel(item.step) }}</p>
              </div>
              <span class="text-xl font-bold text-p-text">{{ item.count }}</span>
            </article>
          </div>
          <p v-else class="mt-4 text-sm text-p-text-muted">Nenhum abandono registrado ainda.</p>
        </UiCard>
      </div>
    </template>

    <UiModal v-model="showReservationEditor" title="Editar reserva" size="md">
      <div class="space-y-3.5">
        <UiInput v-model="reservationForm.name" label="Nome do cliente" />
        <UiInput v-model="reservationForm.email" label="E-mail" type="email" />
        <UiInput v-model="reservationForm.phone" label="WhatsApp" />
        <UiInput v-model="reservationForm.cpf" label="CPF" />
        <div>
          <label class="mb-1 block text-sm font-medium text-p-text-secondary">Expiracao da reserva</label>
          <input v-model="reservationForm.reservationExpiresAt" type="datetime-local" class="w-full rounded-lg border border-p-border bg-p-overlay px-3 py-2.5 text-sm text-p-text [color-scheme:dark] focus:border-p-accent focus:outline-none" />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UiButton variant="ghost" size="sm" @click="closeReservationEditor">Fechar</UiButton>
          <UiButton variant="primary" size="sm" :disabled="savingReservationEdit" @click="saveReservationEdit">
            {{ savingReservationEdit ? 'Salvando...' : 'Salvar reserva' }}
          </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const projectId = route.params.id as string
const { get, put, patch } = useApi()
const { success: toastSuccess, fromError: toastFromError } = useToast()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const reservationsLoading = ref(false)
const reservations = ref<any[]>([])
const reservationActingLeadId = ref('')
const editingReservation = ref<any | null>(null)
const savingReservationEdit = ref(false)

const showReservationEditor = computed({
  get: () => !!editingReservation.value,
  set: (v: boolean) => { if (!v) closeReservationEditor() }
})

const reservationForm = reactive({
  leadId: '',
  name: '',
  email: '',
  phone: '',
  cpf: '',
  reservationExpiresAt: '',
})

const metrics = reactive({
  summary: {
    totalReservations: 0,
    totalSales: 0,
    conversionRate: 0,
    averageClosingHours: 0,
    contractSignedRate: 0,
  },
  abandonmentByStep: [] as Array<{ step: string; count: number }>,
})

const fieldCatalog = [
  { field: 'name', label: 'Nome completo' },
  { field: 'email', label: 'E-mail' },
  { field: 'phone', label: 'Telefone' },
  { field: 'cpf', label: 'CPF' },
  { field: 'rg', label: 'RG' },
  { field: 'maritalStatus', label: 'Estado civil' },
  { field: 'occupation', label: 'Profissao' },
  { field: 'monthlyIncome', label: 'Renda mensal' },
  { field: 'address', label: 'Endereco' },
  { field: 'addressCity', label: 'Cidade' },
  { field: 'addressState', label: 'Estado' },
  { field: 'addressZip', label: 'CEP' },
]

const documentCatalog = [
  { documentType: 'RG', label: 'RG' },
  { documentType: 'CPF', label: 'CPF' },
  { documentType: 'CNH', label: 'CNH' },
  { documentType: 'CERTIDAO_CASAMENTO', label: 'Certidao de casamento' },
  { documentType: 'COMPROVANTE_RENDA', label: 'Comprovante de renda' },
  { documentType: 'COMPROVANTE_RESIDENCIA', label: 'Comprovante de residencia' },
  { documentType: 'CONTRATO_SOCIAL', label: 'Contrato social' },
  { documentType: 'OUTROS', label: 'Outros' },
]

const fieldOptions = ref(fieldCatalog.map((item) => ({ ...item, required: false })))
const documentOptions = ref(documentCatalog.map((item) => ({ ...item, required: false })))
const newSpouseStatus = ref('')

const form = reactive({
  signatureProvider: 'MANUAL',
  autoGenerateContract: true,
  requireSpouseWhenMaritalStatus: ['CASADO', 'UNIAO_ESTAVEL'] as string[],
  paymentTables: [] as any[],
  contractTemplates: [] as any[],
})

function createCondition() {
  return {
    localId: crypto.randomUUID(),
    numberInstallments: 12,
    entryAmount: 0,
    installmentAmount: 0,
    totalAmount: 0,
  }
}

function createPaymentTable() {
  return {
    localId: crypto.randomUUID(),
    name: '',
    entryMinPercent: 10,
    maxInstallments: 12,
    correctionIndex: 'INCC',
    conditions: [createCondition()],
  }
}

function createTemplate() {
  return {
    localId: crypto.randomUUID(),
    title: '',
    contentTemplate: '',
    isActive: form.contractTemplates.length === 0,
  }
}

function hydrateConfig(config: any) {
  fieldOptions.value = fieldCatalog.map((item) => ({
    ...item,
    required: Boolean(config?.fieldRequirements?.find((field: any) => field.field === item.field && field.required)),
  }))
  documentOptions.value = documentCatalog.map((item) => ({
    ...item,
    required: Boolean(config?.documentRequirements?.find((doc: any) => doc.documentType === item.documentType && doc.required)),
  }))
  form.signatureProvider = String(config?.signatureProvider || 'MANUAL')
  form.autoGenerateContract = Boolean(config?.autoGenerateContract ?? true)
  form.requireSpouseWhenMaritalStatus = Array.isArray(config?.requireSpouseWhenMaritalStatus)
    ? [...config.requireSpouseWhenMaritalStatus]
    : ['CASADO', 'UNIAO_ESTAVEL']
  form.paymentTables = (config?.paymentTables || []).map((table: any) => ({
    localId: crypto.randomUUID(),
    name: table.name,
    entryMinPercent: Number(table.entryMinPercent || 0),
    maxInstallments: Number(table.maxInstallments || 0),
    correctionIndex: table.correctionIndex || '',
    conditions: (table.conditions || []).map((condition: any) => ({
      localId: crypto.randomUUID(),
      numberInstallments: Number(condition.numberInstallments || 0),
      entryAmount: Number(condition.entryAmount || 0),
      installmentAmount: Number(condition.installmentAmount || 0),
      totalAmount: Number(condition.totalAmount || 0),
    })),
  }))
  form.contractTemplates = (config?.contractTemplates || []).map((template: any) => ({
    localId: crypto.randomUUID(),
    title: template.title,
    contentTemplate: template.contentTemplate,
    isActive: Boolean(template.isActive),
  }))

  if (!form.paymentTables.length) addPaymentTable()
  if (!form.contractTemplates.length) addTemplate()
}

async function loadPage() {
  loading.value = true
  error.value = ''
  try {
    const [configResponse, metricsResponse] = await Promise.all([
      get(`/purchase-flow/config/${projectId}`),
      get(`/purchase-flow/metrics?projectId=${projectId}`),
    ])

    hydrateConfig(configResponse)
    metrics.summary = metricsResponse.summary
    metrics.abandonmentByStep = metricsResponse.abandonmentByStep || []
    await loadReservations()
  } catch (e: any) {
    error.value = e.message || 'Falha ao carregar a central de reservas.'
  } finally {
    loading.value = false
  }
}

async function loadReservations() {
  reservationsLoading.value = true
  try {
    reservations.value = await get(`/purchase-flow/reservations?projectId=${projectId}`)
  } catch (e: any) {
    toastFromError(e, 'Falha ao carregar reservas')
  } finally {
    reservationsLoading.value = false
  }
}

function addSpouseStatus() {
  const normalized = newSpouseStatus.value.trim().toUpperCase()
  if (!normalized || form.requireSpouseWhenMaritalStatus.includes(normalized)) return
  form.requireSpouseWhenMaritalStatus.push(normalized)
  newSpouseStatus.value = ''
}

function removeSpouseStatus(index: number) {
  form.requireSpouseWhenMaritalStatus.splice(index, 1)
}

function addPaymentTable() {
  form.paymentTables.push(createPaymentTable())
}

function removePaymentTable(index: number) {
  form.paymentTables.splice(index, 1)
  if (!form.paymentTables.length) addPaymentTable()
}

function addCondition(tableIndex: number) {
  form.paymentTables[tableIndex].conditions.push(createCondition())
}

function removeCondition(tableIndex: number, conditionIndex: number) {
  const conditions = form.paymentTables[tableIndex].conditions
  conditions.splice(conditionIndex, 1)
  if (!conditions.length) conditions.push(createCondition())
}

function addTemplate() {
  form.contractTemplates.push(createTemplate())
}

function removeTemplate(index: number) {
  const wasActive = form.contractTemplates[index]?.isActive
  form.contractTemplates.splice(index, 1)
  if (!form.contractTemplates.length) {
    addTemplate()
    return
  }
  if (wasActive) {
    form.contractTemplates[0].isActive = true
  }
}

function setTemplateActive(activeIndex: number) {
  form.contractTemplates.forEach((template, index) => {
    template.isActive = index === activeIndex
  })
}

function buildPayload() {
  return {
    signatureProvider: form.signatureProvider,
    autoGenerateContract: form.autoGenerateContract,
    requireSpouseWhenMaritalStatus: form.requireSpouseWhenMaritalStatus,
    requiredFields: fieldOptions.value.map((field) => ({
      field: field.field,
      label: field.label,
      required: field.required,
    })),
    requiredDocuments: documentOptions.value.map((doc) => ({
      documentType: doc.documentType,
      required: doc.required,
    })),
    paymentTables: form.paymentTables
      .filter((table) => table.name.trim())
      .map((table) => ({
        name: table.name.trim(),
        entryMinPercent: Number(table.entryMinPercent || 0),
        maxInstallments: Number(table.maxInstallments || 0),
        correctionIndex: table.correctionIndex || 'INCC',
        conditions: table.conditions
          .filter((condition: any) => Number(condition.numberInstallments || 0) > 0)
          .map((condition: any) => ({
            numberInstallments: Number(condition.numberInstallments || 0),
            entryAmount: Number(condition.entryAmount || 0),
            installmentAmount: Number(condition.installmentAmount || 0),
            totalAmount: Number(condition.totalAmount || 0),
          })),
      })),
    contractTemplates: form.contractTemplates
      .filter((template) => template.title.trim() && template.contentTemplate.trim())
      .map((template) => ({
        title: template.title.trim(),
        contentTemplate: template.contentTemplate,
        isActive: template.isActive,
      })),
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const response = await put(`/purchase-flow/config/${projectId}`, buildPayload())
    hydrateConfig(response)
    toastSuccess('Configuracao do fluxo salva com sucesso.')
  } catch (e: any) {
    toastFromError(e, 'Falha ao salvar configuracao de reservas')
  } finally {
    saving.value = false
  }
}

function formatLeadStatus(status: string) {
  const labels: Record<string, string> = {
    RESERVATION: 'Reserva ativa',
    NEGOTIATING: 'Em negociacao',
    WON: 'Venda confirmada',
    CANCELLED: 'Cancelada',
    ABANDONED: 'Expirada',
  }
  return labels[status] || formatStepLabel(status)
}

function formatContractStatus(status?: string | null) {
  if (!status) return 'Nao gerado'
  return formatStepLabel(status)
}

function formatReservationExpiry(value?: string | null) {
  if (!value) return 'Sem prazo ativo'
  return new Date(value).toLocaleString('pt-BR')
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60000)
  return localDate.toISOString().slice(0, 16)
}

function openReservationEditor(reservation: any) {
  editingReservation.value = reservation
  reservationForm.leadId = reservation.leadId
  reservationForm.name = reservation.customerName || ''
  reservationForm.email = reservation.customerEmail || ''
  reservationForm.phone = reservation.customerPhone || ''
  reservationForm.cpf = reservation.cpf || ''
  reservationForm.reservationExpiresAt = toDatetimeLocal(reservation.reservationExpiresAt)
}

function closeReservationEditor() {
  editingReservation.value = null
  reservationForm.leadId = ''
  reservationForm.name = ''
  reservationForm.email = ''
  reservationForm.phone = ''
  reservationForm.cpf = ''
  reservationForm.reservationExpiresAt = ''
}

async function saveReservationEdit() {
  if (!reservationForm.leadId) return
  savingReservationEdit.value = true
  try {
    await patch(`/purchase-flow/reservations/${reservationForm.leadId}`, {
      name: reservationForm.name || undefined,
      email: reservationForm.email || undefined,
      phone: reservationForm.phone || undefined,
      cpf: reservationForm.cpf || undefined,
      reservationExpiresAt: reservationForm.reservationExpiresAt
        ? new Date(reservationForm.reservationExpiresAt).toISOString()
        : null,
    })
    toastSuccess('Reserva atualizada com sucesso.')
    closeReservationEditor()
    await loadPage()
  } catch (e: any) {
    toastFromError(e, 'Falha ao atualizar reserva')
  } finally {
    savingReservationEdit.value = false
  }
}

async function runReservationAction(reservation: any, action: 'release' | 'cancel', successMessage: string) {
  const confirmations: Record<typeof action, string> = {
    release: `Deseja liberar a reserva de ${reservation.customerName || 'este cliente'}?`,
    cancel: `Deseja cancelar a reserva de ${reservation.customerName || 'este cliente'}?`,
  }

  if (!window.confirm(confirmations[action])) return

  reservationActingLeadId.value = reservation.leadId
  try {
    await patch(`/purchase-flow/reservations/${reservation.leadId}/${action}`, {})
    toastSuccess(successMessage)
    await loadPage()
  } catch (e: any) {
    toastFromError(e, 'Falha ao executar a acao da reserva')
  } finally {
    reservationActingLeadId.value = ''
  }
}

async function confirmSaleReservation(reservation: any) {
  if (!window.confirm(`Confirmar a venda da reserva de ${reservation.customerName || 'este cliente'}?`)) return

  reservationActingLeadId.value = reservation.leadId
  try {
    await patch(`/purchase-flow/reservations/${reservation.leadId}/confirm-sale`, {})
    toastSuccess('Venda confirmada com sucesso.')
    await loadPage()
  } catch (e: any) {
    toastFromError(e, 'Falha ao confirmar a venda')
  } finally {
    reservationActingLeadId.value = ''
  }
}

function formatStepLabel(step: string) {
  return step
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

onMounted(() => {
  loadPage()
})

definePageMeta({
  layout: 'painel',
})
</script>
