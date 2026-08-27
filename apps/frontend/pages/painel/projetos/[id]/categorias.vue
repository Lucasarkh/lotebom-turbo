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

                <div class="mt-5 border-t border-p-border pt-4">
                  <div class="mb-2">
                    <span class="text-sm font-medium text-p-text-secondary">Banner do topo</span>
                    <p class="text-xs text-p-text-muted">
                      Fundo do topo da página desta categoria. Use uma imagem panorâmica (sugestão: 1920x440).
                      O preview abaixo tem a mesma proporção e o mesmo escurecimento da página real.
                    </p>
                  </div>

                  <!-- Replica do topo publico: mesma proporcao, mesmo recorte e a
                       mesma sombra que protege o texto, para o que se ve aqui ser
                       o que sai na pagina. -->
                  <div class="banner-preview" :class="{ 'has-image': !!category.bannerUrl }">
                    <div
                      v-if="category.bannerUrl"
                      class="banner-preview__image"
                      :style="{
                        backgroundImage: `url(&quot;${category.bannerUrl}&quot;)`,
                        backgroundPosition: `${category.bannerFocusX}% ${category.bannerFocusY}%`,
                      }"
                    ></div>
                    <div v-else class="banner-preview__empty">
                      <i class="bi bi-image-alt text-2xl" aria-hidden="true"></i>
                      <span class="text-sm">Sem banner — o topo fica branco</span>
                    </div>
                    <div v-if="category.bannerUrl" class="banner-preview__scrim"></div>
                    <div v-if="category.bannerUrl" class="banner-preview__copy">
                      <span class="banner-preview__kicker">Categoria selecionada</span>
                      <strong class="banner-preview__title">{{ category.name || 'Categoria' }}</strong>
                      <span class="banner-preview__text">{{ category.description || 'Descrição da categoria' }}</span>
                    </div>
                  </div>

                  <div v-if="category.bannerUrl && !isReadOnly" class="mt-3 flex flex-col gap-2">
                    <label
                      class="flex items-center gap-3 text-xs"
                      :class="hasHorizontalSlack(category) ? 'text-p-text-secondary' : 'text-p-text-muted opacity-60'"
                    >
                      <span class="w-24 shrink-0">Foco horizontal</span>
                      <input
                        v-model.number="category.bannerFocusX"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        class="w-full"
                        :disabled="!hasHorizontalSlack(category)"
                        @change="saveBannerPosition(category)"
                      />
                      <span class="w-10 shrink-0 text-right tabular-nums">{{ category.bannerFocusX }}%</span>
                    </label>
                    <label
                      class="flex items-center gap-3 text-xs"
                      :class="hasVerticalSlack(category) ? 'text-p-text-secondary' : 'text-p-text-muted opacity-60'"
                    >
                      <span class="w-24 shrink-0">Foco vertical</span>
                      <input
                        v-model.number="category.bannerFocusY"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        class="w-full"
                        :disabled="!hasVerticalSlack(category)"
                        @change="saveBannerPosition(category)"
                      />
                      <span class="w-10 shrink-0 text-right tabular-nums">{{ category.bannerFocusY }}%</span>
                    </label>

                    <p v-if="!hasHorizontalSlack(category)" class="text-xs text-p-text-muted">
                      Esta imagem é mais alta que a faixa do topo: ela já preenche a largura inteira e sobra
                      só na altura. Por isso o foco horizontal está desligado — quem muda o recorte é o vertical.
                    </p>
                    <p v-else-if="!hasVerticalSlack(category)" class="text-xs text-p-text-muted">
                      Esta imagem é mais larga que a faixa do topo: ela já preenche a altura inteira e sobra
                      só na largura. Por isso o foco vertical está desligado.
                    </p>
                    <p v-else class="text-xs text-p-text-muted">
                      O enquadramento salva sozinho ao soltar o controle.
                    </p>
                  </div>

                  <div class="mt-2 flex flex-wrap items-center gap-2">
                    <label v-if="!isReadOnly" class="relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border border-p-border bg-p-overlay px-4 py-2.5 text-sm font-bold text-p-text-secondary transition-colors hover:border-p-border-hover hover:text-p-text">
                      <i class="bi bi-upload" aria-hidden="true"></i>
                      <span>{{ category.isUploadingBanner ? 'Enviando...' : 'Enviar banner' }}</span>
                      <input
                        :disabled="category.isUploadingBanner"
                        type="file"
                        accept="image/*"
                        class="absolute inset-0 cursor-pointer opacity-0"
                        @change="uploadCategoryBanner(category, $event)"
                      />
                    </label>
                    <UiButton
                      v-if="!isReadOnly && category.bannerUrl"
                      variant="danger"
                      size="sm"
                      :disabled="category.isRemovingBanner"
                      @click="removeCategoryBanner(category)"
                    >
                      <i class="bi bi-trash3" aria-hidden="true"></i>
                      {{ category.isRemovingBanner ? 'Removendo...' : 'Remover banner' }}
                    </UiButton>
                    <span v-if="category.isSavingBannerPosition" class="text-xs text-p-text-muted">
                      Salvando enquadramento...
                    </span>
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
  bannerUrl?: string | null
  bannerPosition?: string | null
  totalLots?: number
  availableLots?: number
}

type EditableCategory = {
  id: string
  name: string
  slug: string
  description: string
  imageUrl: string | null
  bannerUrl: string | null
  bannerFocusX: number
  bannerFocusY: number
  bannerRatio: number | null
  isSavingBannerPosition: boolean
  totalLots: number
  availableLots: number
  isSaving: boolean
  isDeleting: boolean
  isUploading: boolean
  isRemovingImage: boolean
  isUploadingBanner: boolean
  isRemovingBanner: boolean
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

// Proporcao do topo publico com banner (ProjectCategoryLotsView, >=768px).
// Comparar com a proporcao da foto diz qual eixo tem sobra para deslocar.
const BANNER_FRAME_RATIO = 4.4

// O foco vem do banco como "X% Y%" e vira dois numeros para os controles.
const parseBannerPosition = (raw?: string | null) => {
  const match = String(raw || '').match(/^(\d{1,3})%\s+(\d{1,3})%$/)
  return {
    bannerFocusX: match ? Math.min(100, Number(match[1])) : 50,
    bannerFocusY: match ? Math.min(100, Number(match[2])) : 50,
  }
}

const bannerPositionOf = (category: EditableCategory) =>
  `${category.bannerFocusX}% ${category.bannerFocusY}%`

// Com background-size: cover, so o eixo que sobra pode ser deslocado. Foto mais
// "quadrada" que o quadro transborda na altura: mexer na horizontal nao faz nada.
const hasHorizontalSlack = (category: EditableCategory) =>
  category.bannerRatio === null || category.bannerRatio > BANNER_FRAME_RATIO + 0.01

const hasVerticalSlack = (category: EditableCategory) =>
  category.bannerRatio === null || category.bannerRatio < BANNER_FRAME_RATIO - 0.01

const measureBanners = () => {
  if (!import.meta.client) return

  for (const category of categories.value) {
    if (!category.bannerUrl || category.bannerRatio !== null) continue

    const probe = new Image()
    const target = category.id
    probe.onload = () => {
      const found = categories.value.find((item) => item.id === target)
      if (found && probe.naturalHeight > 0) {
        found.bannerRatio = probe.naturalWidth / probe.naturalHeight
      }
    }
    probe.src = category.bannerUrl
  }
}

const normalizeCategories = (items: CategoryApiItem[] = []) => {
  categories.value = items.map((item) => ({
    id: item.id,
    name: String(item.name || ''),
    slug: String(item.slug || ''),
    description: String(item.description || ''),
    imageUrl: item.imageUrl || null,
    bannerUrl: item.bannerUrl || null,
    ...parseBannerPosition(item.bannerPosition),
    bannerRatio: null,
    isSavingBannerPosition: false,
    totalLots: Number(item.totalLots || 0),
    availableLots: Number(item.availableLots || 0),
    isSaving: false,
    isDeleting: false,
    isUploading: false,
    isRemovingImage: false,
    isUploadingBanner: false,
    isRemovingBanner: false,
  }))

  measureBanners()
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
        bannerPosition: bannerPositionOf(category),
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

// O enquadramento salva sozinho ao soltar o controle: depender do botao Salvar
// fazia o ajuste parecer perdido a cada recarga da lista.
const saveBannerPosition = async (category: EditableCategory) => {
  if (isReadOnly.value || !category.bannerUrl) return

  const position = bannerPositionOf(category)
  category.isSavingBannerPosition = true
  try {
    await fetchApi(`/projects/${projectId}/lots/categories/${category.id}`, {
      method: 'PUT',
      body: { bannerPosition: position },
    })
  } catch (error) {
    toast.fromError(error, 'Erro ao salvar o enquadramento do banner')
  } finally {
    category.isSavingBannerPosition = false
  }
}

const uploadCategoryBanner = async (category: EditableCategory, event: Event) => {
  if (isReadOnly.value) return

  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) return

  category.isUploadingBanner = true
  try {
    const formData = new FormData()
    formData.append('file', file, file.name)
    const result = await uploadApi(`/projects/${projectId}/lots/categories/${category.id}/banner`, formData)
    normalizeCategories(result || [])
    toast.success('Banner da categoria atualizado.')
  } catch (error) {
    toast.fromError(error, 'Erro ao enviar banner da categoria')
  } finally {
    category.isUploadingBanner = false
    if (input) input.value = ''
  }
}

const removeCategoryBanner = async (category: EditableCategory) => {
  if (isReadOnly.value || !category.bannerUrl) return

  category.isRemovingBanner = true
  try {
    const result = await fetchApi(`/projects/${projectId}/lots/categories/${category.id}/banner`, {
      method: 'DELETE',
    })
    normalizeCategories(result || [])
    toast.success('Banner removido.')
  } catch (error) {
    toast.fromError(error, 'Erro ao remover banner da categoria')
  } finally {
    category.isRemovingBanner = false
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

<style scoped>
/* Replica do topo publico da categoria. A proporcao e a mesma do card do hero
   em tela larga (~4.4:1), e a sombra usa os mesmos parametros de
   ProjectCategoryLotsView, para o enquadramento visto aqui ser o que vai ao ar. */
.banner-preview {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4.4 / 1;
  min-height: 120px;
  border-radius: 14px;
  border: 1px solid var(--p-border, rgba(255, 255, 255, 0.1));
  background: var(--p-overlay, rgba(255, 255, 255, 0.04));
}

.banner-preview.has-image {
  background-color: #0b1220;
}

.banner-preview__image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-repeat: no-repeat;
}

.banner-preview__scrim {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(6, 12, 24, 0.2), rgba(6, 12, 24, 0.3)),
    linear-gradient(
      95deg,
      rgba(6, 12, 24, 0.92) 0%,
      rgba(6, 12, 24, 0.84) 26%,
      rgba(6, 12, 24, 0.5) 46%,
      rgba(6, 12, 24, 0.12) 62%,
      rgba(6, 12, 24, 0) 74%
    );
}

.banner-preview__empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--p-text-muted, rgba(255, 255, 255, 0.5));
}

.banner-preview__copy {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 6%;
  max-width: 56%;
}

.banner-preview__kicker {
  color: #93c5fd;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.banner-preview__title {
  color: #fff;
  font-size: clamp(0.9rem, 2.4vw, 1.4rem);
  font-weight: 700;
  line-height: 1.1;
  text-shadow: 0 1px 14px rgba(2, 8, 20, 0.55);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.banner-preview__text {
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.62rem;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1px 10px rgba(2, 8, 20, 0.5);
}
</style>
