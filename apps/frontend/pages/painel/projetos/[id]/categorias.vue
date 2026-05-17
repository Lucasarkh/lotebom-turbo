<template>
  <div class="space-y-6">
    <div>
      <NuxtLink :to="`/painel/projetos/${projectId}`" class="mb-3 inline-flex items-center gap-1.5 text-sm text-p-text-muted transition-colors hover:text-p-text">
        <i class="bi bi-arrow-left-short text-lg" aria-hidden="true"></i>
        <span>{{ projectName || 'Projeto' }}</span>
      </NuxtLink>
      <UiPageHeader title="Categorias de Lote" description="Crie, edite e ilustre as categorias exibidas na página pública dedicada.">
        <template #actions>
          <a
            v-if="publicCategoriesUrl"
            :href="publicCategoriesUrl"
            target="_blank"
            class="inline-flex items-center gap-2 rounded-full border border-p-info/30 bg-p-info-subtle px-4 py-2 text-sm font-bold text-p-text transition-all hover:-translate-y-0.5 hover:border-p-info/50"
          >
            <i class="bi bi-globe2" aria-hidden="true"></i>
            <span>Ver página pública</span>
          </a>
        </template>
      </UiPageHeader>
    </div>

    <UiLoadingState v-if="loading" />

    <UiAlert v-else-if="loadError" variant="error" :title="loadError" />

    <div v-else class="space-y-5" :class="{ 'pointer-events-none opacity-60': isReadOnly }">
      <UiAlert v-if="isArchivedProject" variant="warning" title="Projeto arquivado em modo somente leitura. Publique o projeto para liberar edições." />

      <UiCard padding="lg">
        <div class="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-p-text">Nova categoria</h2>
            <p class="mt-1 text-sm text-p-text-muted">Use nome, descrição curta e imagem para formar os cards da página pública.</p>
          </div>
          <span class="rounded-full border border-p-border bg-p-overlay px-3 py-1.5 text-xs text-p-text-secondary">Organização visual e comercial</span>
        </div>

        <fieldset :disabled="isReadOnly || savingNewCategory" class="m-0 border-0 p-0">
          <div class="grid grid-cols-1 items-start gap-3 lg:grid-cols-[1.2fr_1.2fr_0.7fr]">
            <div>
              <label class="mb-1 block text-sm font-medium text-p-text-secondary">Nome</label>
              <input v-model="newCategory.name" class="w-full rounded-lg border border-p-border bg-p-overlay px-3 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" maxlength="80" placeholder="Ex: Vista livre" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-p-text-secondary">Descrição curta</label>
              <input v-model="newCategory.description" class="w-full rounded-lg border border-p-border bg-p-overlay px-3 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" maxlength="500" placeholder="Ex: lotes com melhor abertura visual do empreendimento." />
            </div>
            <div class="rounded-xl border border-p-border bg-p-overlay p-3.5">
              <strong class="mb-2 block text-sm text-p-text">Boas práticas</strong>
              <p class="text-sm leading-relaxed text-p-text-muted">Use categorias objetivas. Elas aparecem como cards independentes para o cliente navegar antes de ver os lotes.</p>
            </div>
          </div>

          <div class="mt-4 flex justify-end">
            <UiButton variant="primary" type="button" @click="createCategory">
              <i class="bi bi-plus-lg" aria-hidden="true"></i>
              {{ savingNewCategory ? 'Salvando...' : 'Criar categoria' }}
            </UiButton>
          </div>
        </fieldset>
      </UiCard>

      <div>
        <div class="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-p-text">Categorias cadastradas</h2>
            <p class="mt-1 text-sm text-p-text-muted">{{ categories.length }} categoria<span v-if="categories.length !== 1">s</span> prontas para organização de lotes.</p>
          </div>
        </div>

        <UiEmptyState
          v-if="categories.length === 0"
          title="Nenhuma categoria criada"
          description="Cadastre a primeira categoria para separar grupos de lotes e publicar a vitrine de categorias."
        />

        <div v-else class="flex flex-col gap-4">
          <UiCard v-for="category in categories" :key="category.id" class="!p-0 overflow-hidden">
            <div class="grid grid-cols-1 md:grid-cols-[260px_1fr]">
              <div class="flex flex-col gap-3 border-b border-p-border bg-p-overlay/40 p-4 md:border-b-0 md:border-r">
                <div class="min-h-[180px] overflow-hidden rounded-xl border border-p-border bg-p-overlay" :class="{ '!bg-p-base': !!category.imageUrl }">
                  <img v-if="category.imageUrl" :src="category.imageUrl" :alt="`Imagem da categoria ${category.name}`" class="block h-[180px] w-full object-cover" />
                  <div v-else class="flex min-h-[180px] flex-col items-center justify-center gap-2.5 text-p-text-muted">
                    <i class="bi bi-image text-3xl" aria-hidden="true"></i>
                    <span class="text-sm">Sem imagem</span>
                  </div>
                </div>

                <div class="flex flex-col gap-2">
                  <label v-if="!isReadOnly" class="relative flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border border-p-border bg-p-overlay px-4 py-2.5 text-sm font-bold text-p-text-secondary transition-colors hover:border-p-border-hover hover:text-p-text">
                    <i class="bi bi-upload" aria-hidden="true"></i>
                    <span>{{ category.isUploading ? 'Enviando...' : 'Enviar imagem' }}</span>
                    <input
                      :disabled="category.isUploading"
                      type="file"
                      accept="image/*"
                      class="absolute inset-0 cursor-pointer opacity-0"
                      @change="uploadCategoryImage(category, $event)"
                    />
                  </label>
                  <UiButton
                    v-if="!isReadOnly && category.imageUrl"
                    variant="danger"
                    size="sm"
                    :disabled="category.isRemovingImage"
                    class="w-full"
                    @click="removeCategoryImage(category)"
                  >
                    <i class="bi bi-trash3" aria-hidden="true"></i>
                    {{ category.isRemovingImage ? 'Removendo...' : 'Remover' }}
                  </UiButton>
                </div>
              </div>

              <div class="p-5">
                <div class="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row">
                  <div>
                    <div class="mb-2 flex flex-wrap items-center gap-2.5">
                      <h3 class="text-lg font-semibold text-p-text">{{ category.name || 'Categoria sem nome' }}</h3>
                      <span class="rounded-full bg-p-overlay px-2.5 py-1 text-xs text-p-text-secondary">/{{ category.slug }}</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="rounded-full bg-p-success-subtle px-2.5 py-1 text-xs font-medium text-p-success">{{ category.availableLots }} disponíveis</span>
                      <span class="rounded-full bg-p-overlay px-2.5 py-1 text-xs text-p-text-secondary">{{ category.totalLots }} no total</span>
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-2.5">
                    <UiButton variant="primary" :disabled="isReadOnly || category.isSaving" @click="saveCategory(category)">
                      <i class="bi bi-check2-circle" aria-hidden="true"></i>
                      {{ category.isSaving ? 'Salvando...' : 'Salvar' }}
                    </UiButton>
                    <UiButton v-if="!isReadOnly" variant="danger" :disabled="category.isDeleting" @click="deleteCategory(category)">
                      <i class="bi bi-trash3" aria-hidden="true"></i>
                      {{ category.isDeleting ? 'Excluindo...' : 'Excluir' }}
                    </UiButton>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-p-text-secondary">Nome</label>
                    <input v-model="category.name" class="w-full rounded-lg border border-p-border bg-p-overlay px-3 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" maxlength="80" :disabled="isReadOnly || category.isSaving" />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-p-text-secondary">Descrição</label>
                    <textarea
                      v-model="category.description"
                      class="w-full resize-y rounded-lg border border-p-border bg-p-overlay px-3 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none"
                      maxlength="500"
                      rows="3"
                      :disabled="isReadOnly || category.isSaving"
                    ></textarea>
                  </div>
                </div>

                <div class="mt-3.5 inline-flex items-center gap-2 text-xs text-p-text-muted">
                  <i class="bi bi-info-circle" aria-hidden="true"></i>
                  <span>O slug é gerado automaticamente a partir do nome e aparece na navegação pública.</span>
                </div>
              </div>
            </div>
          </UiCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '~/composables/useApi'
import { useToast } from '~/composables/useToast'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'painel' })

type CategoryApiItem = {
  id: string
  name: string
  slug: string
  description?: string | null
  imageUrl?: string | null
  totalLots?: number
  availableLots?: number
}

type EditableCategory = {
  id: string
  name: string
  slug: string
  description: string
  imageUrl: string | null
  totalLots: number
  availableLots: number
  isSaving: boolean
  isDeleting: boolean
  isUploading: boolean
  isRemovingImage: boolean
}

const route = useRoute()
const projectId = String(route.params.id || '')

const { fetchApi, uploadApi } = useApi()
const toast = useToast()
const authStore = useAuthStore()

const loading = ref(true)
const loadError = ref<string | null>(null)
const projectName = ref('')
const projectStatus = ref('')
const projectSlug = ref('')
const categories = ref<EditableCategory[]>([])
const savingNewCategory = ref(false)
const newCategory = ref({ name: '', description: '' })

const isArchivedProject = computed(() => projectStatus.value === 'ARCHIVED')
const isReadOnly = computed(() => !authStore.canEdit || isArchivedProject.value)
const publicCategoriesUrl = computed(() => {
  const slug = String(projectSlug.value || '').trim()
  return slug ? `/${slug}/categorias` : ''
})

const normalizeCategories = (items: CategoryApiItem[] = []) => {
  categories.value = items.map((item) => ({
    id: item.id,
    name: String(item.name || ''),
    slug: String(item.slug || ''),
    description: String(item.description || ''),
    imageUrl: item.imageUrl || null,
    totalLots: Number(item.totalLots || 0),
    availableLots: Number(item.availableLots || 0),
    isSaving: false,
    isDeleting: false,
    isUploading: false,
    isRemovingImage: false,
  }))
}

const loadProject = async () => {
  const project = await fetchApi(`/projects/${projectId}`)
  projectName.value = String(project?.name || '')
  projectStatus.value = String(project?.status || '')
  projectSlug.value = String(project?.slug || '')
}

const loadCategories = async () => {
  const result = await fetchApi(`/projects/${projectId}/lots/categories`)
  normalizeCategories(result || [])
}

const refreshPageData = async () => {
  await Promise.all([loadProject(), loadCategories()])
}

const createCategory = async () => {
  if (isReadOnly.value) return

  const name = String(newCategory.value.name || '').trim()
  const description = String(newCategory.value.description || '').trim()
  if (!name) {
    toast.fromError(new Error('Informe o nome da categoria.'), 'Informe o nome da categoria.')
    return
  }

  savingNewCategory.value = true
  try {
    const result = await fetchApi(`/projects/${projectId}/lots/categories`, {
      method: 'POST',
      body: {
        name,
        description: description || undefined,
      },
    })
    normalizeCategories(result || [])
    newCategory.value = { name: '', description: '' }
    toast.success('Categoria criada com sucesso.')
  } catch (error) {
    toast.fromError(error, 'Erro ao criar categoria')
  } finally {
    savingNewCategory.value = false
  }
}

const saveCategory = async (category: EditableCategory) => {
  if (isReadOnly.value) return

  const name = String(category.name || '').trim()
  const description = String(category.description || '').trim()
  if (!name) {
    toast.fromError(new Error('Informe o nome da categoria.'), 'Informe o nome da categoria.')
    return
  }

  category.isSaving = true
  try {
    const result = await fetchApi(`/projects/${projectId}/lots/categories/${category.id}`, {
      method: 'PUT',
      body: {
        name,
        description: description || undefined,
      },
    })
    normalizeCategories(result || [])
    toast.success('Categoria atualizada.')
  } catch (error) {
    toast.fromError(error, 'Erro ao salvar categoria')
  } finally {
    category.isSaving = false
  }
}

const deleteCategory = async (category: EditableCategory) => {
  if (isReadOnly.value) return
  if (!confirm(`Excluir a categoria "${category.name}"? Os lotes vinculados ficarão sem categoria.`)) return

  category.isDeleting = true
  try {
    const result = await fetchApi(`/projects/${projectId}/lots/categories/${category.id}`, {
      method: 'DELETE',
    })
    normalizeCategories(result || [])
    toast.success('Categoria removida.')
  } catch (error) {
    toast.fromError(error, 'Erro ao excluir categoria')
  } finally {
    category.isDeleting = false
  }
}

const uploadCategoryImage = async (category: EditableCategory, event: Event) => {
  if (isReadOnly.value) return

  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) return

  category.isUploading = true
  try {
    const formData = new FormData()
    formData.append('file', file, file.name)
    const result = await uploadApi(`/projects/${projectId}/lots/categories/${category.id}/image`, formData)
    normalizeCategories(result || [])
    toast.success('Imagem da categoria atualizada.')
  } catch (error) {
    toast.fromError(error, 'Erro ao enviar imagem da categoria')
  } finally {
    category.isUploading = false
    if (input) input.value = ''
  }
}

const removeCategoryImage = async (category: EditableCategory) => {
  if (isReadOnly.value || !category.imageUrl) return

  category.isRemovingImage = true
  try {
    const result = await fetchApi(`/projects/${projectId}/lots/categories/${category.id}/image`, {
      method: 'DELETE',
    })
    normalizeCategories(result || [])
    toast.success('Imagem removida.')
  } catch (error) {
    toast.fromError(error, 'Erro ao remover imagem da categoria')
  } finally {
    category.isRemovingImage = false
  }
}

onMounted(async () => {
  loading.value = true
  loadError.value = null
  try {
    await refreshPageData()
  } catch (error: any) {
    loadError.value = error?.message || 'Erro ao carregar categorias do projeto.'
  } finally {
    loading.value = false
  }
})
</script>
