<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <div class="brand-icon">L</div>
        <h1>Lotio</h1>
        <p class="auth-subtitle">Entre na sua conta</p>
      </div>

      <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input v-model="email" type="email" class="form-input" placeholder="seu@email.com" required />
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <input v-model="password" type="password" class="form-input" placeholder="********" required />
        </div>
        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%" :disabled="loading">
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </button>
        <p class="auth-footer-link">
          Quer cadastrar sua loteadora? <NuxtLink to="/cadastro">Cadastre-se aqui</NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const successMessage = ref('')
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const config = useRuntimeConfig()
const { success: toastSuccess, fromError: toastFromError } = useToast()

onMounted(() => {
  if (route.query.registered) successMessage.value = 'Conta criada com sucesso! Faça seu login.'
})

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${config.public.apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.message || 'Falha no login')
    }
    const data = await res.json()
    authStore.setAuth(data)
    toastSuccess('Bem-vindo!')
    router.push('/painel')
  } catch (e) {
    error.value = e.message === 'Unauthorized' ? 'E-mail ou senha incorretos' : e.message
    toastFromError(e, 'Falha no login')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display: flex; justify-content: center; align-items: center;
  min-height: 100vh; background: var(--gray-50); padding: var(--space-6);
}
.auth-card {
  background: white; padding: var(--space-10); border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg); width: 100%; max-width: 420px; border: 1px solid var(--gray-200);
}
.auth-brand { text-align: center; margin-bottom: var(--space-8); }
.auth-brand .brand-icon {
  width: 52px; height: 52px; background: var(--primary); color: white;
  border-radius: var(--radius-lg); display: inline-flex; align-items: center;
  justify-content: center; font-weight: 800; font-size: 1.5rem; margin-bottom: var(--space-4);
}
.auth-brand h1 { font-size: 1.5rem; margin-bottom: var(--space-1); }
.auth-subtitle { font-size: 0.875rem; color: var(--gray-500); }
.auth-footer-link { text-align: center; margin-top: var(--space-5); font-size: 0.8125rem; color: var(--gray-500); }
.auth-footer-link a { color: var(--primary); font-weight: 600; }
</style>
