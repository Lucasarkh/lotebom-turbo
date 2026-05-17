<template>
  <div class="space-y-6">
    <UiPageHeader title="Mensagens do Site" description="Interessados que preencheram o formulário na landing page da plataforma.">
      <template #actions>
        <UiButton variant="secondary" @click="fetchLeads">
          <i class="pi pi-refresh mr-2" :class="{ 'pi-spin': leadsLoading }"></i>
          Atualizar
        </UiButton>
      </template>
    </UiPageHeader>

    <UiLoadingState v-if="leadsLoading" />

    <UiEmptyState
      v-else-if="leads.length === 0"
      title="Nenhuma mensagem"
      description="Mensagens aparecerão aqui quando alguém se interessar pela plataforma."
    >
      <template #icon>
        <i class="bi bi-envelope-fill text-2xl text-p-text-muted"></i>
      </template>
    </UiEmptyState>

    <UiTable v-else>
      <template #head>
        <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-p-text-muted">Nome</th>
        <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-p-text-muted">Contato</th>
        <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-p-text-muted">Data</th>
        <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-p-text-muted">Status</th>
        <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-p-text-muted">Ações</th>
      </template>
      <tr v-for="lead in leads" :key="lead.id" class="hover:bg-p-overlay/50 transition-colors">
        <td class="px-4 py-3">
          <div class="font-semibold text-p-text">{{ lead.name }}</div>
          <div v-if="lead.message" class="text-xs text-p-text-muted mt-0.5">
            "{{ lead.message }}"
          </div>
        </td>
        <td class="px-4 py-3">
          <div class="flex flex-col gap-1">
            <a v-if="lead.email" :href="'mailto:' + lead.email" class="text-p-accent text-[13px]">{{ lead.email }}</a>
            <a v-if="lead.phone" :href="'https://wa.me/' + lead.phone.replace(/\D/g, '')" target="_blank" class="text-p-success text-[13px] flex items-center gap-1">
              <i class="pi pi-whatsapp"></i>
              {{ lead.phone }}
            </a>
          </div>
        </td>
        <td class="px-4 py-3 text-sm text-p-text-secondary">
          {{ formatDateToBrasilia(lead.createdAt) }}
        </td>
        <td class="px-4 py-3">
          <UiBadge :variant="lead.status === 'NEW' ? 'primary' : 'neutral'">
            {{ lead.status === 'NEW' ? 'Novo' : lead.status }}
          </UiBadge>
        </td>
        <td class="px-4 py-3">
          <UiButton
            v-if="lead.status === 'NEW'"
            variant="ghost"
            size="sm"
            @click="markContacted(lead.id)"
          >
            Marcar Contato
          </UiButton>
        </td>
      </tr>
    </UiTable>
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

const leadsLoading = ref(true)
const leads = ref([])

onMounted(async () => {
  await fetchLeads()
})

async function fetchLeads() {
  leadsLoading.value = true
  try {
    leads.value = await api.get('/settings/leads')
  } catch (e) {
    toast.error('Erro ao carregar mensagens.')
  } finally {
    leadsLoading.value = false
  }
}

async function markContacted(id) {
  try {
    await api.patch(`/settings/leads/${id}`, { status: 'CONTACTED' })
    toast.success('Status atualizado!')
    await fetchLeads()
  } catch (e) {
    toast.error('Erro ao atualizar status.')
  }
}
</script>
