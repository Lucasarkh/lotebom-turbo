<template>
  <div class="space-y-6">
    <UiPageHeader title="Gerenciamento de Backups" description="Gerencie backups do banco de dados no AWS S3.">
      <template #actions>
        <UiButton variant="ghost" :disabled="cleaningUp" @click="handleCleanup">
          <i class="pi pi-trash"></i>
          {{ cleaningUp ? 'Limpando...' : 'Limpeza Manual' }}
        </UiButton>
        <UiButton variant="primary" :disabled="creating" @click="handleCreate">
          <i class="pi pi-plus"></i>
          {{ creating ? 'Criando...' : 'Criar Backup Agora' }}
        </UiButton>
      </template>
    </UiPageHeader>

    <UiCard padding="none">
      <UiLoadingState v-if="loading" />
      <UiEmptyState v-else-if="backups.length === 0" title="Nenhum backup encontrado" description="Crie seu primeiro backup clicando no botão acima." />
      <UiTable v-else>
        <template #head>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Data</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Tipo</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Tamanho</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Arquivo</th>
          <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-p-text-secondary">Ações</th>
        </template>
        <tr v-for="backup in backups" :key="backup.key" class="border-b border-p-border">
          <td class="px-4 py-3 text-sm text-p-text">{{ formatDate(backup.lastModified) }}</td>
          <td class="px-4 py-3 text-sm">
            <UiBadge :variant="backup.label === 'manual' ? 'info' : 'success'">
              {{ backup.label === 'manual' ? 'Manual' : 'Automático' }}
            </UiBadge>
          </td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ formatSize(backup.size) }}</td>
          <td class="max-w-[300px] truncate px-4 py-3 text-xs text-p-text-muted">
            {{ backup.key.split('/').pop() }}
          </td>
          <td class="px-4 py-3 text-right">
            <UiButton variant="warning" size="sm" :disabled="restoring" @click="confirmRestore(backup)">
              <i class="pi pi-replay"></i>
              Restaurar
            </UiButton>
          </td>
        </tr>
      </UiTable>
    </UiCard>

    <!-- Restore Confirmation Modal -->
    <UiModal v-model="showRestoreModal" title="Confirmar Restauração" size="md">
      <div class="space-y-4">
        <UiAlert variant="error" title="ATENÇÃO: Esta operação é destrutiva!">
          <p class="text-sm">
            A restauração irá sobrescrever TODOS os dados atuais do banco de dados com o conteúdo deste backup. Esta ação não pode ser desfeita.
          </p>
        </UiAlert>
        <div v-if="selectedBackup" class="text-sm text-p-text-secondary">
          <p><strong>Backup:</strong> {{ selectedBackup.key.split('/').pop() }}</p>
          <p><strong>Data:</strong> {{ formatDate(selectedBackup.lastModified) }}</p>
          <p><strong>Tamanho:</strong> {{ formatSize(selectedBackup.size) }}</p>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="showRestoreModal = false">Cancelar</UiButton>
          <UiButton variant="danger" :disabled="restoring" @click="handleRestore">
            {{ restoring ? 'Restaurando...' : 'Sim, Restaurar' }}
          </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'painel' })

const authStore = useAuthStore()
if (!authStore.isSysAdmin) {
  navigateTo(authStore.getDashboardRoute())
}

const api = useApi()
const toast = useToast()

const loading = ref(true)
const creating = ref(false)
const restoring = ref(false)
const cleaningUp = ref(false)
const backups = ref([])
const showRestoreModal = ref(false)
const selectedBackup = ref(null)

onMounted(async () => {
  await fetchBackups()
})

async function fetchBackups() {
  loading.value = true
  try {
    const data = await api.get('/backups')
    backups.value = data.backups || []
  } catch (e) {
    toast.error('Erro ao carregar backups.')
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  creating.value = true
  try {
    const result = await api.post('/backups')
    if (result.success) {
      toast.success('Backup criado com sucesso!')
      await fetchBackups()
    } else {
      toast.error(`Erro ao criar backup: ${result.error || 'Erro desconhecido'}`)
    }
  } catch (e) {
    toast.error('Erro ao criar backup.')
  } finally {
    creating.value = false
  }
}

function confirmRestore(backup) {
  selectedBackup.value = backup
  showRestoreModal.value = true
}

async function handleRestore() {
  if (!selectedBackup.value) return
  restoring.value = true
  try {
    const result = await api.post('/backups/restore', { key: selectedBackup.value.key })
    if (result.success) {
      toast.success('Backup restaurado com sucesso!')
      showRestoreModal.value = false
    } else {
      toast.error(`Erro ao restaurar: ${result.error || 'Erro desconhecido'}`)
    }
  } catch (e) {
    toast.error('Erro ao restaurar backup.')
  } finally {
    restoring.value = false
  }
}

async function handleCleanup() {
  cleaningUp.value = true
  try {
    const result = await api.post('/backups/cleanup')
    toast.success(`Limpeza concluída: ${result.deleted || 0} backup(s) removido(s).`)
    await fetchBackups()
  } catch (e) {
    toast.error('Erro ao executar limpeza.')
  } finally {
    cleaningUp.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(2)} MB`
  const kb = bytes / 1024
  return `${kb.toFixed(1)} KB`
}
</script>
