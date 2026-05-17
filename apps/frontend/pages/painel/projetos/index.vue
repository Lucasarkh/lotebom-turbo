<template>
  <div>
    <UiPageHeader title="Projetos" description="Gerencie seus loteamentos">
      <template #actions>
        <UiButton variant="primary" :disabled="!authStore.canEdit" :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : undefined" @click="handleNewProject">+ Novo Projeto</UiButton>
      </template>
    </UiPageHeader>

    <UiLoadingState v-if="loading" />

    <UiEmptyState
      v-else-if="projects.length === 0"
      title="Nenhum projeto ainda"
      description="Crie seu primeiro loteamento para começar a gerenciar unidades e leads."
      icon="📂"
    />

    <div v-else class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ProjectCard
        v-for="p in projects"
        :key="p.id"
        :project="p"
        :show-date="true"
        @click="$router.push(`/painel/projetos/${p.id}`)"
      />
    </div>

    <CommonPagination :meta="meta" @change="loadProjects" />

    <!-- Create modal -->
    <UiModal v-model="showCreate" title="Novo Projeto">
      <form @submit.prevent="handleCreate">
        <div class="space-y-4">
          <UiInput v-model="form.name" label="Nome" placeholder="Residencial Parque dos Ipês" required />
          <div>
            <UiInput v-model="form.slug" label="Slug" placeholder="parque-dos-ipes" required :error="slugTaken ? 'Este slug já está em uso!' : ''" @input="onSlugInput" />
            <p v-if="!slugTaken" class="mt-1 text-xs text-p-text-muted">URL pública: /{{ form.slug || '...' }}</p>
          </div>
          <UiTextarea v-model="form.description" label="Descrição" placeholder="Descrição do loteamento..." :rows="3" />
        </div>
        <UiAlert v-if="createError" variant="error" :title="createError" class="mt-4" />
        <div class="mt-6 flex justify-end gap-3">
          <UiButton variant="secondary" type="button" @click="showCreate = false">Cancelar</UiButton>
          <UiButton variant="primary" type="submit" :disabled="creating || slugTaken" :loading="creating">Criar</UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

definePageMeta({ layout: 'painel' })

const { fetchApi } = useApi()
const authStore = useAuthStore()
const { success: toastSuccess, fromError: toastFromError } = useToast()
const loading = ref(true)
const projects = ref([])
const meta = ref({
  totalItems: 0,
  itemCount: 0,
  itemsPerPage: 9,
  totalPages: 0,
  currentPage: 1
})
const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const slugManuallyEdited = ref(false)
const slugTaken = ref(false)
const checkingSlug = ref(false)

const form = ref({ name: '', slug: '', description: '' })

const handleNewProject = async () => {
  if (!authStore.canEdit) return
  showCreate.value = true
}

let slugTimeout = null
watch(() => form.value.slug, (v) => {
  if (!v) {
    slugTaken.value = false
    return
  }
  clearTimeout(slugTimeout)
  slugTimeout = setTimeout(async () => {
    checkingSlug.value = true
    try {
      const { available } = await fetchApi(`/projects/check-slug/${v}`)
      slugTaken.value = !available
    } catch { slugTaken.value = false }
    finally { checkingSlug.value = false }
  }, 500)
})

watch(() => form.value.name, (v) => {
  if (!slugManuallyEdited.value) {
    form.value.slug = v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
})

const onSlugInput = () => { slugManuallyEdited.value = true }

const formatDate = (d) => formatDateToBrasilia(d)

const loadProjects = async (page = 1) => {
  loading.value = true
  try {
    const res = await fetchApi(`/projects?page=${page}&limit=9`)
    projects.value = res.data
    meta.value = res.meta
  } catch (e) {
    toastFromError(e, 'Erro ao carregar projetos')
  }
  loading.value = false
}

const handleCreate = async () => {
  if (!authStore.canEdit) return
  if (slugTaken.value) {
    createError.value = 'Este slug já está em uso!'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    const p = await fetchApi('/projects', { method: 'POST', body: JSON.stringify(form.value) })
    projects.value.unshift(p)
    meta.value.totalItems++
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

onMounted(() => loadProjects(1))
</script>
