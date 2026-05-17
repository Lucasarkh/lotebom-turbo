<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[10000] p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto animate-[termsSlideUp_0.3s_ease-out] max-sm:max-h-[95vh]">
        <div class="text-center px-8 pt-8 pb-6 border-b border-slate-100 max-sm:px-5">
          <img src="/img/logo.svg" alt="Lotio" class="h-9 mb-4" />
          <h2 class="text-xl font-bold text-slate-900 m-0 mb-2">Termos de Uso e Política de Privacidade</h2>
          <p class="text-sm text-slate-500 m-0 leading-relaxed">
            Para continuar utilizando a plataforma, é necessário aceitar os nossos termos.
          </p>
        </div>

        <div class="px-8 py-6 max-sm:px-5">
          <div class="flex flex-col gap-4 mb-6">
            <div class="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div class="shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-lg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <div>
                <h3 class="text-[0.9375rem] font-semibold text-slate-800 m-0 mb-1">Termos de Uso</h3>
                <p class="text-[0.8125rem] text-slate-500 m-0 mb-2 leading-snug">Condições gerais de uso da plataforma, responsabilidades, integrações e SLA.</p>
                <a href="/termos-de-uso" target="_blank" class="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-blue-600 no-underline transition-opacity duration-200 hover:opacity-80 hover:underline">
                  Ler Termos de Uso
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>
            </div>

            <div class="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div class="shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-lg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-[0.9375rem] font-semibold text-slate-800 m-0 mb-1">Política de Privacidade</h3>
                <p class="text-[0.8125rem] text-slate-500 m-0 mb-2 leading-snug">Como coletamos, utilizamos e protegemos seus dados pessoais conforme a LGPD.</p>
                <a href="/politica-de-privacidade" target="_blank" class="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-blue-600 no-underline transition-opacity duration-200 hover:opacity-80 hover:underline">
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

          <div class="mb-4">
            <label class="flex items-start gap-3 cursor-pointer relative p-4 bg-slate-50 rounded-xl border-2 border-slate-200 transition-colors duration-200 has-[input:checked]:border-blue-600 has-[input:checked]:bg-blue-600/[0.04]">
              <input v-model="accepted" type="checkbox" class="absolute opacity-0 w-0 h-0 peer" />
              <span class="shrink-0 w-5 h-5 border-2 border-slate-300 rounded flex items-center justify-center transition-all duration-200 mt-[1px] peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-checked:after:content-[''] peer-checked:after:block peer-checked:after:w-[5px] peer-checked:after:h-[9px] peer-checked:after:border-white peer-checked:after:border-solid peer-checked:after:border-[0_2px_2px_0] peer-checked:after:rotate-45 peer-checked:after:-mt-[1px]"></span>
              <span class="text-sm text-slate-700 leading-relaxed">
                Li e aceito os
                <a href="/termos-de-uso" target="_blank" class="text-blue-600 font-semibold no-underline hover:underline">Termos de Uso</a>
                e a
                <a href="/politica-de-privacidade" target="_blank" class="text-blue-600 font-semibold no-underline hover:underline">Política de Privacidade</a>
                da plataforma Lotio.
              </span>
            </label>
          </div>

          <div v-if="error" class="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200">{{ error }}</div>
        </div>

        <div class="px-8 pb-8 pt-6 flex flex-col gap-3 items-center max-sm:px-5">
          <button
            class="w-full py-3.5 px-6 text-base font-semibold rounded-xl bg-blue-600 text-white border-none cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            :disabled="!accepted || loading"
            @click="handleAccept"
          >
            {{ loading ? 'Registrando aceite...' : 'Aceitar e Continuar' }}
          </button>
          <button class="bg-transparent border-none text-slate-400 text-[0.8125rem] cursor-pointer p-2 transition-colors duration-200 hover:text-slate-600" @click="handleDecline">
            Não aceito — Sair da plataforma
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['accepted', 'declined'])

const accepted = ref(false)
const loading = ref(false)
const error = ref('')
const config = useRuntimeConfig()
const apiBase = (config.public.apiBase || '').replace(/\/+$/, '')
const authStore = useAuthStore()

const handleAccept = async () => {
  if (!accepted.value) return

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

    const data = await res.json()
    authStore.setTermsAccepted()
    emit('accepted', data)
  } catch (e) {
    error.value = e.message || 'Erro ao registrar aceite. Tente novamente.'
  } finally {
    loading.value = false
  }
}

const handleDecline = () => {
  emit('declined')
}
</script>
