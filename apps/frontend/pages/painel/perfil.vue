<template>
  <div class="space-y-6">
    <UiPageHeader title="Meu Perfil" description="Gerencie suas informações e senha" />

    <div class="grid gap-6 md:grid-cols-2">
      <UiCard>
        <h2 class="mb-4 text-lg font-semibold text-p-text">Dados Pessoais</h2>

        <form v-if="authStore.user?.role === 'CORRETOR'" @submit.prevent="handleUpdateRealtor" class="space-y-4">
          <div class="flex items-center gap-5 rounded-xl border border-p-border bg-p-raised p-4">
            <input
              ref="realtorPhotoInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style="display: none"
              @change="handleRealtorPhotoSelected"
            />

            <div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-p-accent/20 bg-p-accent/10 text-2xl font-bold text-p-accent">
              <img v-if="realtorPhotoUrl" :src="realtorPhotoUrl" alt="Foto do corretor" class="h-full w-full object-cover" />
              <span v-else>{{ realtorPhotoInitial }}</span>
            </div>

            <div class="flex flex-1 flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold text-p-text">Foto de Perfil</h3>
                <p class="text-xs text-p-text-muted">Essa foto aparece quando o cliente acessa seu link de corretor.</p>
              </div>
              <div class="flex gap-2">
                <UiButton variant="secondary" size="sm" :disabled="photoUploading || photoRemoving" @click="openRealtorPhotoPicker">
                  {{ photoUploading ? 'Enviando...' : (realtorPhotoUrl ? 'Trocar Foto' : 'Enviar Foto') }}
                </UiButton>
                <UiButton v-if="realtorPhotoUrl" variant="ghost" size="sm" :disabled="photoUploading || photoRemoving" @click="removeRealtorPhoto">
                  {{ photoRemoving ? 'Removendo...' : 'Remover' }}
                </UiButton>
              </div>
            </div>
          </div>

          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Nome</label>
            <input v-model="realtorForm.name" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" required />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">WhatsApp (com DDD)</label>
            <input v-model="realtorForm.phone" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="(00) 00000-0000" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Código de Compartilhamento (?c=...)</label>
            <div class="flex items-center gap-2">
              <span class="text-sm text-p-text-muted">.../?c=</span>
              <input v-model="realtorForm.code" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" required pattern="^[a-zA-Z0-9-_]+$" title="Apenas letras, números, hífen e underline" />
            </div>
            <p class="text-xs text-p-text-muted">Este código identifica você nos links de compartilhamento.</p>
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">E-mail de Contato</label>
            <input v-model="realtorForm.email" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" type="email" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">CRECI</label>
            <input v-model="realtorForm.creci" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" />
          </div>

          <UiAlert v-if="realtorError" variant="error">{{ realtorError }}</UiAlert>

          <UiButton variant="primary" type="submit" :disabled="realtorLoading">
            {{ realtorLoading ? 'Salvando...' : 'Salvar Alterações' }}
          </UiButton>
        </form>

        <div v-else class="space-y-4">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Nome</label>
            <input :value="authStore.user?.name" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text-muted" disabled />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">E-mail</label>
            <input :value="authStore.user?.email" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text-muted" disabled />
          </div>
        </div>
      </UiCard>

      <UiCard>
        <h2 class="mb-4 text-lg font-semibold text-p-text">Alterar Senha</h2>
        <form @submit.prevent="handleChangePassword" class="space-y-4">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Senha Atual</label>
            <AppPasswordInput v-model="passForm.currentPassword" required />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Nova Senha</label>
            <AppPasswordInput v-model="passForm.newPassword" :placeholder="PASSWORD_POLICY_HINT" required />
            <p v-if="passwordPolicyError" class="text-xs text-p-danger">{{ passwordPolicyError }}</p>
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Confirmar Nova Senha</label>
            <AppPasswordInput v-model="passForm.confirmPassword" required />
            <p v-if="passForm.confirmPassword && passForm.confirmPassword !== passForm.newPassword" class="text-xs text-p-danger">As senhas não coincidem</p>
          </div>

          <UiAlert v-if="error" variant="error">{{ error }}</UiAlert>

          <UiButton variant="primary" type="submit" :disabled="loading || !!passwordPolicyError || (passForm.newPassword !== passForm.confirmPassword)">
            {{ loading ? 'Alterando...' : 'Atualizar Senha' }}
          </UiButton>
        </form>

        <hr class="my-6 border-p-border" />

        <h2 class="mb-4 text-lg font-semibold text-p-text">Autenticação em Duas Etapas (2FA)</h2>
        <p class="mb-4 text-sm text-p-text-muted">
          Adicione uma camada extra de segurança à sua conta. Ao ativar, um código será enviado para seu e-mail a cada login.
        </p>
        <div class="flex items-center gap-3">
          <label class="relative inline-block h-[26px] w-[48px]">
            <input type="checkbox" :checked="twoFactorEnabled" @change="handleToggle2FA" :disabled="twoFactorLoading" class="peer sr-only" />
            <span class="absolute inset-0 cursor-pointer rounded-full bg-p-overlay transition-colors before:absolute before:bottom-[3px] before:left-[3px] before:h-5 before:w-5 before:rounded-full before:bg-white before:transition-transform peer-checked:bg-p-accent peer-checked:before:translate-x-[22px]"></span>
          </label>
          <span class="text-sm font-medium text-p-text-secondary">
            {{ twoFactorEnabled ? 'Ativado' : 'Desativado' }}
          </span>
          <span v-if="twoFactorLoading" class="text-xs text-p-text-muted">Salvando...</span>
        </div>
      </UiCard>
    </div>

    <!-- Loteadora public profile section -->
    <UiCard v-if="authStore.isLoteadora">
      <h2 class="text-lg font-semibold text-p-text">Dados Públicos da Empresa</h2>
      <p class="mb-5 text-sm text-p-text-muted">
        Essas informações aparecem no rodapé das páginas de loteamento.
      </p>

      <form @submit.prevent="handleUpdateEmpresa" class="space-y-4">
        <div class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">CRECI</label>
            <input v-model="empresaForm.creci" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Ex.: CRECI-GO 12345 J" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Telefone / WhatsApp</label>
            <input
              :value="empresaForm.phone"
              @input="empresaForm.phone = maskPhone($event.target.value)"
              class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none"
              placeholder="(00) 00000-0000"
            />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">E-mail público</label>
            <input v-model="empresaForm.publicEmail" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" type="email" placeholder="contato@empresa.com.br" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Site</label>
            <input v-model="empresaForm.website" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="https://empresa.com.br" />
          </div>
        </div>

        <UiAlert v-if="empresaError" variant="error">{{ empresaError }}</UiAlert>

        <UiButton variant="primary" type="submit" :disabled="empresaLoading">
          {{ empresaLoading ? 'Salvando...' : 'Salvar Dados da Empresa' }}
        </UiButton>
      </form>
    </UiCard>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import {
  getPasswordPolicyError,
  PASSWORD_POLICY_HINT
} from '~/utils/passwordPolicy'

definePageMeta({ layout: 'painel' })

const authStore = useAuthStore()
const { fetchApi, uploadApi } = useApi()
const toast = useToast()
const { maskPhone, unmask } = useMasks()

const loading = ref(false)
const error = ref('')
const passForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const passwordPolicyError = computed(() => getPasswordPolicyError(passForm.value.newPassword))

// Realtor-specific state
const realtorLoading = ref(false)
const realtorError = ref('')
const photoUploading = ref(false)
const photoRemoving = ref(false)
const realtorPhotoUrl = ref('')
const realtorPhotoInput = ref(null)
const realtorForm = ref({
  name: '',
  phone: '',
  email: '',
  creci: '',
  code: ''
})
const realtorPhotoInitial = computed(() => {
  const name = realtorForm.value.name?.trim() || authStore.user?.name || ''
  return name ? name.charAt(0).toUpperCase() : '?'
})

// 2FA state
const twoFactorEnabled = ref(false)
const twoFactorLoading = ref(false)

// Empresa (loteadora) profile state
const empresaLoading = ref(false)
const empresaError = ref('')
const empresaForm = ref({
  creci: '',
  phone: '',
  publicEmail: '',
  website: '',
})

onMounted(async () => {
  if (authStore.user?.role === 'CORRETOR') {
    fetchRealtorData()
  }
  if (authStore.isLoteadora) {
    fetchEmpresaData()
  }
  fetch2FAStatus()
})

// Watcher for phone masking
watch(() => realtorForm.value.phone, (newVal) => {
  if (newVal) {
    const masked = maskPhone(newVal)
    if (masked !== newVal) {
      realtorForm.value.phone = masked
    }
  }
})

async function fetchRealtorData() {
  try {
    const data = await fetchApi('/realtor-links/me')
    realtorPhotoUrl.value = data.photoUrl || data.profileImageUrl || data.avatarUrl || ''
    realtorForm.value = {
      name: data.name || '',
      phone: maskPhone(data.phone || ''),
      email: data.email || '',
      creci: data.creci || '',
      code: data.code || ''
    }
  } catch (err) {
    console.error('Falha ao carregar dados do corretor', err)
  }
}

function openRealtorPhotoPicker() {
  realtorPhotoInput.value?.click()
}

async function handleRealtorPhotoSelected(event) {
  const target = event.target
  const file = target?.files?.[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  photoUploading.value = true
  realtorError.value = ''
  try {
    const data = await uploadApi('/realtor-links/me/photo', formData)
    realtorPhotoUrl.value = data.photoUrl || data.profileImageUrl || data.avatarUrl || ''
    toast.success('Foto atualizada com sucesso!')
  } catch (err) {
    realtorError.value = err?.data?.message || err?.message || 'Erro ao enviar a foto.'
  } finally {
    photoUploading.value = false
    if (target) target.value = ''
  }
}

async function removeRealtorPhoto() {
  photoRemoving.value = true
  realtorError.value = ''
  try {
    await fetchApi('/realtor-links/me/photo', { method: 'DELETE' })
    realtorPhotoUrl.value = ''
    toast.success('Foto removida com sucesso!')
  } catch (err) {
    realtorError.value = err?.data?.message || err?.message || 'Erro ao remover a foto.'
  } finally {
    photoRemoving.value = false
  }
}

async function handleUpdateRealtor() {
  realtorLoading.value = true
  realtorError.value = ''
  try {
    const body = {
      ...realtorForm.value,
      phone: unmask(realtorForm.value.phone)
    }

    await fetchApi('/realtor-links/me', {
      method: 'PATCH',
      body
    })

    // Update name in auth store if changed
    if (authStore.user) {
      authStore.user.name = body.name
    }

    toast.success('Perfil atualizado com sucesso!')
  } catch (err) {
    realtorError.value = err.data?.message || 'Erro ao atualizar perfil.'
  } finally {
    realtorLoading.value = false
  }
}

async function handleChangePassword() {
  if (passwordPolicyError.value) {
    error.value = passwordPolicyError.value
    return
  }
  if (passForm.value.newPassword !== passForm.value.confirmPassword) {
    error.value = 'As senhas não coincidem'
    return
  }

  loading.value = true
  error.value = ''
  try {
    await fetchApi('/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: passForm.value.currentPassword,
        newPassword: passForm.value.newPassword
      }
    })
    toast.success('Senha alterada com sucesso!')
    passForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err) {
    error.value = err.data?.message || 'Erro ao alterar senha. Verifique sua senha atual.'
  } finally {
    loading.value = false
  }
}

async function fetch2FAStatus() {
  try {
    const data = await fetchApi('/auth/me')
    twoFactorEnabled.value = !!data.twoFactorEnabled
  } catch (err) {
    console.error('Falha ao buscar status 2FA', err)
  }
}

async function handleToggle2FA() {
  const newValue = !twoFactorEnabled.value
  twoFactorLoading.value = true
  try {
    await fetchApi('/auth/toggle-2fa', {
      method: 'POST',
      body: { enabled: newValue }
    })
    twoFactorEnabled.value = newValue
    toast.success(newValue ? '2FA ativado com sucesso!' : '2FA desativado.')
  } catch (err) {
    toast.error('Erro ao alterar configuração de 2FA.')
  } finally {
    twoFactorLoading.value = false
  }
}

async function fetchEmpresaData() {
  try {
    const data = await fetchApi('/tenants/me')
    empresaForm.value = {
      creci: data.creci || '',
      phone: data.phone ? maskPhone(data.phone) : '',
      publicEmail: data.publicEmail || '',
      website: data.website || '',
    }
  } catch (err) {
    console.error('Falha ao carregar dados da empresa', err)
  }
}

async function handleUpdateEmpresa() {
  empresaLoading.value = true
  empresaError.value = ''
  try {
    const body = {
      creci: empresaForm.value.creci?.trim() || null,
      phone: empresaForm.value.phone ? unmask(empresaForm.value.phone) : null,
      publicEmail: empresaForm.value.publicEmail?.trim() || null,
      website: empresaForm.value.website?.trim() || null,
    }
    await fetchApi('/tenants/me/profile', { method: 'PATCH', body })
    toast.success('Dados da empresa atualizados com sucesso!')
  } catch (err) {
    empresaError.value = err?.data?.message || err?.message || 'Erro ao salvar dados da empresa.'
  } finally {
    empresaLoading.value = false
  }
}
</script>
