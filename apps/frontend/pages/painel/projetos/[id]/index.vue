<template>
  <div>
    <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" style="margin-top: var(--space-4);" @click="loadProject">Tentar novamente</button>
    </div>

    <template v-else-if="project">
      <div class="page-header">
        <div>
          <div class="flex items-center gap-3" style="margin-bottom: var(--space-2);">
            <NuxtLink to="/painel/projetos" class="btn btn-ghost btn-sm">&larr; Projetos</NuxtLink>
          </div>
          <h1>{{ project.name }}</h1>
          <p>{{ project.description || 'Sem descrição' }}</p>
        </div>
        <div class="flex gap-2">
          <span class="badge" :class="project.status === 'PUBLISHED' ? 'badge-success' : 'badge-neutral'" style="font-size: 0.875rem; padding: 4px 14px;">
            {{ project.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho' }}
          </span>
          <button v-if="authStore.canEdit" class="btn btn-sm" :class="project.status === 'PUBLISHED' ? 'btn-secondary' : 'btn-success'" @click="togglePublish">
            {{ project.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar' }}
          </button>
          <button v-if="authStore.canEdit" class="btn btn-danger btn-sm" @click="confirmDelete">Excluir</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="filter-bar">
        <button v-for="t in tabs" :key="t.key" class="filter-btn" :class="{ active: activeTab === t.key }" @click="activeTab = t.key">
          {{ t.label }}
        </button>
      </div>

      <!-- Tab: Configurações -->
      <div v-if="activeTab === 'settings'">
        <div class="card" style="max-width: 600px;">
          <form @submit.prevent="saveSettings">
            <div class="form-group">
              <label class="form-label">Nome</label>
              <input v-model="editForm.name" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Slug</label>
              <input v-model="editForm.slug" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Descrição</label>
              <textarea v-model="editForm.description" class="form-textarea" rows="3"></textarea>
            </div>
            <div v-if="settingsError" class="alert alert-error">{{ settingsError }}</div>
            <div v-if="settingsSaved" class="alert alert-success">Salvo com sucesso!</div>
            <button type="submit" class="btn btn-primary" :disabled="savingSettings">{{ savingSettings ? 'Salvando...' : 'Salvar' }}</button>
          </form>
        </div>
      </div>

      <!-- Tab: Mapa -->
      <div v-if="activeTab === 'map'">
        <div class="card">
          <h3 style="margin-bottom: var(--space-4);">Imagem Base do Mapa</h3>
          <div v-if="project.mapBaseImageUrl" style="margin-bottom: var(--space-4);">
            <img :src="project.mapBaseImageUrl" alt="Mapa" style="max-width: 100%; max-height: 400px; border-radius: var(--radius-md); border: 1px solid var(--gray-200);" />
            <button v-if="authStore.canEdit" class="btn btn-danger btn-sm" style="margin-top: var(--space-3);" @click="removeMapImage">Remover imagem</button>
          </div>
          <div v-else>
            <p style="margin-bottom: var(--space-3); color: var(--gray-500);">Nenhuma imagem base definida.</p>
          </div>
          <div v-if="authStore.canEdit">
            <label class="btn btn-secondary" style="cursor:pointer;">
              {{ uploadingMap ? 'Enviando...' : 'Upload imagem base' }}
              <input type="file" accept="image/*" style="display:none" @change="uploadMapImage" :disabled="uploadingMap" />
            </label>
          </div>
        </div>

        <div class="card" style="margin-top: var(--space-5);">
          <div class="flex justify-between items-center" style="margin-bottom: var(--space-4);">
            <h3>Elementos do Mapa ({{ mapElements.length }})</h3>
            <NuxtLink v-if="authStore.canEdit" :to="`/painel/projetos/${project.id}/editor`" class="btn btn-primary btn-sm">
              Abrir Editor
            </NuxtLink>
          </div>
          <div v-if="mapElements.length === 0" class="empty-state" style="padding: var(--space-8);">
            <p>Nenhum elemento ainda. Use o Editor de Mapa para criar.</p>
          </div>
          <div v-else class="table-wrapper">
            <table>
              <thead><tr><th>Código</th><th>Nome</th><th>Tipo</th><th>Geometria</th></tr></thead>
              <tbody>
                <tr v-for="el in mapElements" :key="el.id">
                  <td><code>{{ el.code || '—' }}</code></td>
                  <td>{{ el.name || '—' }}</td>
                  <td><span class="badge badge-neutral">{{ el.type }}</span></td>
                  <td>{{ el.geometryType }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tab: Lotes -->
      <div v-if="activeTab === 'lots'">
        <div v-if="lots.length === 0" class="empty-state">
          <h3>Nenhum detalhe de lote criado</h3>
          <p>Crie elementos do tipo LOT no editor e adicione detalhes aqui.</p>
        </div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr><th>Código</th><th>Nome</th><th>Status</th><th>Preço</th><th>Área</th><th>Frente</th><th>Fundo</th><th>Inclinação</th></tr>
            </thead>
            <tbody>
              <tr v-for="l in lots" :key="l.id">
                <td><code>{{ l.mapElement?.code || '—' }}</code></td>
                <td>{{ l.mapElement?.name || '—' }}</td>
                <td>
                  <span class="badge" :class="lotBadge(l.status)">{{ lotLabel(l.status) }}</span>
                </td>
                <td>{{ l.price ? `R$ ${l.price.toLocaleString('pt-BR')}` : '—' }}</td>
                <td>{{ l.areaM2 ? `${l.areaM2} m²` : '—' }}</td>
                <td>{{ l.frontage ? `${l.frontage} m` : '—' }}</td>
                <td>{{ l.depth ? `${l.depth} m` : '—' }}</td>
                <td>{{ slopeLabel(l.slope) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab: Mídia -->
      <div v-if="activeTab === 'media'">
        <div v-if="authStore.canEdit" style="margin-bottom: var(--space-5);">
          <label class="btn btn-primary" style="cursor:pointer;">
            {{ uploadingMedia ? 'Enviando...' : '+ Upload Mídia' }}
            <input type="file" accept="image/*,video/*" style="display:none" @change="uploadMediaFile" :disabled="uploadingMedia" />
          </label>
        </div>
        <div v-if="media.length === 0" class="empty-state">
          <h3>Nenhuma mídia</h3>
          <p>Adicione fotos e vídeos do loteamento.</p>
        </div>
        <div v-else class="grid grid-cols-4">
          <div v-for="m in media" :key="m.id" class="media-card">
            <img v-if="m.type === 'PHOTO'" :src="m.url" :alt="m.caption" class="media-thumb" />
            <video v-else :src="m.url" class="media-thumb" controls />
            <div class="media-info">
              <span>{{ m.caption || m.type }}</span>
              <button v-if="authStore.canEdit" class="btn btn-danger btn-sm" @click="deleteMedia(m.id)">Excluir</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="error-state">Projeto não encontrado.</div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'

const route = useRoute()
const router = useRouter()
const { fetchApi, uploadApi } = useApi()
const authStore = useAuthStore()
const { success: toastSuccess, fromError: toastFromError } = useToast()

const projectId = route.params.id
const loading = ref(true)
const error = ref('')
const project = ref(null)
const mapElements = ref([])
const lots = ref([])
const media = ref([])
const activeTab = ref('map')
const uploadingMap = ref(false)
const uploadingMedia = ref(false)
const savingSettings = ref(false)
const settingsError = ref('')
const settingsSaved = ref(false)

const editForm = ref({ name: '', slug: '', description: '' })

const tabs = [
  { key: 'map', label: 'Mapa' },
  { key: 'lots', label: 'Lotes' },
  { key: 'media', label: 'Mídia' },
  { key: 'settings', label: 'Configurações' },
]

const lotBadge = (s) => ({ AVAILABLE: 'badge-success', RESERVED: 'badge-warning', SOLD: 'badge-danger' }[s] || 'badge-neutral')
const lotLabel = (s) => ({ AVAILABLE: 'Disponível', RESERVED: 'Reservado', SOLD: 'Vendido' }[s] || s)
const slopeLabel = (s) => ({ FLAT: 'Plano', UPHILL: 'Aclive', DOWNHILL: 'Declive' }[s] || s)

const loadProject = async () => {
  loading.value = true
  error.value = ''
  try {
    const [p, els, lt, md] = await Promise.all([
      fetchApi(`/projects/${projectId}`),
      fetchApi(`/projects/${projectId}/map-elements`),
      fetchApi(`/projects/${projectId}/lots`),
      fetchApi(`/projects/${projectId}/media`),
    ])
    project.value = p
    mapElements.value = els
    lots.value = lt
    media.value = md
    editForm.value = { name: p.name, slug: p.slug, description: p.description || '' }
  } catch (e) {
    error.value = 'Não foi possível carregar o projeto.'
    toastFromError(e, 'Erro ao carregar projeto')
  }
  loading.value = false
}

const togglePublish = async () => {
  const action = project.value.status === 'PUBLISHED' ? 'unpublish' : 'publish'
  try {
    project.value = await fetchApi(`/projects/${projectId}/${action}`, { method: 'PATCH' })
    toastSuccess(action === 'publish' ? 'Projeto publicado!' : 'Projeto despublicado')
  } catch (e) {
    toastFromError(e, 'Erro ao alterar publicação')
  }
}

const saveSettings = async () => {
  savingSettings.value = true; settingsError.value = ''; settingsSaved.value = false
  try {
    project.value = await fetchApi(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(editForm.value) })
    settingsSaved.value = true
    toastSuccess('Configurações salvas!')
    setTimeout(() => settingsSaved.value = false, 2000)
  } catch (e) {
    settingsError.value = e.message
    toastFromError(e, 'Erro ao salvar configurações')
  }
  savingSettings.value = false
}

const confirmDelete = async () => {
  if (!confirm('Tem certeza que deseja excluir este projeto?')) return
  try {
    await fetchApi(`/projects/${projectId}`, { method: 'DELETE' })
    toastSuccess('Projeto excluído!')
    router.push('/painel/projetos')
  } catch (e) {
    toastFromError(e, 'Erro ao excluir projeto')
  }
}

const uploadMapImage = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  uploadingMap.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    project.value = await uploadApi(`/projects/${projectId}/map-image`, fd)
    toastSuccess('Imagem do mapa enviada!')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar imagem')
  }
  e.target.value = ''
  uploadingMap.value = false
}

const removeMapImage = async () => {
  try {
    project.value = await fetchApi(`/projects/${projectId}/map-image`, { method: 'DELETE' })
    toastSuccess('Imagem removida')
  } catch (e) {
    toastFromError(e, 'Erro ao remover imagem')
  }
}

const uploadMediaFile = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  uploadingMedia.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const m = await uploadApi(`/projects/${projectId}/media`, fd)
    media.value.unshift(m)
    toastSuccess('Mídia enviada!')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar mídia')
  }
  e.target.value = ''
  uploadingMedia.value = false
}

const deleteMedia = async (id) => {
  if (!confirm('Excluir esta mídia?')) return
  try {
    await fetchApi(`/projects/${projectId}/media/${id}`, { method: 'DELETE' })
    media.value = media.value.filter(m => m.id !== id)
    toastSuccess('Mídia excluída')
  } catch (e) {
    toastFromError(e, 'Erro ao excluir mídia')
  }
}

onMounted(loadProject)
</script>

<style scoped>
.media-card {
  border: 1px solid var(--gray-200); border-radius: var(--radius-md); overflow: hidden; background: white;
}
.media-thumb { width: 100%; height: 160px; object-fit: cover; display: block; }
.media-info { padding: var(--space-3); display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; color: var(--gray-600); }
</style>
