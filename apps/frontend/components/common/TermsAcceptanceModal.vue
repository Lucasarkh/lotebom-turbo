<template>
  <Teleport to="body">
    <div v-if="visible" class="terms-overlay">
      <div class="terms-modal">
        <div class="terms-modal-header">
          <img src="/img/logo.svg" alt="Lotio" class="terms-logo" />
          <h2>Termos de Uso e Política de Privacidade</h2>
          <p class="terms-subtitle">
            Para continuar utilizando a plataforma, é necessário aceitar os nossos termos.
          </p>
        </div>

        <div class="terms-modal-body">
          <div class="terms-documents">
            <div class="terms-doc-card">
              <div class="terms-doc-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <div class="terms-doc-info">
                <h3>Termos de Uso</h3>
                <p>Condições gerais de uso da plataforma, responsabilidades, integrações e SLA.</p>
                <a href="/termos-de-uso" target="_blank" class="terms-doc-link">
                  Ler Termos de Uso
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>
            </div>

            <div class="terms-doc-card">
              <div class="terms-doc-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <div class="terms-doc-info">
                <h3>Política de Privacidade</h3>
                <p>Como coletamos, utilizamos e protegemos seus dados pessoais conforme a LGPD.</p>
                <a href="/politica-de-privacidade" target="_blank" class="terms-doc-link">
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

          <div class="terms-checkbox-group">
            <label class="terms-checkbox">
              <input v-model="accepted" type="checkbox" />
              <span class="terms-checkbox-mark"></span>
              <span class="terms-checkbox-text">
                Li e aceito os
                <a href="/termos-de-uso" target="_blank">Termos de Uso</a>
                e a
                <a href="/politica-de-privacidade" target="_blank">Política de Privacidade</a>
                da plataforma Lotio.
              </span>
            </label>
          </div>

          <div v-if="error" class="terms-error">{{ error }}</div>
        </div>

        <div class="terms-modal-footer">
          <button
            class="btn btn-primary btn-lg terms-accept-btn"
            :disabled="!accepted || loading"
            @click="handleAccept"
          >
            {{ loading ? 'Registrando aceite...' : 'Aceitar e Continuar' }}
          </button>
          <button class="btn-text terms-decline-btn" @click="handleDecline">
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

<style scoped>
.terms-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  padding: 1rem;
}

.terms-modal {
  background: white;
  border-radius: var(--radius-xl, 16px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  animation: termsSlideUp 0.3s ease-out;
}

@keyframes termsSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.terms-modal-header {
  text-align: center;
  padding: 2rem 2rem 1.5rem;
  border-bottom: 1px solid var(--gray-100, #f1f5f9);
}

.terms-logo {
  height: 36px;
  margin-bottom: 1rem;
}

.terms-modal-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gray-900, #0f172a);
  margin: 0 0 0.5rem;
}

.terms-subtitle {
  font-size: 0.875rem;
  color: var(--gray-500, #64748b);
  margin: 0;
  line-height: 1.5;
}

.terms-modal-body {
  padding: 1.5rem 2rem;
}

.terms-documents {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.terms-doc-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--gray-50, #f8fafc);
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--gray-200, #e2e8f0);
}

.terms-doc-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary, #2563eb);
  color: white;
  border-radius: var(--radius-md, 8px);
}

.terms-doc-info h3 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--gray-800, #1e293b);
  margin: 0 0 0.25rem;
}

.terms-doc-info p {
  font-size: 0.8125rem;
  color: var(--gray-500, #64748b);
  margin: 0 0 0.5rem;
  line-height: 1.4;
}

.terms-doc-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--primary, #2563eb);
  text-decoration: none;
  transition: opacity 0.2s;
}

.terms-doc-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.terms-checkbox-group {
  margin-bottom: 1rem;
}

.terms-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  position: relative;
  padding: 1rem;
  background: var(--gray-50, #f8fafc);
  border-radius: var(--radius-lg, 12px);
  border: 2px solid var(--gray-200, #e2e8f0);
  transition: border-color 0.2s;
}

.terms-checkbox:has(input:checked) {
  border-color: var(--primary, #2563eb);
  background: rgba(37, 99, 235, 0.04);
}

.terms-checkbox input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.terms-checkbox-mark {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: 2px solid var(--gray-300, #cbd5e1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-top: 1px;
}

.terms-checkbox input:checked + .terms-checkbox-mark {
  background: var(--primary, #2563eb);
  border-color: var(--primary, #2563eb);
}

.terms-checkbox input:checked + .terms-checkbox-mark::after {
  content: '';
  display: block;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-top: -1px;
}

.terms-checkbox-text {
  font-size: 0.875rem;
  color: var(--gray-700, #334155);
  line-height: 1.5;
}

.terms-checkbox-text a {
  color: var(--primary, #2563eb);
  font-weight: 600;
  text-decoration: none;
}

.terms-checkbox-text a:hover {
  text-decoration: underline;
}

.terms-error {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md, 8px);
  font-size: 0.875rem;
  border: 1px solid #fecaca;
}

.terms-modal-footer {
  padding: 1.5rem 2rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

.terms-accept-btn {
  width: 100%;
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: var(--radius-lg, 12px);
  background: var(--primary, #2563eb);
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.terms-accept-btn:hover:not(:disabled) {
  background: var(--primary-dark, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.terms-accept-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.terms-decline-btn {
  background: none;
  border: none;
  color: var(--gray-400, #94a3b8);
  font-size: 0.8125rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s;
}

.terms-decline-btn:hover {
  color: var(--gray-600, #475569);
}

@media (max-width: 480px) {
  .terms-modal {
    max-height: 95vh;
  }
  .terms-modal-header,
  .terms-modal-body,
  .terms-modal-footer {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
}
</style>
