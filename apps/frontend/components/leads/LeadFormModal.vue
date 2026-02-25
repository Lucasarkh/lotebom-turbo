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
            <div class="col-md-4 form-group mb-3">
              <label class="form-label">Projeto</label>
              <select v-model="form.projectId" class="form-select" :disabled="isEdit" required>
                <option value="">Selecione um projeto</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
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
const { createLead, updateLead } = useLeads()
const loading = ref(false)

const isEdit = computed(() => !!props.lead)

const form = ref({
  name: '', email: '', phone: '', projectId: '',
  cpf: '', rg: '', birthDate: '', maritalStatus: '', occupation: '',
  address: '', addressCity: '', addressState: '', addressZip: '',
  message: '', realtorCode: ''
})

onMounted(() => {
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
    if (isEdit.value) {
      await updateLead(props.lead.id, form.value)
    } else {
      await createLead(form.value)
    }
    emit('saved')
    emit('close')
  } catch (e) {
    // Error handled in useLeads
  } finally {
    loading.value = false
  }
}
</script>
