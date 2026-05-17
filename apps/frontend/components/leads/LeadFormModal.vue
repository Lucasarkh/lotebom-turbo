<template>
  <UiModal v-model="show" :title="isEdit ? 'Editar Lead' : 'Novo Lead'" size="lg">
    <form id="lead-form" @submit.prevent="save">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        <div class="md:col-span-8">
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Nome Completo</label>
          <input v-model="form.name" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent" required placeholder="Ex: João da Silva">
        </div>
        <div class="md:col-span-4 relative">
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Projeto</label>

          <!-- Custom Select for project -->
          <div class="relative" v-click-outside="() => showDropdown = false">
            <div
              class="bg-p-raised border border-p-border px-3.5 py-2.5 rounded-lg text-sm font-medium flex justify-between items-center cursor-pointer h-[42px] text-p-text"
              :class="{ 'opacity-70 cursor-not-allowed bg-p-elevated': isEdit }"
              @click="!isEdit && (showDropdown = !showDropdown)"
            >
              <span>{{ selectedProjectName }}</span>
              <span class="text-[0.6rem] text-p-text-muted">&#9660;</span>
            </div>

            <div v-if="showDropdown" class="absolute top-full mt-1 left-0 right-0 bg-p-elevated border border-p-border rounded-lg shadow-xl z-[1050] max-h-[250px] overflow-y-auto">
              <div
                class="px-4 py-3 cursor-pointer text-sm text-p-text border-b border-p-border hover:bg-p-accent/10 hover:text-p-accent transition-colors"
                @click.stop="selectProject('')"
              >
                Selecione um projeto
              </div>
              <div
                v-for="p in localProjects"
                :key="p.id"
                class="px-4 py-3 cursor-pointer text-sm text-p-text border-b border-p-border last:border-b-0 hover:bg-p-accent/10 hover:text-p-accent transition-colors"
                @click.stop="selectProject(p.id)"
              >
                {{ p.name }}
              </div>
            </div>
          </div>

          <input type="hidden" v-model="form.projectId" required />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Email</label>
          <input v-model="form.email" type="email" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent" placeholder="joao@email.com">
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Telefone</label>
          <input :value="form.phone" @input="form.phone = applyPhoneMask($event.target.value)" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent" placeholder="(00) 00000-0000">
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">CPF</label>
          <input :value="form.cpf" @input="form.cpf = applyCpfMask($event.target.value)" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent" placeholder="000.000.000-00">
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">RG</label>
          <input v-model="form.rg" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent">
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Data de Nasc.</label>
          <input v-model="form.birthDate" type="date" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent">
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Estado Civil</label>
          <select v-model="form.maritalStatus" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 appearance-none focus:border-p-accent">
            <option value="">Selecione...</option>
            <option value="Solteiro">Solteiro(a)</option>
            <option value="Casado">Casado(a)</option>
            <option value="Divorciado">Divorciado(a)</option>
            <option value="Viúvo">Viúvo(a)</option>
            <option value="União Estável">União Estável</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Profissão</label>
          <input v-model="form.occupation" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent">
        </div>
      </div>

      <hr class="my-4 border-p-border">

      <div class="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        <div class="md:col-span-8">
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Endereço</label>
          <input v-model="form.address" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent">
        </div>
        <div class="md:col-span-4">
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">CEP</label>
          <input :value="form.addressZip" @input="form.addressZip = applyCepMask($event.target.value)" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent">
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Cidade</label>
          <input v-model="form.addressCity" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent">
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Estado (UF)</label>
          <input v-model="form.addressState" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent" maxlength="2">
        </div>
      </div>

      <div class="mb-4">
        <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Mensagem / Observações</label>
        <textarea v-model="form.message" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 resize-y focus:border-p-accent" rows="3"></textarea>
      </div>

      <div v-if="!isEdit" class="mb-4">
        <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Código do Corretor (Opcional)</label>
        <input v-model="form.realtorCode" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent" placeholder="Ex: JOAO123">
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UiButton variant="secondary" @click="show = false">Cancelar</UiButton>
        <UiButton type="submit" form="lead-form" :disabled="loading">
          {{ loading ? 'Salvando...' : 'Salvar Lead' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup>
const props = defineProps({
  lead: { type: Object, default: null },
  projects: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'saved'])

const show = ref(true)
watch(show, (val) => {
  if (!val) emit('close')
})

const { createLead, updateLead, loadProjects, projects: availableProjects } = useLeads()
const loading = ref(false)
const showDropdown = ref(false)

const localProjects = ref([])

const isEdit = computed(() => !!props.lead)

const selectedProjectName = computed(() => {
  if (!form.value.projectId) return 'Selecione um projeto'
  const p = localProjects.value.find(p => p.id === form.value.projectId)
  return p ? p.name : 'Selecione um projeto'
})

const selectProject = (id) => {
  form.value.projectId = id
  showDropdown.value = false
}

// Custom directive for clicking outside the dropdown
const vClickOutside = {
  mounted: (el, binding) => {
    el.clickOutsideEvent = event => {
      if (!(el == event.target || el.contains(event.target))) {
        binding.value()
      }
    };
    document.addEventListener("click", el.clickOutsideEvent);
  },
  unmounted: el => {
    document.removeEventListener("click", el.clickOutsideEvent);
  },
};

const form = ref({
  name: '', email: '', phone: '', projectId: '',
  cpf: '', rg: '', birthDate: '', maritalStatus: '', occupation: '',
  address: '', addressCity: '', addressState: '', addressZip: '',
  message: '', realtorCode: ''
})

onMounted(async () => {
  // Try to use props projects first
  if (props.projects && props.projects.length > 0) {
    localProjects.value = props.projects
  } else {
    // If not provided by props, load them inside the modal
    await loadProjects()
    localProjects.value = availableProjects.value
  }

  if (props.lead) {
    const l = props.lead
    form.value = {
      name: l.name || '',
      email: l.email || '',
      phone: l.phone || '',
      projectId: l.projectId || '',
      cpf: l.cpf || '',
      rg: l.rg || '',
      birthDate: l.birthDate ? getISODateInBrasilia(l.birthDate) : '',
      maritalStatus: l.maritalStatus || '',
      occupation: l.occupation || '',
      address: l.address || '',
      addressCity: l.addressCity || '',
      addressState: l.addressState || '',
      addressZip: l.addressZip || '',
      message: l.message || '',
    }
  }
})

const save = async () => {
  loading.value = true
  try {
    const payload = { ...form.value }

    // Remove empty optional strings or non-serializable fields if any
    Object.keys(payload).forEach(key => {
      if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
        delete payload[key]
      }
    })

    // Ensure projectId is a string and present
    if (!payload.projectId) {
      alert('Por favor, selecione um projeto.')
      loading.value = false
      return
    }

    // Ensure birthDate is in ISO-8601 format (YYYY-MM-DDT00:00:00.000Z) if present
    if (payload.birthDate) {
      // Input date is typically YYYY-MM-DD
      payload.birthDate = new Date(`${payload.birthDate}T12:00:00Z`).toISOString()
    }

    if (isEdit.value) {
      await updateLead(props.lead.id, payload)
    } else {
      await createLead(payload)
    }
    emit('saved')
    emit('close')
  } catch (e) {
    // Error handled in useLeads
    console.error('Save lead error:', e)
  } finally {
    loading.value = false
  }
}
</script>
