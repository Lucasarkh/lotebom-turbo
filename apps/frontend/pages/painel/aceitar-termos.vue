<template>
  <div class="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-cover bg-center bg-fixed" style="background: linear-gradient(rgba(10, 15, 13, 0.92), rgba(10, 15, 13, 0.92)), url('/img/banner-hero.jpg') center / cover fixed;">
    <div class="w-full max-w-[560px] rounded-2xl border border-p-accent/15 bg-[rgba(20,28,24,0.95)] shadow-2xl backdrop-blur-[20px] overflow-hidden">
      <!-- Header -->
      <div class="text-center px-5 sm:px-8 pt-8 pb-6 border-b border-p-accent/10">
        <img src="/img/logo-white.svg" alt="Lotio" class="h-9 mb-4 mx-auto" />
        <h2 class="text-xl font-bold text-p-text mb-2">Termos de Uso e Política de Privacidade</h2>
        <p class="text-sm text-p-text-muted leading-relaxed">
          Para continuar utilizando a plataforma, é necessário aceitar os nossos termos.
        </p>
      </div>

      <!-- Body -->
      <div class="px-5 sm:px-8 py-6">
        <div class="flex flex-col gap-4 mb-6">
          <!-- Termos de Uso -->
          <div class="flex gap-4 p-4 bg-white/[0.04] rounded-xl border border-p-accent/10">
            <div class="shrink-0 w-10 h-10 flex items-center justify-center bg-emerald-500/15 text-p-accent rounded-[10px]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div>
              <h3 class="text-[15px] font-semibold text-p-text mb-1">Termos de Uso</h3>
              <p class="text-[13px] text-p-text-muted leading-snug mb-2">Condições gerais de uso da plataforma, responsabilidades, integrações e SLA.</p>
              <a href="/termos-de-uso" target="_blank" class="inline-flex items-center gap-1 text-[13px] font-semibold text-p-accent no-underline hover:opacity-80 transition-opacity hover:underline">
                Ler Termos de Uso
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>

          <!-- Política de Privacidade -->
          <div class="flex gap-4 p-4 bg-white/[0.04] rounded-xl border border-p-accent/10">
            <div class="shrink-0 w-10 h-10 flex items-center justify-center bg-emerald-500/15 text-p-accent rounded-[10px]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-[15px] font-semibold text-p-text mb-1">Política de Privacidade</h3>
              <p class="text-[13px] text-p-text-muted leading-snug mb-2">Como coletamos, utilizamos e protegemos seus dados pessoais conforme a LGPD.</p>
              <a href="/politica-de-privacidade" target="_blank" class="inline-flex items-center gap-1 text-[13px] font-semibold text-p-accent no-underline hover:opacity-80 transition-opacity hover:underline">
                Ler Política de Privacidade
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <!-- Checkbox -->
        <div class="mb-4">
          <label class="flex items-start gap-3 cursor-pointer p-4 bg-white/[0.03] rounded-xl border-2 border-p-accent/10 transition-colors" :class="accepted ? 'border-emerald-500 bg-emerald-500/[0.06]' : ''">
            <input v-model="accepted" type="checkbox" class="sr-only" />
            <span class="shrink-0 mt-px w-5 h-5 rounded border-2 border-p-accent/30 flex items-center justify-center transition-all" :class="accepted ? 'bg-emerald-500 border-emerald-500' : ''">
              <svg v-if="accepted" class="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="2 6 5 9 10 3" /></svg>
            </span>
            <span class="text-sm text-p-text-muted leading-relaxed">
              Li e aceito os
              <a href="/termos-de-uso" target="_blank" class="text-p-accent font-semibold no-underline hover:underline">Termos de Uso</a>
              e a
              <a href="/politica-de-privacidade" target="_blank" class="text-p-accent font-semibold no-underline hover:underline">Política de Privacidade</a>
              da plataforma Lotio.
            </span>
          </label>
        </div>

        <UiAlert v-if="error" variant="error">{{ error }}</UiAlert>
      </div>

      <!-- Footer -->
      <div class="flex flex-col items-center gap-3 px-5 sm:px-8 pb-8 pt-6 border-t border-p-accent/[0.08]">
        <button
          class="w-full py-3.5 px-6 text-base font-semibold rounded-xl bg-p-accent text-white border-none cursor-pointer transition-all hover:bg-p-accent-hover hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
          :disabled="!accepted || loading"
          @click="handleAccept"
        >
          {{ loading ? 'Registrando aceite...' : 'Aceitar e Continuar' }}
        </button>
        <button class="bg-transparent border-none text-p-text-muted text-[13px] cursor-pointer p-2 transition-colors hover:text-p-text-secondary" @click="handleDecline">
          Não aceito — Sair da plataforma
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const accepted = ref(false)
const loading = ref(false)
const error = ref('')
const config = useRuntimeConfig()
const apiBase = (config.public.apiBase || '').replace(/\/+$/, '')
const authStore = useAuthStore()
const router = useRouter()
const { success: toastSuccess } = useToast()

const handleAccept = async () => {
  if (!accepted.value || loading.value) return

  loading.value = true
  error.value = ''

  try {
    const res = await fetch(`${apiBase}/api/auth/accept-terms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Erro ao registrar aceite dos termos')
    }

    authStore.setTermsAccepted()
    toastSuccess('Termos aceitos com sucesso!')
    router.push(authStore.getDashboardRoute())
  } catch (e) {
    error.value = e.message || 'Erro ao registrar aceite. Tente novamente.'
  } finally {
    loading.value = false
  }
}

const handleDecline = async () => {
  const { fetchApi } = useApi()
  try { await fetchApi('/auth/logout', { method: 'POST' }) } catch {}
  authStore.logout()
  router.push('/login')
}
</script>
