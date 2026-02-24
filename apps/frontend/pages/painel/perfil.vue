<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Meu Perfil</h1>
        <p>Gerencie suas informações e senha</p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-8">
      <div class="card">
        <h2 style="margin-bottom: var(--space-4);">Dados Pessoais</h2>
        <div class="form-group">
          <label class="form-label">Nome</label>
          <input :value="authStore.user?.name" class="form-input" disabled />
        </div>
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input :value="authStore.user?.email" class="form-input" disabled />
        </div>
        <div class="form-group">
          <label class="form-label">Perfil / Role</label>
          <input :value="authStore.user?.role" class="form-input" disabled />
        </div>
      </div>

      <div class="card">
        <h2 style="margin-bottom: var(--space-4);">Alterar Senha</h2>
        <form @submit.prevent="handleChangePassword">
          <div class="form-group">
            <label class="form-label">Senha Atual</label>
            <input v-model="passForm.currentPassword" type="password" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">Nova Senha</label>
            <input v-model="passForm.newPassword" type="password" class="form-input" required minlength="6" />
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar Nova Senha</label>
            <input v-model="passForm.confirmPassword" type="password" class="form-input" required minlength="6" />
            <div v-if="passForm.confirmPassword && passForm.confirmPassword !== passForm.newPassword" class="form-error">
              As senhas não coincidem
            </div>
          </div>
          
          <div v-if="error" class="alert alert-error">{{ error }}</div>
          
          <button type="submit" class="btn btn-primary" :disabled="loading || (passForm.newPassword !== passForm.confirmPassword)">
            {{ loading ? 'Alterando...' : 'Atualizar Senha' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const { fetchApi } = useApi()
const toast = useToast()

const loading = ref(false)
const error = ref('')
const passForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

async function handleChangePassword() {
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
</script>
