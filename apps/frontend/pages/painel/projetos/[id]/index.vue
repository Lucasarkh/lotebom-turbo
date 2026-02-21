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
          <a
            v-if="project.status === 'PUBLISHED'"
            :href="`/p/${tenantSlug}/${project.slug}`"
            target="_blank"
            class="btn btn-sm btn-outline"
            title="Ver página pública"
          >🔗 Ver Página</a>
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

      <!-- Tab: Pág. Pública -->
      <div v-if="activeTab === 'public'">
        <!-- Public URL card -->
        <div class="card" style="margin-bottom: var(--space-5);">
          <h3 style="margin-bottom: var(--space-3);">Link da Página Pública</h3>
          <div v-if="project.status !== 'PUBLISHED'" class="alert alert-warning" style="margin-bottom: var(--space-3);">
            O projeto está como Rascunho. Publique-o para a página ser acessível.
          </div>
          <div class="flex gap-3 items-center" style="flex-wrap:wrap;">
            <code style="background: var(--gray-100); padding: 6px 12px; border-radius: var(--radius-sm); font-size:0.9rem;">
              {{ publicUrl || '(publique o projeto para gerar o link)' }}
            </code>
            <a v-if="publicUrl" :href="publicUrl" target="_blank" class="btn btn-sm btn-outline">🔗 Abrir</a>
            <button v-if="publicUrl" class="btn btn-sm btn-secondary" @click="copyLink(`${$config?.public?.baseUrl || ''}${publicUrl}`)">📋 Copiar</button>
          </div>
        </div>

        <!-- Highlights / features -->
        <div class="card" style="margin-bottom: var(--space-5);">
          <h3 style="margin-bottom: var(--space-4);">Diferenciais do Loteamento</h3>
          <p style="color: var(--gray-500); font-size:0.875rem; margin-bottom: var(--space-4);">Ícones e informações exibidos na página pública como cards de destaque.</p>

          <div v-if="pubInfoForm.highlightsJson.length" style="margin-bottom: var(--space-4);">
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Ícone</th><th>Rótulo</th><th>Valor</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="(h, i) in pubInfoForm.highlightsJson" :key="i">
                    <td style="font-size:1.25rem;">{{ h.icon }}</td>
                    <td>{{ h.label }}</td>
                    <td>{{ h.value }}</td>
                    <td><button v-if="authStore.canEdit" class="btn btn-danger btn-sm" @click="removeHighlight(i)">✕</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="authStore.canEdit" class="flex gap-2 items-end" style="flex-wrap:wrap; margin-bottom: var(--space-4);">
            <div class="form-group" style="margin:0; flex:0 0 80px;">
              <label class="form-label">Ícone</label>
              <input v-model="newHighlight.icon" class="form-input" placeholder="🏡" style="font-size:1.2rem;" />
            </div>
            <div class="form-group" style="margin:0; flex:1 1 160px;">
              <label class="form-label">Rótulo</label>
              <input v-model="newHighlight.label" class="form-input" placeholder="Infraestrutura completa" />
            </div>
            <div class="form-group" style="margin:0; flex:1 1 160px;">
              <label class="form-label">Valor / Detalhe</label>
              <input v-model="newHighlight.value" class="form-input" placeholder="Água, luz, asfalto" />
            </div>
            <button class="btn btn-secondary btn-sm" style="margin-bottom:2px;" @click="addHighlight">+ Adicionar</button>
          </div>
        </div>

        <!-- Location / info text -->
        <div class="card" style="margin-bottom: var(--space-5);">
          <h3 style="margin-bottom: var(--space-3);">Localização e Infraestrutura</h3>
          <p style="color: var(--gray-500); font-size:0.875rem; margin-bottom: var(--space-3);">Texto exibido na seção de informações gerais da página pública.</p>
          <div class="form-group">
            <textarea v-model="pubInfoForm.locationText" class="form-textarea" rows="5" placeholder="Ex: Localizado no bairro X, próximo a escola, hospital, etc." :disabled="!authStore.canEdit"></textarea>
          </div>
        </div>

        <div v-if="authStore.canEdit">
          <div v-if="pubInfoSaved" class="alert alert-success" style="margin-bottom: var(--space-3);">Informações salvas!</div>
          <button class="btn btn-primary" :disabled="savingPubInfo" @click="savePubInfo">
            {{ savingPubInfo ? 'Salvando...' : 'Salvar Informações Públicas' }}
          </button>
        </div>
      </div>

      <!-- Tab: Corretores -->
      <div v-if="activeTab === 'corretores'">
        <div class="card" style="margin-bottom: var(--space-5);">
          <h3 style="margin-bottom: var(--space-2);">Links de Corretor</h3>
          <p style="color: var(--gray-500); font-size:0.875rem;">Cada corretor tem um link personalizado. Quando acessado, a página exibe os dados do corretor para contato. Leads capturados por esse link são vinculados ao corretor.</p>
        </div>

        <div v-if="authStore.canEdit" style="margin-bottom: var(--space-5);">
          <button class="btn btn-primary" @click="showNewCorretor = !showNewCorretor">
            {{ showNewCorretor ? '✕ Cancelar' : '+ Novo Corretor' }}
          </button>

          <div v-if="showNewCorretor" class="card" style="margin-top: var(--space-4); max-width: 600px;">
            <h4 style="margin-bottom: var(--space-4);">Novo Link de Corretor</h4>
            <div class="grid grid-cols-2" style="gap: var(--space-3);">
              <div class="form-group">
                <label class="form-label">Nome *</label>
                <input v-model="corretorForm.name" class="form-input" placeholder="João Corretor" required />
              </div>
              <div class="form-group">
                <label class="form-label">Código (URL) *</label>
                <input v-model="corretorForm.code" class="form-input" placeholder="joao-c" required />
                <small style="color:var(--gray-500); font-size:0.75rem;">Usado como ?c={{ corretorForm.code || 'codigo' }}</small>
              </div>
              <div class="form-group">
                <label class="form-label">Telefone</label>
                <input v-model="corretorForm.phone" class="form-input" placeholder="(00) 00000-0000" />
              </div>
              <div class="form-group">
                <label class="form-label">E-mail</label>
                <input v-model="corretorForm.email" type="email" class="form-input" placeholder="corretor@email.com" />
              </div>
            </div>
            <div v-if="corretorError" class="alert alert-error" style="margin-top: var(--space-3);">{{ corretorError }}</div>
            <div class="modal-actions" style="margin-top: var(--space-4);">
              <button class="btn btn-secondary" @click="showNewCorretor = false">Cancelar</button>
              <button class="btn btn-primary" :disabled="creatingCorretor || !corretorForm.name || !corretorForm.code" @click="createCorretor">
                {{ creatingCorretor ? 'Criando...' : 'Criar Corretor' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="loadingCorretores" class="loading-state"><div class="loading-spinner"></div></div>

        <div v-else-if="corretores.length === 0" class="empty-state">
          <div class="empty-state-icon">🤝</div>
          <h3>Nenhum corretor cadastrado</h3>
          <p>Crie links personalizados para corretores divulgarem o loteamento.</p>
        </div>

        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Código</th>
                <th>Telefone</th>
                <th>Leads</th>
                <th>Status</th>
                <th>Link do Loteamento</th>
                <th v-if="authStore.canEdit">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in corretores" :key="c.id">
                <td><strong>{{ c.name }}</strong></td>
                <td><code>{{ c.code }}</code></td>
                <td>{{ c.phone || '—' }}</td>
                <td>{{ c._count?.leads ?? 0 }}</td>
                <td>
                  <span class="badge" :class="c.enabled ? 'badge-success' : 'badge-neutral'">{{ c.enabled ? 'Ativo' : 'Inativo' }}</span>
                </td>
                <td>
                  <div v-if="publicUrl" class="flex gap-2 items-center">
                    <code style="font-size:0.75rem; color: var(--gray-600);">?c={{ c.code }}</code>
                    <button class="btn btn-sm btn-outline" @click="copyLink(`${$config?.public?.siteUrl || (typeof window !== 'undefined' ? window.location.origin : '')}${publicUrl}?c=${c.code}`)">📋 Copiar</button>
                  </div>
                  <span v-else style="color:var(--gray-400); font-size:0.8rem;">Publique o projeto</span>
                </td>
                <td v-if="authStore.canEdit">
                  <div class="flex gap-2">
                    <button class="btn btn-sm btn-secondary" @click="toggleCorretor(c)">{{ c.enabled ? 'Desativar' : 'Ativar' }}</button>
                    <button class="btn btn-sm btn-danger" @click="deleteCorretor(c)">Excluir</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-else class="error-state">Projeto não encontrado.</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

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

const tenantSlug = computed(() => project.value?.tenant?.slug || '')
const publicUrl = computed(() => tenantSlug.value && project.value ? `/p/${tenantSlug.value}/${project.value.slug}` : null)

const editForm = ref({ name: '', slug: '', description: '' })

// ── Public info (highlights + location) ──────────────────
const pubInfoForm = ref({ highlightsJson: [], locationText: '' })
const savingPubInfo = ref(false)
const pubInfoSaved = ref(false)
const newHighlight = ref({ icon: '✅', label: '', value: '' })

const addHighlight = () => {
  if (!newHighlight.value.label) return
  pubInfoForm.value.highlightsJson = [...pubInfoForm.value.highlightsJson, { ...newHighlight.value }]
  newHighlight.value = { icon: '✅', label: '', value: '' }
}
const removeHighlight = (i) => {
  pubInfoForm.value.highlightsJson = pubInfoForm.value.highlightsJson.filter((_, idx) => idx !== i)
}
const savePubInfo = async () => {
  savingPubInfo.value = true; pubInfoSaved.value = false
  try {
    project.value = await fetchApi(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ highlightsJson: pubInfoForm.value.highlightsJson, locationText: pubInfoForm.value.locationText }),
    })
    pubInfoSaved.value = true
    toastSuccess('Informações públicas salvas!')
    setTimeout(() => pubInfoSaved.value = false, 2000)
  } catch (e) { toastFromError(e, 'Erro ao salvar') }
  savingPubInfo.value = false
}

// ── Corretores ────────────────────────────────────────────
const corretores = ref([])
const loadingCorretores = ref(false)
const showNewCorretor = ref(false)
const creatingCorretor = ref(false)
const corretorForm = ref({ name: '', phone: '', email: '', code: '', enabled: true, notes: '' })
const corretorError = ref('')

const loadCorretores = async () => {
  loadingCorretores.value = true
  try {
    corretores.value = await fetchApi(`/realtor-links?projectId=${projectId}`)
  } catch (e) { toastFromError(e, 'Erro ao carregar corretores') }
  loadingCorretores.value = false
}

const createCorretor = async () => {
  creatingCorretor.value = true; corretorError.value = ''
  try {
    const c = await fetchApi('/realtor-links', {
      method: 'POST',
      body: JSON.stringify({ ...corretorForm.value, projectId }),
    })
    corretores.value.unshift(c)
    showNewCorretor.value = false
    corretorForm.value = { name: '', phone: '', email: '', code: '', enabled: true, notes: '' }
    toastSuccess('Corretor criado!')
  } catch (e) {
    corretorError.value = e.message || 'Erro ao criar'
    toastFromError(e, 'Erro ao criar corretor')
  }
  creatingCorretor.value = false
}

const toggleCorretor = async (c) => {
  try {
    const updated = await fetchApi(`/realtor-links/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !c.enabled }),
    })
    Object.assign(c, updated)
  } catch (e) { toastFromError(e, 'Erro ao atualizar corretor') }
}

const deleteCorretor = async (c) => {
  if (!confirm(`Excluir corretor "${c.name}"?`)) return
  try {
    await fetchApi(`/realtor-links/${c.id}`, { method: 'DELETE' })
    corretores.value = corretores.value.filter(x => x.id !== c.id)
    toastSuccess('Corretor excluído')
  } catch (e) { toastFromError(e, 'Erro ao excluir corretor') }
}

const corretorLotLink = (c, lotCode) => {
  if (!publicUrl.value) return ''
  return `${window?.location?.origin || ''}${publicUrl.value}?c=${c.code}${lotCode ? `#lote-${lotCode}` : ''}`
}

const copyLink = (text) => {
  navigator.clipboard.writeText(text)
  toastSuccess('Link copiado!')
}

// ── Tabs ─────────────────────────────────────────────────
const tabs = [
  { key: 'map', label: 'Mapa' },
  { key: 'lots', label: 'Lotes' },
  { key: 'media', label: 'Mídia' },
  { key: 'public', label: 'Pág. Pública' },
  { key: 'corretores', label: 'Corretores' },
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
    pubInfoForm.value = {
      highlightsJson: Array.isArray(p.highlightsJson) ? p.highlightsJson : [],
      locationText: p.locationText || '',
    }
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

onMounted(async () => {
  await loadProject()
  await loadCorretores()
})
</script>

<style scoped>
.media-card {
  border: 1px solid var(--gray-200); border-radius: var(--radius-md); overflow: hidden; background: white;
}
.media-thumb { width: 100%; height: 160px; object-fit: cover; display: block; }
.media-info { padding: var(--space-3); display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; color: var(--gray-600); }
</style>
