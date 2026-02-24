<template>
  <div class="p-6 max-w-6xl mx-auto">
    <header class="mb-8 border-b pb-4">
      <h1 class="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
      <p class="text-gray-500">Gerencie contatos do site e leads da plataforma.</p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Settings Card -->
      <div class="lg:col-span-1 space-y-6">
        <div class="bg-white rounded-2xl shadow-sm border p-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center">
            <i class="pi pi-cog mr-2 text-primary"></i>
            Landing Page
          </h2>
          
          <div v-if="loading" class="animate-pulse space-y-4">
            <div class="h-10 bg-gray-100 rounded"></div>
            <div class="h-10 bg-gray-100 rounded"></div>
          </div>
          <form v-else @submit.prevent="saveSettings" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">WhatsApp de Contato</label>
              <input 
                v-model="settings.contactWhatsapp" 
                type="text" 
                class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="(00) 00000-0000"
                v-maska="'(##) #####-####'"
              >
              <p class="text-xs text-gray-400 mt-1">Se preenchido, o site mostrará o botão de WhatsApp.</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">E-mail de Contato</label>
              <input 
                v-model="settings.contactEmail" 
                type="email" 
                class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="contato@empresa.com"
              >
            </div>

            <div class="flex items-center gap-2 pt-2">
              <input v-model="settings.leadFormEnabled" type="checkbox" id="form-en" class="w-4 h-4 text-primary rounded">
              <label for="form-en" class="text-sm text-gray-700">Ativar formulário de lead no site</label>
            </div>

            <button 
              type="submit" 
              class="w-full bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-hover transition shadow-sm disabled:opacity-50"
              :disabled="saving"
            >
              {{ saving ? 'Salvando...' : 'Salvar Alterações' }}
            </button>
          </form>
        </div>
      </div>

      <!-- Leads Card -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div class="p-6 border-b flex justify-between items-center">
            <h2 class="text-lg font-semibold flex items-center">
              <i class="pi pi-users mr-2 text-primary"></i>
              Interessados da Plataforma
            </h2>
            <button @click="fetchLeads" class="text-primary hover:text-primary-hover p-2 rounded-full hover:bg-primary/10 transition">
              <i class="pi pi-refresh" :class="{ 'pi-spin': leadsLoading }"></i>
            </button>
          </div>

          <div v-if="leadsLoading" class="p-12 text-center text-gray-400">
            <i class="pi pi-spin pi-spinner text-3xl mb-2"></i>
            <p>Carregando leads...</p>
          </div>
          <div v-else-if="leads.length === 0" class="p-12 text-center text-gray-400">
            <i class="pi pi-envelope text-4xl mb-3"></i>
            <p>Nenhum interessado encontrado ainda.</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left">
              <thead class="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                <tr>
                  <th class="px-6 py-4">Nome</th>
                  <th class="px-6 py-4">Contato</th>
                  <th class="px-6 py-4">Data</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y text-sm">
                <tr v-for="lead in leads" :key="lead.id" class="hover:bg-gray-50/80 transition group">
                  <td class="px-6 py-4">
                    <div class="font-medium text-gray-900">{{ lead.name }}</div>
                    <div class="text-xs text-gray-400 line-clamp-1 max-w-[200px]" v-if="lead.message">
                      "{{ lead.message }}"
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex flex-col">
                      <a :href="'mailto:' + lead.email" class="text-primary hover:underline" v-if="lead.email">{{ lead.email }}</a>
                      <a :href="'https://wa.me/' + lead.phone.replace(/\D/g, '')" target="_blank" class="text-green-600 hover:underline flex items-center gap-1" v-if="lead.phone">
                        <i class="pi pi-whatsapp"></i>
                        {{ lead.phone }}
                      </a>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-gray-500">
                    {{ new Date(lead.createdAt).toLocaleDateString('pt-BR') }}
                  </td>
                  <td class="px-6 py-4">
                    <span 
                      class="px-2.5 py-1 rounded-full text-xs font-semibold"
                      :class="{
                        'bg-blue-50 text-blue-600': lead.status === 'NEW',
                        'bg-gray-50 text-gray-600': lead.status !== 'NEW'
                      }"
                    >
                      {{ lead.status === 'NEW' ? 'Novo' : lead.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <button 
                      v-if="lead.status === 'NEW'" 
                      @click="markContacted(lead.id)"
                      class="text-xs font-semibold text-primary hover:text-primary-hover opacity-0 group-hover:opacity-100 transition"
                    >
                      Marcar Contato
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const authStore = useAuthStore()
if (!authStore.isSysAdmin) {
  navigateTo('/painel')
}

const api = useApi()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const leadsLoading = ref(true)
const settings = ref({
  contactWhatsapp: '',
  contactEmail: '',
  leadFormEnabled: true
})
const leads = ref([])

onMounted(async () => {
  await Promise.all([fetchSettings(), fetchLeads()])
})

async function fetchSettings() {
  loading.value = true
  try {
    const data = await api.get('/settings/leads').catch(() => null)
    // Actually our public endpoint is safer if we want to pre-fill
    const publicData = await api.get('/p/settings')
    if (publicData) settings.value = { ...publicData }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function fetchLeads() {
  leadsLoading.value = true
  try {
    leads.value = await api.get('/settings/leads')
  } catch (e) {
    toast.error('Erro ao carregar leads.')
  } finally {
    leadsLoading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    await api.patch('/settings', settings.value)
    toast.success('Configurações salvas com sucesso!')
  } catch (e) {
    toast.error('Erro ao salvar configurações.')
  } finally {
    saving.value = false
  }
}

async function markContacted(id) {
  try {
    await api.patch(`/settings/leads/${id}`, { status: 'CONTACTED' })
    leads.value = leads.value.map(l => l.id === id ? { ...l, status: 'CONTACTED' } : l)
    toast.success('Status atualizado.')
  } catch (e) {
    toast.error('Erro ao atualizar status.')
  }
}
</script>
