<template>
  <div class="auth-page">
    <div class="auth-card">
      <NuxtLink to="/login" class="back-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Voltar para Login
      </NuxtLink>
      <div class="auth-brand">
        <img src="/img/logo.svg" alt="Lotio" class="login-logo" />
        <p class="auth-subtitle">Recuperar senha</p>
      </div>

      <div v-if="sent" class="alert alert-success">
        Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Verifique sua caixa de entrada e spam.
      </div>

      <form v-else @submit.prevent="handleSubmit">
        <p class="form-description">
          Digite o e-mail da sua conta e enviaremos um link para redefinir sua senha.
        </p>
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input v-model="email" type="email" class="form-input" placeholder="seu@email.com" required />
        </div>
        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%" :disabled="loading">
          {{ loading ? 'Enviando...' : 'Enviar link de recuperação' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)
const config = useRuntimeConfig()

definePageMeta({
  layout: 'public'
})

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${config.public.apiBase}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.message || 'Erro ao processar solicitação')
    }
    sent.value = true
  } catch (e) {
    // Always show success to prevent email enumeration
    sent.value = true
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
.login-logo {
  height: 48px;
  margin-bottom: var(--space-4);
}
.auth-subtitle { font-size: 0.875rem; color: var(--gray-500); }
.back-home {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--gray-500);
  text-decoration: none;
  font-size: 0.875rem;
  margin-bottom: var(--space-6);
  transition: color 0.2s;
}
.back-home:hover {
  color: var(--primary);
}
.form-description {
  font-size: 0.875rem;
  color: var(--gray-500);
  margin-bottom: var(--space-5);
  line-height: 1.5;
}
</style>
