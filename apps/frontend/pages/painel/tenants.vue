<template>
  <div class="space-y-6">
    <UiPageHeader title="Loteadoras" description="Gerenciamento global de clientes e métricas">
      <template #actions>
        <UiButton variant="primary" @click="openCreateModal">
          Nova Loteadora
        </UiButton>
      </template>
    </UiPageHeader>

    <UiLoadingState v-if="loading" text="Carregando loteadoras..." />

    <UiCard v-else padding="none">
      <UiTable>
        <template #head>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Loteadora</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Projetos</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Corretores</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Leads</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Status</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Cadastrada em</th>
          <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-p-text-secondary">Ações</th>
        </template>
        <tr v-for="t in tenants" :key="t.id" class="border-b border-p-border">
          <td class="px-4 py-3">
            <div class="font-semibold text-p-text">{{ t.name }}</div>
            <div class="text-xs text-p-text-muted">{{ t.slug }}</div>
            <div v-if="t.customDomain" class="text-xs text-p-accent"><i class="bi bi-globe2" aria-hidden="true"></i> {{ t.customDomain }}</div>
          </td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ t.metrics.projects }}</td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ t.metrics.brokers }}</td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ t.metrics.leads }}</td>
          <td class="px-4 py-3">
            <UiBadge :variant="t.isActive ? 'success' : 'danger'">
              {{ t.isActive ? 'Ativa' : 'Desativada' }}
            </UiBadge>
          </td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ formatDate(t.createdAt) }}</td>
          <td class="px-4 py-3">
            <div class="flex items-center justify-end gap-2">
              <UiButton variant="ghost" size="sm" @click="openProjectList(t)" title="Ver Empreendimentos">
                <i class="bi bi-folder2-open" aria-hidden="true"></i> Ver Projetos
              </UiButton>
              <UiButton variant="ghost" size="sm" @click="openEditModal(t)" title="Editar Loteadora">
                <i class="bi bi-pencil-fill" aria-hidden="true"></i>
              </UiButton>
              <UiButton variant="outline" size="sm" @click="toggleStatus(t)">
                {{ t.isActive ? 'Desativar' : 'Ativar' }}
              </UiButton>
            </div>
          </td>
        </tr>
      </UiTable>
    </UiCard>

    <!-- Create/Edit Tenant Modal -->
    <UiModal v-model="showModal" :title="editingId ? 'Editar Loteadora' : 'Nova Loteadora'" size="lg">
      <form @submit.prevent="handleCreate" class="space-y-4">
        <div class="space-y-1">
          <label class="block text-sm font-medium text-p-text-secondary">Nome da Empresa</label>
          <input v-model="form.tenantName" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Ex: Loteadora Vista Verde" required @input="generateSlug" />
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-p-text-secondary">Slug (URL)</label>
          <input v-model="form.tenantSlug" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="vista-verde" required />
        </div>

        <h3 class="pt-4 text-base font-semibold text-p-text">Dados Jurídicos</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Razão Social</label>
            <input v-model="form.legalName" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Razão social da empresa" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">CNPJ</label>
            <input v-model="form.cnpj" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="00.000.000/0000-00" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Inscrição Estadual</label>
            <input v-model="form.stateRegistration" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Opcional" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Inscrição Municipal</label>
            <input v-model="form.municipalRegistration" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Opcional" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Representante Legal</label>
            <input v-model="form.legalRepresentative" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Nome do representante legal" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">CRECI</label>
            <input v-model="form.creci" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="CRECI da empresa/responsável" />
          </div>
        </div>

        <h3 class="pt-4 text-base font-semibold text-p-text">Dados de Contato</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Nome do Contato Comercial</label>
            <input v-model="form.contactName" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Nome do responsável comercial" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">E-mail de Contato</label>
            <input v-model="form.contactEmail" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" type="email" placeholder="comercial@empresa.com" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Telefone de Contato</label>
            <input v-model="form.contactPhone" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="(00) 0000-0000" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Telefone Principal</label>
            <input v-model="form.phone" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="(00) 0000-0000" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">WhatsApp</label>
            <input v-model="form.whatsapp" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="(00) 00000-0000" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">E-mail Público</label>
            <input v-model="form.publicEmail" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" type="email" placeholder="contato@empresa.com" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Website</label>
            <input v-model="form.website" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="https://empresa.com.br" />
          </div>
        </div>

        <h3 class="pt-4 text-base font-semibold text-p-text">Endereço</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">CEP</label>
            <input v-model="form.addressZipCode" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="00000-000" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Logradouro</label>
            <input v-model="form.addressStreet" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Rua, avenida, etc." />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Número</label>
            <input v-model="form.addressNumber" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="123" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Complemento</label>
            <input v-model="form.addressComplement" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Sala, bloco, etc." />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Bairro</label>
            <input v-model="form.addressDistrict" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Bairro" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Cidade</label>
            <input v-model="form.addressCity" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Cidade" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Estado (UF)</label>
            <input v-model="form.addressState" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="UF" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">País</label>
            <input v-model="form.addressCountry" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Brasil" />
          </div>
        </div>

        <template v-if="!editingId">
          <hr class="border-p-border" />
          <h3 class="text-base font-semibold text-p-text">Usuário Administrador</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1">
              <label class="block text-sm font-medium text-p-text-secondary">Nome do Responsável</label>
              <input v-model="form.name" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="João Silva" required />
            </div>
            <div class="space-y-1">
              <label class="block text-sm font-medium text-p-text-secondary">Email de Acesso</label>
              <input v-model="form.email" type="email" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="admin@empresa.com" required autocomplete="off" />
            </div>
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Senha Inicial</label>
            <AppPasswordInput v-model="form.password" :placeholder="PASSWORD_POLICY_HINT" required autocomplete="new-password" />
            <p v-if="tenantPasswordError" class="text-xs text-p-danger">{{ tenantPasswordError }}</p>
            <p class="text-xs text-p-text-muted">O cliente poderá alterar esta senha depois.</p>
          </div>
        </template>

        <UiAlert v-if="error" variant="error">{{ error }}</UiAlert>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="showModal = false">Cancelar</UiButton>
          <UiButton variant="primary" :disabled="saving" @click="handleCreate">
            {{ saving ? 'Processando...' : (editingId ? 'Salvar Alterações' : 'Criar Loteadora') }}
          </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- Projects List Modal -->
    <UiModal v-model="showProjectsModal" title="Empreendimentos" size="xl">
      <template #header>
        <div>
          <h3 class="text-lg font-semibold text-p-text">Empreendimentos - {{ selectedTenant?.name }}</h3>
          <p class="text-sm text-p-text-muted">Configure domínios customizados para projetos desta loteadora.</p>
        </div>
      </template>

      <UiLoadingState v-if="loadingProjects" />
      <UiEmptyState
        v-else-if="tenantProjects.length === 0"
        title="Nenhum empreendimento"
        description="Nenhum empreendimento cadastrado para esta loteadora."
      />
      <div v-else class="max-h-[400px] overflow-y-auto">
        <UiTable>
          <template #head>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Empreendimento</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Slug</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Domínio Customizado</th>
            <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-p-text-secondary">Ações</th>
          </template>
          <tr v-for="p in tenantProjects" :key="p.id" class="border-b border-p-border">
            <td class="px-4 py-3 text-sm font-semibold text-p-text">{{ p.name }}</td>
            <td class="px-4 py-3 text-sm text-p-text-secondary">/{{ p.slug }}</td>
            <td class="px-4 py-3">
              <div v-if="editingProjectId === p.id" class="flex items-center gap-2">
                <input v-model="projectForm.customDomain" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="vendas.site.com" @keyup.enter="saveProjectDomain(p)" />
                <UiButton variant="primary" size="sm" @click="saveProjectDomain(p)"><i class="bi bi-floppy-fill" aria-hidden="true"></i></UiButton>
                <UiButton variant="ghost" size="sm" @click="editingProjectId = null">x</UiButton>
              </div>
              <div v-else class="cursor-pointer text-sm text-p-text-secondary" @dblclick="editProjectDomain(p)">
                {{ p.customDomain || '—' }} <span class="text-xs text-p-text-muted opacity-50"><i class="bi bi-pencil-fill" aria-hidden="true"></i></span>
              </div>
            </td>
            <td class="px-4 py-3 text-right">
              <UiButton variant="ghost" size="sm" @click="editProjectDomain(p)">
                Configurar Domínio
              </UiButton>
            </td>
          </tr>
        </UiTable>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <UiButton variant="ghost" @click="showProjectsModal = false">Fechar</UiButton>
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

definePageMeta({ layout: 'painel' })

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
  legalName: '',
  cnpj: '',
  creci: '',
  stateRegistration: '',
  municipalRegistration: '',
  legalRepresentative: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  phone: '',
  whatsapp: '',
  publicEmail: '',
  website: '',
  addressZipCode: '',
  addressStreet: '',
  addressNumber: '',
  addressComplement: '',
  addressDistrict: '',
  addressCity: '',
  addressState: '',
  addressCountry: '',
  name: '',
  email: '',
  password: ''
})
const tenantPasswordError = computed(() => {
  if (editingId.value || !form.value.password) return ''
  return getPasswordPolicyError(form.value.password)
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
    legalName: '',
    cnpj: '',
    creci: '',
    stateRegistration: '',
    municipalRegistration: '',
    legalRepresentative: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    phone: '',
    whatsapp: '',
    publicEmail: '',
    website: '',
    addressZipCode: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressDistrict: '',
    addressCity: '',
    addressState: '',
    addressCountry: '',
    name: '',
    email: '',
    password: ''
  }
  showModal.value = true
  error.value = ''
}

async function openEditModal(tenant) {
  let details = tenant
  try {
    details = await fetchApi(`/tenants/${tenant.id}`)
  } catch (_err) {
    toast.error('Nao foi possivel carregar todos os dados da loteadora. Exibindo dados basicos.')
    // Fallback to table payload when details request fails
  }

  editingId.value = tenant.id
  form.value = {
    tenantName: details.name,
    tenantSlug: details.slug,
    legalName: details.legalName || '',
    cnpj: details.cnpj || '',
    creci: details.creci || '',
    stateRegistration: details.stateRegistration || '',
    municipalRegistration: details.municipalRegistration || '',
    legalRepresentative: details.legalRepresentative || '',
    contactName: details.contactName || '',
    contactEmail: details.contactEmail || '',
    contactPhone: details.contactPhone || '',
    phone: details.phone || '',
    whatsapp: details.whatsapp || '',
    publicEmail: details.publicEmail || '',
    website: details.website || '',
    addressZipCode: details.addressZipCode || '',
    addressStreet: details.addressStreet || '',
    addressNumber: details.addressNumber || '',
    addressComplement: details.addressComplement || '',
    addressDistrict: details.addressDistrict || '',
    addressCity: details.addressCity || '',
    addressState: details.addressState || '',
    addressCountry: details.addressCountry || '',
    name: '—', // Not editable here
    email: '—',
    password: '—'
  }
  showModal.value = true
  error.value = ''
}

async function handleCreate() {
  if (!editingId.value && tenantPasswordError.value) {
    error.value = tenantPasswordError.value
    return
  }

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
          legalName: form.value.legalName || null,
          cnpj: form.value.cnpj || null,
          creci: form.value.creci || null,
          stateRegistration: form.value.stateRegistration || null,
          municipalRegistration: form.value.municipalRegistration || null,
          legalRepresentative: form.value.legalRepresentative || null,
          contactName: form.value.contactName || null,
          contactEmail: form.value.contactEmail || null,
          contactPhone: form.value.contactPhone || null,
          phone: form.value.phone || null,
          whatsapp: form.value.whatsapp || null,
          publicEmail: form.value.publicEmail || null,
          website: form.value.website || null,
          addressZipCode: form.value.addressZipCode || null,
          addressStreet: form.value.addressStreet || null,
          addressNumber: form.value.addressNumber || null,
          addressComplement: form.value.addressComplement || null,
          addressDistrict: form.value.addressDistrict || null,
          addressCity: form.value.addressCity || null,
          addressState: form.value.addressState || null,
          addressCountry: form.value.addressCountry || null,
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
