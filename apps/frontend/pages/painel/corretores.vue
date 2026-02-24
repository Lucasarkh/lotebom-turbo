<script setup lang="ts">
const { get, post, patch, delete: del } = useApi()
const toast = useToast()

const realtors = ref([])
const projects = ref([])
const loading = ref(true)
const showModal = ref(false)
const editingRealtor = ref(null)

const { maskPhone } = useMasks()

const form = ref({
  name: '',
  phone: '',
  creci: '',
  code: '',
  projectIds: []
})

watch(() => form.value.phone, (v) => { if (v) form.value.phone = maskPhone(v) })

const slugManuallyEdited = ref(false)

function onNameInput() {
  if (!slugManuallyEdited.value) {
    form.value.code = form.value.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
}

async function fetchData() {
  loading.value = true
  try {
    const [realtorsData, projectsRes] = await Promise.all([
      get('/realtor-links'),
      get('/projects')
    ])
    realtors.value = realtorsData
    projects.value = projectsRes.data
  } catch (error) {
    console.error('Error fetching realtors:', error)
    toast.error('Erro ao carregar dados')
  } finally {
    loading.value = false
  }
}

async function saveRealtor() {
  try {
    const payload = {
      ...form.value,
      phone: form.value.phone.replace(/\D/g, '')
    }

    if (editingRealtor.value) {
      await patch(`/realtor-links/${editingRealtor.value.id}`, payload)
      toast.success('Corretor atualizado com sucesso')
    } else {
      await post('/realtor-links', payload)
      toast.success('Corretor criado com sucesso')
    }
    showModal.value = false
    slugManuallyEdited.value = false
    fetchData()
  } catch (error) {
    toast.error('Erro ao salvar corretor')
  }
}

async function removeRealtor(id: string) {
  if (!confirm('Tem certeza que deseja remover este corretor?')) return
  try {
    await del(`/realtor-links/${id}`)
    toast.success('Corretor removido')
    fetchData()
  } catch (error) {
    toast.error('Erro ao remover corretor')
  }
}

function openCreate() {
  editingRealtor.value = null
  form.value = { name: '', phone: '', creci: '', code: '', projectIds: [] }
  slugManuallyEdited.value = false
  showModal.value = true
}

function openEdit(realtor) {
  editingRealtor.value = realtor
  form.value = {
    name: realtor.name,
    phone: realtor.phone,
    creci: realtor.creci || '',
    code: realtor.code,
    projectIds: realtor.projects?.map(p => p.id) || []
  }
  slugManuallyEdited.value = true
  showModal.value = true
}

function getProjectNames(realtor) {
  if (!realtor.projects || realtor.projects.length === 0) return 'Todos'
  return realtor.projects.map(p => p.name).join(', ')
}

function copyLink(realtor, project = null) {
  let url = ''
  
  if (project) {
    url = `${window.location.origin}/${project.slug}?c=${realtor.code}`
  } else if (realtor.projects?.length > 0) {
    // If no specific project provided, copy the first one
    const p = realtor.projects[0]
    url = `${window.location.origin}/${p.slug}?c=${realtor.code}`
  } else {
    // Fallback if no projects
    url = `${window.location.origin}/p?c=${realtor.code}`
  }
  
  navigator.clipboard.writeText(url)
  toast.success('Link copiado!')
}

onMounted(fetchData)

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="page-container">
    <div class="header">
      <div>
        <h1>Gestão de Corretores</h1>
        <p class="subtitle">Gerencie os links e CRECI dos corretores</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        Novo Corretor
      </button>
    </div>

    <div v-if="loading" class="loading">Carregando...</div>
    
    <div v-else class="card">
      <div v-if="realtors.length === 0" class="empty-state">
        Nenhum corretor cadastrado ainda.
      </div>
      
      <table v-else class="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>CRECI</th>
            <th>Projetos / Links</th>
            <th>Telefone</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="realtor in realtors" :key="realtor.id">
            <td>
              <div class="realtor-name">
                <div v-if="realtor.photoUrl" class="realtor-photo">
                  <img :src="realtor.photoUrl" alt="">
                </div>
                <div v-else class="realtor-avatar-placeholder">{{ realtor.name[0] }}</div>
                <strong>{{ realtor.name }}</strong>
              </div>
            </td>
            <td>{{ realtor.creci || '-' }}</td>
            <td>
              <div v-if="realtor.projects?.length" class="project-links">
                <div v-for="p in realtor.projects" :key="p.id" class="p-link-item">
                  <span class="p-name">{{ p.name }}</span>
                  <button class="btn-copy-small" @click="copyLink(realtor, p)" title="Copiar Link deste projeto">
                    Copiar Link
                  </button>
                </div>
              </div>
              <div v-else class="text-muted">Nenhum projeto selecionado</div>
            </td>
            <td>{{ realtor.phone }}</td>
            <td class="text-right actions vertical-actions">
              <button class="btn-icon" @click="openEdit(realtor)" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon text-danger" @click="removeRealtor(realtor.id)" title="Remover">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click="showModal = false">
        <div class="modal-content" @click.stop>
          <h2>{{ editingRealtor ? 'Editar Corretor' : 'Novo Corretor' }}</h2>
          <form @submit.prevent="saveRealtor" class="form">
            <div class="form-grid">
              <div class="form-group">
                <label>Nome do Corretor *</label>
                <input v-model="form.name" type="text" placeholder="Nome completo" required @input="onNameInput">
              </div>
              <div class="form-group">
                <label>Código de Indicação (Slug) *</label>
                <input v-model="form.code" type="text" placeholder="joao-corretor" required>
                <small class="help-text">Usado no link: ?c={{ form.code || '...' }}</small>
              </div>
              <div class="form-group">
                <label>CRECI</label>
                <input v-model="form.creci" type="text" placeholder="Ex: 12345-F">
              </div>
              <div class="form-group">
                <label>Telefone (WhatsApp) *</label>
                <input v-model="form.phone" type="text" placeholder="(DD) 9XXXX-XXXX" required>
              </div>
            </div>

            <div class="form-group projects-selection">
              <label>Empreendimentos Vinculados</label>
              <div class="projects-grid">
                <label v-for="p in projects" :key="p.id" class="project-checkbox">
                  <input type="checkbox" :value="p.id" v-model="form.projectIds">
                  <span>{{ p.name }}</span>
                </label>
              </div>
              <p class="help-text" v-if="projects.length === 0">Nenhum empreendimento cadastrado.</p>
              <p class="help-text" v-else>Selecione os empreendimentos que este corretor poderá divulgar.</p>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-outline" @click="showModal = false">Cancelar</button>
              <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.page-container {
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

h1 {
  font-size: 24px;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #64748b;
  margin: 0;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: 12px 16px;
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
  font-size: 14px;
}

.table td {
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.realtor-name {
  display: flex;
  align-items: center;
  gap: 12px;
}

.realtor-photo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: #f1f5f9;
}

.realtor-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.realtor-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.project-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.p-link-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 8px;
  background: #f8fafc;
  border-radius: 4px;
  font-size: 13px;
}

.p-name {
  font-weight: 500;
  color: #1e293b;
}

.btn-copy-small {
  background: #fff;
  border: 1px solid #e2e8f0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.btn-copy-small:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #64748b;
}

.btn-icon:hover {
  color: #1e293b;
}

.btn-icon.text-danger:hover {
  color: #ef4444;
}

.modal-content {
  max-width: 600px;
  width: 100%;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.form-grid .form-group:first-child {
  grid-column: span 2;
}

.projects-selection {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.projects-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.project-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.help-text {
  font-size: 12px;
  color: #64748b;
  margin-top: 8px;
}

.btn-icon:hover {
  color: #2563eb;
}

.text-danger:hover {
  color: #ef4444;
}

.btn-icon svg {
  width: 18px;
  height: 18px;
}

.text-right {
  text-align: right;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 32px;
  width: 100%;
  max-width: 500px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
}

input, select {
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
}

.btn-outline {
  background: transparent;
  border: 1px solid #e2e8f0;
}

.empty-state {
  padding: 48px;
  text-align: center;
  color: #64748b;
}
</style>
