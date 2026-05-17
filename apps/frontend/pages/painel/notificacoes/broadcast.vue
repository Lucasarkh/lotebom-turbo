<template>
  <div class="flex flex-col gap-6 max-w-[720px]">
    <!-- Back link + Header -->
    <div>
      <NuxtLink to="/painel/notificacoes" class="inline-flex items-center gap-1.5 text-sm text-p-text-muted hover:text-p-text transition-colors mb-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Voltar
      </NuxtLink>
      <UiPageHeader title="Enviar Notificação" description="Envie alertas, comunicados e avisos para os usuários da plataforma." />
    </div>

    <UiCard padding="lg">
      <div class="flex flex-col gap-5">
        <span class="text-xs font-bold uppercase tracking-wider text-p-text-muted">Audiência</span>

        <!-- Audience -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-p-text-secondary">Destinatários</label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="opt in audienceOptions"
              :key="opt.value"
              type="button"
              class="rounded-lg border px-3.5 py-2 text-sm font-medium transition-all"
              :class="audienceType === opt.value
                ? 'bg-p-accent/10 text-p-accent border-p-accent/25'
                : 'bg-p-raised border-p-border text-p-text-muted hover:bg-p-overlay hover:text-p-text-secondary'"
              @click="audienceType = opt.value; form.tenantId = undefined; form.role = undefined"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div v-if="audienceType === 'role'">
          <UiSelect v-model="form.role" label="Perfil" placeholder="Selecionar perfil...">
            <option value="LOTEADORA">Loteadoras</option>
            <option value="IMOBILIARIA">Imobiliárias</option>
            <option value="CORRETOR">Corretores</option>
          </UiSelect>
        </div>

        <div v-if="audienceType === 'tenant'" class="flex flex-col gap-1.5">
          <UiInput v-model="form.tenantId" label="ID do Tenant (loteadora)" placeholder="ID da loteadora..." />
          <span class="text-xs text-p-text-muted">O ID da loteadora pode ser consultado em /painel/tenants</span>
        </div>

        <hr class="border-p-border" />

        <span class="text-xs font-bold uppercase tracking-wider text-p-text-muted">Mensagem</span>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-p-text-secondary">Título <span class="text-p-danger">*</span></label>
          <input
            v-model="form.title"
            class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent"
            placeholder="Ex.: Manutenção programada — 10/03"
            maxlength="120"
          />
          <span class="text-xs text-p-text-muted text-right">{{ form.title.length }}/120</span>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-p-text-secondary">Mensagem <span class="text-p-danger">*</span></label>
          <textarea
            v-model="form.message"
            class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent resize-y"
            rows="4"
            placeholder="Descreva o comunicado em detalhes..."
            maxlength="600"
          ></textarea>
          <span class="text-xs text-p-text-muted text-right">{{ form.message.length }}/600</span>
        </div>

        <div class="flex flex-col gap-1.5">
          <UiInput v-model="form.actionUrl" label="Link de ação (opcional)" placeholder="Ex.: /painel/suporte" />
          <span class="text-xs text-p-text-muted">Caminho interno para redirecionar o usuário ao clicar na notificação.</span>
        </div>

        <hr class="border-p-border" />

        <span class="text-xs font-bold uppercase tracking-wider text-p-text-muted">Canal de envio</span>

        <div class="flex gap-2.5 flex-wrap">
          <!-- Panel channel (always active) -->
          <div class="flex flex-1 min-w-[180px] items-center gap-3 rounded-lg border p-3.5 border-p-accent/25 bg-p-accent/5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="text-p-text-muted shrink-0">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <div class="flex-1">
              <div class="text-sm font-semibold text-p-text">Painel</div>
              <div class="text-xs text-p-text-muted">Sempre enviado</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" class="text-p-accent shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <!-- Email channel (toggleable) -->
          <div
            class="flex flex-1 min-w-[180px] items-center gap-3 rounded-lg border p-3.5 cursor-pointer transition-all"
            :class="form.sendEmail ? 'border-p-accent/25 bg-p-accent/5' : 'border-p-border bg-p-raised/50'"
            @click="form.sendEmail = !form.sendEmail"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="text-p-text-muted shrink-0">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <div class="flex-1">
              <div class="text-sm font-semibold text-p-text">E-mail</div>
              <div class="text-xs text-p-text-muted">{{ form.sendEmail ? 'Será enviado também por email' : 'Clique para ativar' }}</div>
            </div>
            <svg v-if="form.sendEmail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" class="text-p-accent shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>

        <!-- Preview -->
        <hr class="border-p-border" />
        <span class="text-xs font-bold uppercase tracking-wider text-p-text-muted">Pré-visualização</span>

        <div class="flex items-start gap-3 rounded-lg border border-p-accent/15 bg-p-accent/5 p-3.5 relative">
          <div class="flex h-9 w-9 items-center justify-center rounded bg-purple-500/15 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" class="text-purple-400">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-sm font-semibold text-p-text">{{ form.title || 'Título da notificação' }}</div>
            <div class="text-[13px] text-p-text-muted leading-snug">{{ form.message || 'Mensagem da notificação aparece aqui...' }}</div>
            <div class="text-[11px] text-p-text-muted mt-1">Agora mesmo</div>
          </div>
          <div class="h-[7px] w-[7px] rounded-full bg-p-accent shrink-0 mt-1.5"></div>
        </div>

        <UiAlert v-if="submitError" variant="error">
          {{ submitError }}
        </UiAlert>

        <div class="flex justify-end gap-3 pt-1">
          <UiButton variant="ghost" to="/painel/notificacoes">Cancelar</UiButton>
          <UiButton variant="primary" :disabled="sending || !isValid" :loading="sending" @click="handleSubmit">
            <svg v-if="!sending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
            </svg>
            {{ sending ? 'Enviando...' : 'Enviar notificação' }}
          </UiButton>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'painel' })

const authStore = useAuthStore()
const router = useRouter()
const { broadcast } = useNotifications()
const { success: toastSuccess, error: toastError } = useToast()

// Guard: only SYSADMIN
if (!authStore.isSysAdmin) {
  router.replace(authStore.getDashboardRoute())
}

const sending = ref(false)
const submitError = ref('')
const audienceType = ref('all')

const audienceOptions = [
  { value: 'all', label: 'Todos os usuários' },
  { value: 'role', label: 'Por perfil' },
  { value: 'tenant', label: 'Por loteadora' },
]

const form = ref({
  title: '',
  message: '',
  sendEmail: false,
  actionUrl: '',
  tenantId: undefined,
  role: undefined,
})

const isValid = computed(() => {
  const f = form.value
  if (!f.title.trim() || !f.message.trim()) return false
  if (audienceType.value === 'role' && !f.role) return false
  if (audienceType.value === 'tenant' && !f.tenantId?.trim()) return false
  return true
})

async function handleSubmit() {
  if (!isValid.value || sending.value) return
  sending.value = true
  submitError.value = ''
  try {
    const payload = {
      title: form.value.title.trim(),
      message: form.value.message.trim(),
      sendEmail: form.value.sendEmail,
      actionUrl: form.value.actionUrl?.trim() || undefined,
    }
    if (audienceType.value === 'role') payload.role = form.value.role
    if (audienceType.value === 'tenant') payload.tenantId = form.value.tenantId?.trim()

    const result = await broadcast(payload)
    toastSuccess(`Notificação enviada para ${result?.sent ?? 0} usuário(s)!`)
    router.push('/painel/notificacoes')
  } catch (e) {
    const msg = e?.message || 'Erro ao enviar notificação. Tente novamente.'
    submitError.value = msg
    toastError(msg)
  } finally {
    sending.value = false
  }
}
</script>
