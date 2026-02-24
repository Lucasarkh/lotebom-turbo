<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <div class="brand-icon">L</div>
        <h1>Lotio</h1>
        <p class="auth-subtitle">Cadastre sua loteadora</p>
      </div>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label class="form-label">Nome da empresa</label>
          <input v-model="form.tenantName" class="form-input" placeholder="Loteadora XYZ" required />
        </div>
        <div class="form-group">
          <label class="form-label">Identificador da empresa</label>
          <input v-model="form.tenantSlug" class="form-input" :class="{ 'input-error': slugTaken }" placeholder="loteadora-xyz" required @input="onSlugInput" />
          <small v-if="slugTaken" style="color:var(--error-color); font-size:0.75rem">Este identificador já está em uso!</small>
          <small v-else style="color:var(--gray-500);font-size:0.75rem">Identificador único da sua empresa na plataforma.</small>
        </div>
        <div class="form-group">
          <label class="form-label">Seu nome</label>
          <input v-model="form.name" class="form-input" placeholder="João Silva" required />
        </div>
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input v-model="form.email" type="email" class="form-input" placeholder="joao@loteadora.com" required />
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <input v-model="form.password" type="password" class="form-input" placeholder="Mín. 6 caracteres" required minlength="6" />
        </div>
        <div class="form-group">
          <label class="form-label">Confirmar Senha</label>
          <input v-model="confirmPassword" type="password" class="form-input" placeholder="Repita a senha" required minlength="6" />
          <div v-if="confirmPassword && confirmPassword !== form.password" class="form-error">As senhas não coincidem</div>
        </div>
        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%" :disabled="loading">
          {{ loading ? 'Cadastrando...' : 'Cadastrar' }}
        </button>
        <p class="auth-footer-link">
          Já tem conta? <NuxtLink to="/login">Faça login</NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const form = ref({
  tenantName: '',
  tenantSlug: '',
  name: '',
  email: '',
  password: '',
})
const confirmPassword = ref('')
const slugManuallyEdited = ref(false)
const slugTaken = ref(false)
const checkingSlug = ref(false)
const loading = ref(false)
const error = ref('')

const router = useRouter()
const config = useRuntimeConfig()
const { success: toastSuccess, fromError: toastFromError } = useToast()

let slugTimeout = null
watch(() => form.value.tenantSlug, (v) => {
  if (!v) {
    slugTaken.value = false
    return
  }
  clearTimeout(slugTimeout)
  slugTimeout = setTimeout(async () => {
    checkingSlug.value = true
    try {
      const res = await fetch(`${config.public.apiBase}/api/auth/check-tenant-slug/${v}`)
      if (res.ok) {
        const { available } = await res.json()
        slugTaken.value = !available
      }
    } catch { slugTaken.value = false }
    finally { checkingSlug.value = false }
  }, 500)
})

// Auto-generate slug from name, unless user edited it manually
watch(() => form.value.tenantName, (v) => {
  if (!slugManuallyEdited.value) {
    form.value.tenantSlug = v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
})

const onSlugInput = () => { slugManuallyEdited.value = true }

const handleRegister = async () => {
  if (slugTaken.value) {
    error.value = 'Este identificador já está em uso'
    return
  }
  if (form.value.password !== confirmPassword.value) {
    error.value = 'As senhas não coincidem'
    return
  }
  if (form.value.password.length < 6) {
    error.value = 'A senha deve ter no mínimo 6 caracteres'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${config.public.apiBase}/api/auth/register-tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.message || 'Erro no cadastro')
    }
    toastSuccess('Conta criada com sucesso!')
    router.push('/login?registered=1')
  } catch (e) {
    error.value = e.message
    toastFromError(e, 'Erro no cadastro')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: var(--gray-50); padding: var(--space-6); }
.auth-card { background: white; padding: var(--space-10); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); width: 100%; max-width: 460px; border: 1px solid var(--gray-200); }
.auth-brand { text-align: center; margin-bottom: var(--space-8); }
.auth-brand .brand-icon { width: 52px; height: 52px; background: var(--primary); color: white; border-radius: var(--radius-lg); display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.5rem; margin-bottom: var(--space-4); }
.auth-brand h1 { font-size: 1.5rem; margin-bottom: var(--space-1); }
.auth-subtitle { font-size: 0.875rem; color: var(--gray-500); }
.auth-footer-link { text-align: center; margin-top: var(--space-5); font-size: 0.8125rem; color: var(--gray-500); }
.auth-footer-link a { color: var(--primary); font-weight: 600; }
</style>
