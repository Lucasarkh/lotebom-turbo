<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Projetos</h1>
        <p>Gerencie seus loteamentos</p>
      </div>
      <button v-if="authStore.canEdit" class="btn btn-primary" @click="showCreate = true">+ Novo Projeto</button>
    </div>

    <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

    <div v-else-if="projects.length === 0" class="empty-state">
      <div class="empty-state-icon">📂</div>
      <h3>Nenhum projeto ainda</h3>
      <p>Crie seu primeiro loteamento</p>
    </div>

    <div v-else class="grid grid-cols-3">
      <ProjectCard 
        v-for="p in projects" 
        :key="p.id" 
        :project="p" 
        :show-date="true"
        @click="$router.push(`/painel/projetos/${p.id}`)"
      />
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <div class="modal-title">Novo Projeto</div>
        <form @submit.prevent="handleCreate">
          <div class="form-group">
            <label class="form-label">Nome</label>
            <input v-model="form.name" class="form-input" placeholder="Residencial Parque dos Ipês" required />
          </div>
          <div class="form-group">
            <label class="form-label">Slug</label>
            <input v-model="form.slug" class="form-input" placeholder="parque-dos-ipes" required @input="onSlugInput" />
            <small style="color:var(--gray-500); font-size:0.75rem">URL pública: /p/.../{{ form.slug || '...' }}</small>
          </div>
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea v-model="form.description" class="form-textarea" rows="3" placeholder="Descrição do loteamento..."></textarea>
          </div>
          <div v-if="createError" class="alert alert-error">{{ createError }}</div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showCreate = false">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="creating">{{ creating ? 'Criando...' : 'Criar' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const { fetchApi } = useApi()
const authStore = useAuthStore()
const { success: toastSuccess, fromError: toastFromError } = useToast()
const loading = ref(true)
const projects = ref([])
const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const slugManuallyEdited = ref(false)

const form = ref({ name: '', slug: '', description: '' })

watch(() => form.value.name, (v) => {
  if (!slugManuallyEdited.value) {
    form.value.slug = v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
})

const onSlugInput = () => { slugManuallyEdited.value = true }

const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR')

const loadProjects = async () => {
  try {
    projects.value = await fetchApi('/projects')
  } catch (e) {
    toastFromError(e, 'Erro ao carregar projetos')
  }
  loading.value = false
}

const handleCreate = async () => {
  creating.value = true
  createError.value = ''
  try {
    const p = await fetchApi('/projects', { method: 'POST', body: JSON.stringify(form.value) })
    projects.value.unshift(p)
    showCreate.value = false
    form.value = { name: '', slug: '', description: '' }
    slugManuallyEdited.value = false
    toastSuccess('Projeto criado com sucesso!')
  } catch (e) {
    createError.value = e.message
    toastFromError(e, 'Erro ao criar projeto')
  } finally {
    creating.value = false
  }
}

onMounted(loadProjects)
</script>

<style scoped>
</style>
