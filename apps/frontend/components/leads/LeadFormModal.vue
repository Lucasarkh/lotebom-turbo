<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal modal-lg">
      <div class="modal-header">
        <h2>{{ isEdit ? 'Editar Lead' : 'Novo Lead' }}</h2>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="save">
          <div class="row">
            <div class="col-md-8 form-group mb-3">
              <label class="form-label">Nome Completo</label>
              <input v-model="form.name" type="text" class="form-control" required placeholder="Ex: João da Silva">
            </div>
            <div class="col-md-4 form-group mb-3 text-dark position-relative">
              <label class="form-label" style="color: #1a1a1a !important;">Projeto</label>
              
              <!-- Custom Select for absolute color control -->
              <div class="custom-select-wrapper" v-click-outside="() => showDropdown = false">
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'disabled': isEdit }"
                  @click="!isEdit && (showDropdown = !showDropdown)"
                >
                  <span class="text-dark">{{ selectedProjectName }}</span>
                  <span class="arrow">▼</span>
                </div>
                
                <div v-if="showDropdown" class="custom-options-container">
                  <div 
                    class="custom-option"
                    @click.stop="selectProject('')"
                  >
                    Selecione um projeto
                  </div>
                  <div 
                    v-for="p in localProjects" 
                    :key="p.id" 
                    class="custom-option"
                    @click.stop="selectProject(p.id)"
                  >
                    {{ p.name }}
                  </div>
                </div>
              </div>
              
              <input type="hidden" v-model="form.projectId" required />
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 form-group mb-3">
              <label class="form-label">Email</label>
              <input v-model="form.email" type="email" class="form-control" placeholder="joao@email.com">
            </div>
            <div class="col-md-6 form-group mb-3">
              <label class="form-label">Telefone</label>
              <input v-model="form.phone" v-maska="'(##) #####-####'" type="text" class="form-control" placeholder="(00) 00000-0000">
            </div>
          </div>

          <div class="row">
            <div class="col-md-4 form-group mb-3">
              <label class="form-label">CPF</label>
              <input v-model="form.cpf" v-maska="'###.###.###-##'" type="text" class="form-control" placeholder="000.000.000-00">
            </div>
            <div class="col-md-4 form-group mb-3">
              <label class="form-label">RG</label>
              <input v-model="form.rg" type="text" class="form-control">
            </div>
            <div class="col-md-4 form-group mb-3">
              <label class="form-label">Data de Nasc.</label>
              <input v-model="form.birthDate" type="date" class="form-control">
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 form-group mb-3">
              <label class="form-label">Estado Civil</label>
              <select v-model="form.maritalStatus" class="form-select">
                <option value="">Selecione...</option>
                <option value="Solteiro">Solteiro(a)</option>
                <option value="Casado">Casado(a)</option>
                <option value="Divorciado">Divorciado(a)</option>
                <option value="Viúvo">Viúvo(a)</option>
                <option value="União Estável">União Estável</option>
              </select>
            </div>
            <div class="col-md-6 form-group mb-3">
              <label class="form-label">Profissão</label>
              <input v-model="form.occupation" type="text" class="form-control">
            </div>
          </div>

          <hr class="my-4">

          <div class="row">
            <div class="col-md-8 form-group mb-3">
              <label class="form-label">Endereço</label>
              <input v-model="form.address" type="text" class="form-control">
            </div>
            <div class="col-md-4 form-group mb-3">
              <label class="form-label">CEP</label>
              <input v-model="form.addressZip" v-maska="'#####-###'" type="text" class="form-control">
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 form-group mb-3">
              <label class="form-label">Cidade</label>
              <input v-model="form.addressCity" type="text" class="form-control">
            </div>
            <div class="col-md-6 form-group mb-3">
              <label class="form-label">Estado (UF)</label>
              <input v-model="form.addressState" type="text" class="form-control" maxlength="2">
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Mensagem / Observações</label>
            <textarea v-model="form.message" class="form-control" rows="3"></textarea>
          </div>

          <div v-if="!isEdit" class="form-group mb-3">
            <label class="form-label">Código do Corretor (Opcional)</label>
            <input v-model="form.realtorCode" type="text" class="form-control" placeholder="Ex: JOAO123">
          </div>

          <div class="text-end mt-4">
            <button type="button" class="btn btn-neutral me-2" @click="$emit('close')">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'Salvando...' : 'Salvar Lead' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  lead: { type: Object, default: null },
  projects: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'saved'])
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

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.modal-lg { width: 100%; max-width: 800px; }

.modal-header {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--gray-100);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: var(--space-6);
  overflow-y: auto;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--gray-400);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.modal-close:hover { color: var(--danger); }

/* Force select options visibility */
.form-select, .form-control {
  background-color: #ffffff !important;
  color: #1a1a1a !important;
  border: 1px solid var(--gray-300);
}

select.form-select option {
  color: #1a1a1a !important;
  background-color: #ffffff !important;
  appearance: none;
  -webkit-appearance: none;
}

/* Specific hack for dark mode browser overrides */
@media (prefers-color-scheme: dark) {
  select.form-select {
    background-color: #ffffff !important;
    color: #1a1a1a !important;
  }
}

.text-dark {
  color: #1a1a1a !important;
}

/* Custom Select Dropdown Styles */
.custom-select-wrapper {
  position: relative;
  user-select: none;
  width: 100%;
}

.custom-select-trigger {
  background: #ffffff !important;
  border: 1px solid var(--gray-300);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  height: 44px;
  color: #1a1a1a !important;
}

.custom-select-trigger.disabled {
  background-color: var(--gray-100) !important;
  cursor: not-allowed;
  opacity: 0.7;
}

.custom-select-trigger .arrow {
  font-size: 0.6rem;
  color: var(--gray-500);
}

.custom-options-container {
  position: absolute;
  top: 105%;
  left: 0;
  right: 0;
  background: #ffffff !important;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 1050;
  max-height: 250px;
  overflow-y: auto;
}

.custom-option {
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  font-size: 0.875rem;
  color: #111111 !important;
  background-color: #ffffff !important;
  border-bottom: 1px solid var(--gray-100);
  transition: background 0.2s;
}

.custom-option:last-child {
  border-bottom: none;
}

.custom-option:hover {
  background-color: var(--primary-50) !important;
  color: var(--primary) !important;
}
</style>
