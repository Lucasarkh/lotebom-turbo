<template>
  <UiModal :modelValue="true" @update:modelValue="$emit('close')" size="lg">
    <template #header>
      <div>
        <h2 class="text-lg font-semibold text-p-text">Novo Agendamento</h2>
        <p class="text-sm text-p-text-muted mt-1">Organize uma nova visita ou reunião com agilidade.</p>
      </div>
    </template>

    <form id="scheduling-form" @submit.prevent="save" class="space-y-5">
      <fieldset :disabled="!canWriteScheduling" class="contents">
        <div class="space-y-4 pb-5 border-b border-p-border">
          <h3 class="text-xs font-bold uppercase tracking-wider text-p-text-muted">Detalhes da Visita</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="block text-sm font-medium text-p-text-secondary">Projeto / Empreendimento</label>
              <div class="relative flex items-center">
                <select
                  v-model="form.projectId"
                  class="w-full rounded-lg border border-p-border bg-p-raised px-10 py-2.5 text-sm text-p-text appearance-none focus:border-p-accent focus:outline-none transition-colors"
                  required
                  @change="onProjectChange"
                >
                  <option value="" disabled>Selecione o projeto</option>
                  <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
                <i class="pi pi-building absolute left-3.5 text-p-text-muted text-lg pointer-events-none"></i>
                <i class="pi pi-chevron-down absolute right-3.5 text-p-text-muted pointer-events-none"></i>
              </div>
            </div>
            <div class="space-y-1">
              <label class="block text-sm font-medium text-p-text-secondary">Data e Horário</label>
              <div class="relative flex items-center">
                <input
                  v-model="form.scheduledAt"
                  type="datetime-local"
                  class="w-full rounded-lg border border-p-border bg-p-raised px-10 py-2.5 text-sm text-p-text appearance-none focus:border-p-accent focus:outline-none transition-colors"
                  required
                >
                <i class="pi pi-calendar absolute left-3.5 text-p-text-muted text-lg pointer-events-none"></i>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4 pb-5 border-b border-p-border">
          <h3 class="text-xs font-bold uppercase tracking-wider text-p-text-muted">Participante</h3>
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-p-text-secondary">Vincular Lead</label>

            <div v-if="form.projectId">
              <div v-if="form.leadId" class="flex items-center justify-between bg-p-accent-subtle border border-p-accent/25 rounded-xl px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-p-accent text-white flex items-center justify-center rounded-full font-extrabold">{{ selectedLeadName.charAt(0) }}</div>
                  <div class="flex flex-col">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-p-accent">Lead Vinculado</span>
                    <h4 class="m-0 text-sm font-bold text-p-text">{{ selectedLeadName }}</h4>
                  </div>
                </div>
                <button type="button" class="w-8 h-8 border-none bg-transparent text-p-text-muted flex items-center justify-center cursor-pointer rounded-full transition-colors hover:bg-p-danger/10 hover:text-p-danger" @click="clearLead" title="Remover lead vinculado"><i class="pi pi-times"></i></button>
              </div>

              <div v-else class="relative">
                <div class="relative flex items-center">
                  <input
                    v-model="leadSearch"
                    type="text"
                    placeholder="Pesquise por nome, e-mail ou celular..."
                    class="w-full rounded-lg border border-p-border bg-p-raised px-10 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none transition-colors"
                    @input="onLeadSearch"
                  >
                  <i class="pi pi-search absolute left-3.5 text-p-text-muted text-lg pointer-events-none"></i>
                  <i v-if="loadingLeads" class="pi pi-spin pi-spinner absolute right-3.5 text-p-text-muted pointer-events-none"></i>
                </div>

                <Transition name="fade-slide">
                  <div v-if="leadSearch && leads.length > 0" class="absolute top-full left-0 right-0 bg-p-elevated rounded-xl border border-p-border max-h-60 overflow-y-auto z-[100] mt-2 p-2 shadow-xl">
                    <div
                      v-for="l in leads"
                      :key="l.id"
                      class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-p-overlay"
                      @click="selectLead(l)"
                    >
                      <div class="w-8 h-8 bg-p-overlay text-p-text-muted flex items-center justify-center rounded-full font-bold text-xs">{{ l.name.charAt(0) }}</div>
                      <div>
                        <div class="font-semibold text-p-text text-sm">{{ l.name }}</div>
                        <div class="text-xs text-p-text-muted">{{ l.email || l.phone || 'Sem contato' }}</div>
                      </div>
                    </div>
                  </div>
                </Transition>
                <div v-if="leadSearch && leads.length === 0 && !loadingLeads" class="text-xs text-p-text-muted mt-2 px-1">Nenhum lead encontrado com seu critério de busca.</div>
              </div>
            </div>
            <div v-else class="text-sm text-p-text-muted italic p-3 bg-p-overlay border border-dashed border-p-border rounded-lg">Selecione um projeto para buscar leads vinculados.</div>
          </div>

          <Transition name="expand">
            <div v-if="!form.leadId" class="bg-p-overlay border border-p-border rounded-xl p-4 mt-2">
              <div class="text-xs font-bold text-p-text-muted mb-3">
                {{ leadSearch ? 'Você pode criar um novo Lead agora:' : 'Deseja cadastrar um novo Lead?' }}
              </div>
              <div class="space-y-2">
                <input v-model="form.leadName" type="text" placeholder="Nome completo" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input v-model="form.leadEmail" type="email" placeholder="E-mail" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none">
                  <input :value="form.leadPhone" @input="onLeadPhoneInput" type="text" placeholder="Celular/WhatsApp" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none">
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-bold uppercase tracking-wider text-p-text-muted">Observações Internas</label>
          <textarea v-model="form.notes" rows="3" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none resize-y" placeholder="Detalhes ou requisitos especiais para este agendamento..."></textarea>
        </div>
      </fieldset>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton variant="ghost" @click="$emit('close')">Cancelar</UiButton>
        <UiButton
          variant="primary"
          :disabled="saving || !canWriteScheduling"
          :title="!canWriteScheduling ? writePermissionHint : undefined"
          @click="save"
        >
          {{ saving ? 'Salvando...' : 'Confirmar Agendamento' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
const props = defineProps({
  initialDate: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'success']);
const api = useApi();
const toast = useToast();
const authStore = useAuthStore();
const canWriteScheduling = computed(() => authStore.canWriteFeature('scheduling'));
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição';
const canLoadProjectsCatalog = computed(() => {
  return !authStore.isLoteadora || !authStore.hasPanelRestrictions || authStore.canReadFeature('projects');
});

const saving = ref(false);
const loadingLeads = ref(false);
type ProjectOption = {
  id: string;
  name: string;
};

type LeadOption = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

const projects = ref<ProjectOption[]>([]);
const leads = ref<LeadOption[]>([]);
const leadSearch = ref('');
const selectedLeadName = ref('');

const form = ref({
  projectId: '',
  scheduledAt: props.initialDate || '',
  leadId: '',
  leadName: '',
  leadEmail: '',
  leadPhone: '',
  notes: ''
});

const applyPhoneMask = (value: string) => value.replace(/\D/g, '').slice(0, 11)
  .replace(/(\d{2})(\d)/, '($1) $2')
  .replace(/(\d{5})(\d)/, '$1-$2');

const getInputValue = (event: Event) => (event.target as HTMLInputElement | null)?.value ?? '';

const onLeadPhoneInput = (event: Event) => {
  form.value.leadPhone = applyPhoneMask(getInputValue(event));
};

onMounted(async () => {
  if (!canLoadProjectsCatalog.value) {
    projects.value = [];
    return;
  }

  try {
    const res = await api.get('/projects');
    projects.value = Array.isArray(res) ? res : (res.data || []);
  } catch (e) {
    toast.error('Erro ao carregar projetos');
  }
});

let searchTimeout: any = null;
const onLeadSearch = () => {
    if (!form.value.projectId) return;
    if (searchTimeout) clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
        if (!leadSearch.value) {
            // Load some default leads if search is empty
            const res = await api.get(`/leads?projectId=${form.value.projectId}&limit=10`);
            leads.value = Array.isArray(res) ? res : (res.data || []);
            return;
        }

        loadingLeads.value = true;
        try {
            const res = await api.get(`/leads?projectId=${form.value.projectId}&search=${leadSearch.value}&limit=20`);
            leads.value = Array.isArray(res) ? res : (res.data || []);
        } catch (e) {
            console.error('Search error', e);
        } finally {
            loadingLeads.value = false;
        }
    }, 400);
}

const selectLead = (lead: LeadOption) => {
    form.value.leadId = lead.id;
    selectedLeadName.value = lead.name;
    leadSearch.value = '';
}

const clearLead = () => {
    form.value.leadId = '';
    selectedLeadName.value = '';
}

const onProjectChange = async () => {
    if (!form.value.projectId) return;
    try {
        const res = await api.get(`/leads?projectId=${form.value.projectId}&limit=20`);
        leads.value = Array.isArray(res) ? res : (res.data || []);
        form.value.leadId = '';
        selectedLeadName.value = '';
    } catch (e) {
        toast.error('Erro ao carregar leads do projeto');
    }
}

const save = async () => {
  if (!canWriteScheduling.value) return;
  if (!form.value.projectId || !form.value.scheduledAt) {
     toast.error('Preencha os campos obrigatórios');
     return;
  }

  // Validação obrigatória de Lead (ou selecionar existente ou preencher dados de novo)
  if (!form.value.leadId && !form.value.leadName) {
    toast.error('É obrigatório vincular um lead ou preencher o nome para um novo cadastro.');
    return;
  }

  saving.value = true;
  try {
    // Garantir que a data seja enviada com o offset de Brasília (-03:00)
    // para evitar que o servidor a interprete erroneamente se estiver em outro fuso
    const payload = {
      ...form.value,
      leadId: form.value.leadId && form.value.leadId !== '' ? form.value.leadId : undefined,
      scheduledAt: form.value.scheduledAt.includes('Z') || form.value.scheduledAt.includes('-03:00')
        ? form.value.scheduledAt
        : `${form.value.scheduledAt}:00-03:00`
    };

    await api.post('/scheduling', payload);
    toast.success('Agendamento criado com sucesso');
    emit('success');
    emit('close');
  } catch (e: any) {
    toast.error(e.message || 'Erro ao criar agendamento');
  } finally {
    saving.value = false;
  }
};
</script>
