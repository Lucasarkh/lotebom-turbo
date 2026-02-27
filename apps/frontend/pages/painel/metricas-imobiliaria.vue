<script setup lang="ts">
import { ref, onMounted } from 'vue'
const { get, post } = useApi()
const toast = useToast()
const authStore = useAuthStore()

const metrics = ref([])
const loading = ref(true)
const showInviteModal = ref(false)

const inviteForm = ref({
  email: '',
  role: 'CORRETOR'
})

async function fetchMetrics() {
  loading.value = true
  try {
    const data = await get('/agencies/metrics')
    metrics.value = data || []
  } catch (err) {
    console.error(err)
    toast.error('Erro ao carregar métricas')
    metrics.value = []
  } finally {
    loading.value = false
  }
}

async function sendInvite() {
  if (!inviteForm.value.email) {
    toast.error('Email é obrigatório')
    return
  }

  try {
    const res = await post('/agencies/invite', inviteForm.value)
    toast.success('Convite enviado com sucesso')
    
    // Magic link para cópia manual
    const magicLink = `${window.location.origin}/aceitar-convite?token=${res.token}`
    await navigator.clipboard.writeText(magicLink)
    toast.info('Magic Link copiado para a área de transferência')
    
    showInviteModal.value = false
  } catch (err) {
    toast.error('Erro ao enviar convite')
  }
}

onMounted(fetchMetrics)
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Métricas da Equipe</h1>
        <p class="text-gray-500 mt-1">Acompanhe o desempenho de seus corretores em tempo real.</p>
      </div>
      <UButton 
        icon="i-heroicons-user-plus"
        size="lg"
        color="primary"
        @click="inviteForm.email = ''; showInviteModal = true"
      >
        Convidar Corretor
      </UButton>
    </div>

    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <UCard class="bg-primary text-white">
        <div class="flex items-center gap-4">
          <div class="bg-white/20 p-3 rounded-lg">
            <UIcon name="i-heroicons-users" class="w-6 h-6" />
          </div>
          <div>
            <p class="text-white/70 text-sm font-medium uppercase tracking-wider">Total Equipe</p>
            <p class="text-2xl font-bold">{{ metrics.length }} Corretores</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center gap-4">
          <div class="bg-green-100 p-3 rounded-lg">
            <UIcon name="i-heroicons-user-group" class="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p class="text-gray-500 text-sm font-medium uppercase tracking-wider">Leads Totais</p>
            <p class="text-2xl font-bold text-gray-900">{{ metrics.reduce((acc, curr) => acc + (curr.leads || 0), 0) }}</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center gap-4">
          <div class="bg-blue-100 p-3 rounded-lg">
            <UIcon name="i-heroicons-cursor-arrow-rays" class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p class="text-gray-500 text-sm font-medium uppercase tracking-wider">Cliques Totais</p>
            <p class="text-2xl font-bold text-gray-900">{{ metrics.reduce((acc, curr) => acc + (curr.accesses || 0), 0) }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <UCard :ui="{ body: { padding: 'p-0' } }">
      <UTable 
        :rows="metrics" 
        :loading="loading"
        :columns="[
          { key: 'name', label: 'Corretor' },
          { key: 'leads', label: 'Leads' },
          { key: 'accesses', label: 'Acessos' },
          { key: 'conversion', label: 'Conversão' }
        ]"
      >
        <template #name-data="{ row }">
          <div class="flex items-center gap-3 py-1 px-4">
             <UAvatar
               :alt="row.name"
               size="sm"
               class="bg-primary/10 text-primary font-bold"
             />
             <div class="flex flex-col">
               <span class="font-bold text-gray-900">{{ row.name }}</span>
               <span class="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Corretor Ativo</span>
             </div>
          </div>
        </template>

        <template #leads-data="{ row }">
          <div class="px-4">
            <UBadge color="green" variant="subtle" class="font-bold">
              {{ row.leads || 0 }} leads
            </UBadge>
          </div>
        </template>

        <template #accesses-data="{ row }">
          <div class="px-4">
            <span class="text-gray-600 font-medium">{{ row.accesses || 0 }} cliques</span>
          </div>
        </template>

        <template #conversion-data="{ row }">
          <div class="px-4">
            <span class="text-gray-400 text-sm italic">
              {{ row.accesses ? ((row.leads / row.accesses) * 100).toFixed(1) + '%' : '0%' }}
            </span>
          </div>
        </template>
      </UTable>

      <!-- Empty State Table -->
      <div v-if="!loading && metrics.length === 0" class="p-12 text-center text-gray-500">
        Nenhum corretor cadastrado para exibir métricas.
      </div>
    </UCard>

    <UModal v-model="showInviteModal">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-900">Convidar Novo Corretor</h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" @click="showInviteModal = false" />
          </div>
        </template>
        
        <div class="p-6">
          <p class="text-sm text-gray-500 mb-6">
            O corretor receberá um link para criar sua conta e será automaticamente vinculado à sua equipe para rastreamento de vendas.
          </p>
          <UFormGroup label="Email do Corretor" required>
            <UInput v-model="inviteForm.email" type="email" icon="i-heroicons-envelope" placeholder="corretor@imobiliaria.com" size="lg" />
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3 px-4 py-3">
            <UButton color="gray" variant="ghost" @click="showInviteModal = false">Cancelar</UButton>
            <UButton color="primary" @click="sendInvite">Enviar Convite</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
