<script setup lang="ts">
import { ref, onMounted } from 'vue'
const { get, post } = usePublicApi()
const route = useRoute()
const router = useRouter()
const { success: toastSuccess, error: toastError } = useToast()

const token = route.query.token as string
const loading = ref(false)
const validationLoading = ref(true)
const errorMsg = ref('')

const form = ref({
  email: '',
  name: '',
  password: '',
  confirmPassword: ''
})

async function fetchInvite() {
  if (!token) return
  
  try {
    const data = await get(`/agencies/invite/${token}`)
    form.value.email = data.email
  } catch (err: any) {
    errorMsg.value = err.data?.message || 'Este convite não é mais válido.'
    toastError(errorMsg.value)
  } finally {
    validationLoading.value = false
  }
}

async function acceptInvite() {
  if (!form.value.name || !form.value.password) {
    errorMsg.value = 'Preencha todos os campos corretamente.'
    return
  }

  const password = form.value.password
  
  // Regras separadas para melhor feedback e clareza
  const hasMinLength = password.length >= 8
  const hasLetters = /[a-zA-Z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)

  if (!hasMinLength || !hasLetters || !hasNumbers) {
    errorMsg.value = 'A senha deve ter pelo menos 8 caracteres, contendo letras e números.'
    return
  }
  
  if (form.value.password !== form.value.confirmPassword) {
    errorMsg.value = 'As senhas não coincidem.'
    return
  }

  loading.value = true
  errorMsg.value = ''
  
  try {
    await post('/agencies/invite/accept', {
      token,
      name: form.value.name,
      password: form.value.password
    })
    
    toastSuccess('Conta criada com sucesso! Redirecionando...')
    setTimeout(() => router.push('/login?registered=1'), 2000)
  } catch (err: any) {
    errorMsg.value = err.message || 'Erro ao aceitar convite. Verifique se o link ainda é válido.'
    toastError(errorMsg.value)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!token) {
    toastError('Token de convite não fornecido.')
    router.push('/login')
    return
  }
  fetchInvite()
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <img src="/img/logo.svg" alt="Lotio" class="login-logo" />
        <h1 class="auth-title">Finalizar Cadastro</h1>
        <p class="auth-subtitle">
          Complete seus dados para ativar sua conta na plataforma.
        </p>
      </div>

      <form v-if="!validationLoading" @submit.prevent="acceptInvite" class="auth-form">
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input 
            v-model="form.email" 
            type="email" 
            class="form-input" 
            disabled
            placeholder="Seu e-mail"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Nome Completo</label>
          <input 
            v-model="form.name" 
            type="text" 
            class="form-input" 
            required 
            placeholder="Seu nome completo"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Sua Senha</label>
          <input 
            v-model="form.password" 
            type="password" 
            class="form-input" 
            required 
            placeholder="••••••••"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Confirmar Senha</label>
          <input 
            v-model="form.confirmPassword" 
            type="password" 
            class="form-input" 
            required 
            placeholder="••••••••"
          />
        </div>

        <div v-if="errorMsg" class="alert alert-error">
          {{ errorMsg }}
        </div>

        <button 
          type="submit" 
          class="btn btn-primary btn-lg" 
          style="width: 100%"
          :disabled="loading"
        >
          {{ loading ? 'Processando...' : 'Criar minha conta e acessar' }}
        </button>

        <p class="auth-footer-link">
          Ao clicar em aceitar, você concorda com nossos Termos de Uso.
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex; 
  justify-content: center; 
  align-items: center;
  min-height: 100vh; 
  background: var(--gray-50); 
  padding: var(--space-6);
}

.auth-card {
  background: white; 
  padding: var(--space-10); 
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg); 
  width: 100%; 
  max-width: 440px; 
  border: 1px solid var(--gray-200);
}

.auth-brand { 
  text-align: center; 
  margin-bottom: var(--space-8); 
}

.login-logo {
  height: 48px;
  margin-bottom: var(--space-4);
}

.auth-title { 
  font-size: 1.5rem; 
  font-weight: 800;
  color: var(--gray-900);
  margin-bottom: var(--space-1); 
}

.auth-subtitle { 
  font-size: 0.875rem; 
  color: var(--gray-500); 
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-footer-link {
  margin-top: var(--space-6);
  text-align: center;
  font-size: 0.75rem;
  color: var(--gray-400);
}

.alert {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  margin-bottom: var(--space-2);
}

.alert-error {
  background: var(--danger-light);
  color: var(--danger);
  border: 1px solid rgba(255, 59, 48, 0.1);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--gray-700);
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--gray-200);
  font-size: 1rem;
  transition: all var(--transition);
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-50);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all var(--transition);
  border: none;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-lg {
  height: 52px;
}
</style>
