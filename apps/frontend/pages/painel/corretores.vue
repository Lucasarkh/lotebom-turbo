<script setup lang="ts">
const { get, post, patch, delete: del } = useApi()
const toast = useToast()

const realtors = ref([])
const projects = ref([])
const loading = ref(true)
const showModal = ref(false)
const editingRealtor = ref(null)

const form = ref({
  name: '',
  phone: '',
  creci: '',
  projectId: ''
})

async function fetchData() {
  loading.value = true
  try {
    const [realtorsData, projectsData] = await Promise.all([
      get('/realtor-links'),
      get('/projects')
    ])
    realtors.value = realtorsData
    projects.value = projectsData
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
  form.value = { name: '', phone: '', creci: '', projectId: '' }
  showModal.value = true
}

function openEdit(realtor) {
  editingRealtor.value = realtor
  form.value = {
    name: realtor.name,
    phone: realtor.phone,
    creci: realtor.creci || '',
    projectId: realtor.projectId
  }
  showModal.value = true
}

function getProjectName(projectId: string) {
  return projects.value.find(p => p.id === projectId)?.name || 'Nenhum'
}

function copyLink(slug: string) {
  const url = `${window.location.origin}/p/${slug}`
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
            <th>Empreendimento</th>
            <th>Telefone</th>
            <th>Slug</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="realtor in realtors" :key="realtor.id">
            <td><strong>{{ realtor.name }}</strong></td>
            <td>{{ realtor.creci || '-' }}</td>
            <td>{{ getProjectName(realtor.projectId) }}</td>
            <td>{{ realtor.phone }}</td>
            <td><code>{{ realtor.slug }}</code></td>
            <td class="text-right actions">
              <button class="btn-icon" @click="copyLink(realtor.slug)" title="Copiar Link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              </button>
              <button class="btn-icon" @click="openEdit(realtor)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon text-danger" @click="removeRealtor(realtor.id)">
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
            <div class="form-group">
              <label>Nome do Corretor</label>
              <input v-model="form.name" type="text" placeholder="Nome completo" required>
            </div>
            <div class="form-group">
              <label>CRECI</label>
              <input v-model="form.creci" type="text" placeholder="Ex: 12345-F">
            </div>
            <div class="form-group">
              <label>Telefone (WhatsApp)</label>
              <input v-model="form.phone" type="text" placeholder="(DD) 9XXXX-XXXX" required>
            </div>
            <div class="form-group">
              <label>Empreendimento</label>
              <select v-model="form.projectId" required>
                <option value="" disabled>Selecione um projeto</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
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
