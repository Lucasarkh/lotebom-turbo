<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { usePublicApi } from '@/composables/usePublicApi'
import { useAiChatStore } from '@/stores/aiChat'
import { useTracking } from '@/composables/useTracking'

const props = defineProps<{
  project: any
}>()

const router = useRouter()
const route = useRoute()
const chatStore = useAiChatStore()
const tracking = useTracking()
const { post } = usePublicApi()

const input = ref('')
const loading = ref(false)
const loadingStatus = ref('')
const scrollContainer = ref<HTMLElement | null>(null)
const lgpdConsentAccepted = ref(false)
const consentClosing = ref(false)

const consentStorageKey = computed(() => {
  const projectSlug = props.project?.slug || 'global'
  return `lotio-ai-chat-consent:${projectSlug}`
})

// Persist isOpen and messages in store
const isOpen = computed({
  get: () => chatStore.isOpen,
  set: (val) => chatStore.isOpen = val
})

const messages = computed(() => chatStore.messages)
const showConsentBlock = computed(() => !lgpdConsentAccepted.value || consentClosing.value)

function closeChat() {
  isOpen.value = false
}

onMounted(() => {
  if (props.project?.name) {
    chatStore.init(props.project.name)
  }
  if (isOpen.value) {
    nextTick(scrollToBottom)
  }
})

watch(() => props.project?.name, (newName) => {
  if (newName) chatStore.init(newName)
})

watch(isOpen, (newVal) => {
  if (newVal) {
    nextTick(scrollToBottom)
  }
})

watch(() => props.project?.slug, () => {
  if (!process.client) return
  lgpdConsentAccepted.value = localStorage.getItem(consentStorageKey.value) === 'accepted'
}, { immediate: true })

const getPathPrefix = () => {
  return props.project?.slug ? `/${props.project.slug}` : ''
}

const navigateToLot = (code: string) => {
  const prefix = getPathPrefix()
  const path = prefix === '' ? `/${code}` : `${prefix}/${code}`
  const corretorCode = route.query.c || ''
  const finalUrl = corretorCode ? `${path}?c=${corretorCode}` : path
  router.push(finalUrl)
}

const navigateToUnits = (codes: string[]) => {
  const prefix = getPathPrefix()
  const path = prefix === '' ? `/unidades` : `${prefix}/unidades`
  const corretorCode = route.query.c || ''
  let finalUrl = `${path}?codes=${codes.join(',')}`
  if (corretorCode) finalUrl += `&c=${corretorCode}`
  router.push(finalUrl)
}

const getCards = (text: string) => {
  const parts = parseMessage(text)
  return parts.filter(p => p.type === 'card').map(p => p.content)
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message?.trim()) return error.message
  return 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente em instantes.'
}

const parseMessage = (text: string) => {
  const parts: { type: 'text' | 'card', content: any }[] = []
  const regex = /:::LOT_CARD\n?([\s\S]*?)\n?:::/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const txt = text.substring(lastIndex, match.index).trim()
      if (txt) parts.push({ type: 'text', content: txt })
    }

    try {
      const cardRaw = match[1]
      if (!cardRaw) {
        parts.push({ type: 'text', content: match[0] })
        lastIndex = regex.lastIndex
        continue
      }

      const cardData = JSON.parse(cardRaw)
      parts.push({ type: 'card', content: cardData })
    } catch (e) {
      parts.push({ type: 'text', content: match[0] })
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    const txt = text.substring(lastIndex).trim()
    if (txt) parts.push({ type: 'text', content: txt })
  }

  return parts
}

function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    tracking.trackClick('Chat: Abrir', 'AI_CHAT')
  }
}

async function sendMessage() {
  if (!lgpdConsentAccepted.value || !input.value.trim() || loading.value) return

  const userMsg = input.value
  tracking.trackClick('Chat: Enviar Mensagem', 'AI_CHAT')

  chatStore.addMessage('user', userMsg)
  input.value = ''
  loading.value = true
  loadingStatus.value = 'Pensando...'

  await nextTick()
  scrollToBottom()

  try {
    // Artificial delays for "fluidity" and realism
    setTimeout(() => {
      if (loading.value) loadingStatus.value = 'Consultando disponibilidade...'
    }, 1500)

    setTimeout(() => {
      if (loading.value) loadingStatus.value = 'Analisando melhores lotes...'
    }, 3000)

    const res = await post(`/p/${props.project.slug}/ai/chat`, {
      message: userMsg
    })

    if (!res?.message || typeof res.message !== 'string') {
      throw new Error('Nao consegui montar uma resposta valida agora. Tente novamente em instantes.')
    }

    chatStore.addMessage('ai', res.message)

  } catch (error) {
    chatStore.addMessage('ai', getErrorMessage(error))
  } finally {
    loading.value = false
    loadingStatus.value = ''
    await nextTick()
    scrollToBottom()
  }
}

function onConsentChange(event: Event) {
  const target = event.target as HTMLInputElement
  lgpdConsentAccepted.value = target.checked

  if (!process.client) return

  if (target.checked) {
    localStorage.setItem(consentStorageKey.value, 'accepted')
    tracking.trackClick('Chat: Aceite LGPD', 'AI_CHAT')

    // Keep it visible long enough to play the close animation.
    consentClosing.value = true
    setTimeout(() => {
      consentClosing.value = false
    }, 240)

    return
  }

  consentClosing.value = false
  localStorage.removeItem(consentStorageKey.value)
}

function scrollToBottom() {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

onMounted(() => {
  if (isOpen.value) scrollToBottom()
})
</script>

<template>
  <div
    v-if="project?.aiEnabled"
    class="fixed bottom-6 left-6 z-[3200] font-sans max-md:bottom-[calc(80px+env(safe-area-inset-bottom,0px))] max-md:left-4"
    :class="{ '!left-0 !bottom-0': isOpen }"
    style="--chat-bg:#0f1d21;--chat-surface:#142a30;--chat-surface-2:#1a3640;--chat-border:#2d4c57;--chat-text:#e7f4f7;--chat-muted:#a8c3cb;--chat-primary:#15b4a6;--chat-primary-strong:#0e9c90;--chat-user-bubble:#0ca678"
  >
    <!-- Bubble Button -->
    <button
      v-if="!isOpen"
      class="group relative w-14 h-14 max-md:w-[52px] max-md:h-[52px] rounded-full bg-gradient-to-br from-[#15b4a6] to-[#0d8f86] text-white border border-[#0b6f68] shadow-[0_8px_22px_rgba(3,42,46,0.45)] cursor-pointer flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_26px_rgba(3,42,46,0.52)]"
      @click="toggleChat"
    >
      <span class="flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
      </span>
      <div class="absolute left-[70px] max-md:hidden top-1/2 -translate-y-1/2 bg-[#0f2b32] text-[#dcf2f6] px-4 py-2 rounded-[20px] text-[0.825rem] font-semibold shadow-[0_6px_14px_rgba(1,16,20,0.35)] whitespace-nowrap pointer-events-none opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:left-[65px]">Dúvidas? Fale comigo!</div>
    </button>

    <div v-if="isOpen" class="fixed inset-0 bg-black/[0.42] backdrop-blur-sm z-[1] animate-[aiFadeIn_0.2s_ease]" @click="closeChat"></div>

    <!-- Chat Window -->
    <div
      v-if="isOpen"
      class="fixed bottom-[110px] left-6 w-[350px] max-w-[calc(100vw-40px)] h-[500px] max-h-[calc(100vh-120px)] bg-[var(--chat-bg)] border border-[var(--chat-border)] rounded-2xl shadow-[0_18px_45px_rgba(3,17,20,0.55)] flex flex-col overflow-hidden animate-[slideUp_0.3s_ease-out] z-[2] max-md:left-0 max-md:right-0 max-md:bottom-0 max-md:w-full max-md:max-w-full max-md:h-[min(80vh,640px)] max-md:max-h-[80dvh] max-md:rounded-[20px_20px_0_0] max-md:animate-[aiSheetUp_0.28s_ease-out]"
    >
      <div class="px-5 py-4 bg-[#0a1418] border-b border-[var(--chat-border)] text-white flex items-center gap-3">
        <div class="bg-[#17323a] border border-[#27515d] w-9 h-9 flex items-center justify-center rounded-[10px]">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </div>
        <div>
          <div class="font-semibold text-[0.95rem]">Assistente {{ project?.name }}</div>
          <div class="text-[0.7rem] text-[#c9e7ed] flex items-center gap-1 before:content-[''] before:w-1.5 before:h-1.5 before:bg-green-500 before:rounded-full">Online agora</div>
        </div>
        <button class="ml-auto bg-transparent border-none text-white text-xl cursor-pointer opacity-50 transition-opacity duration-200 hover:opacity-100" @click="closeChat">&times;</button>
      </div>

      <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-3 bg-[var(--chat-surface)]" ref="scrollContainer">
        <div v-for="(msg, i) in messages" :key="i" class="max-w-[85%] leading-relaxed text-[0.95rem]" :class="msg.role === 'user' ? 'self-end' : 'self-start'">
          <template v-if="msg.role === 'ai'">
            <div v-for="(part, pi) in parseMessage(msg.text)" :key="pi" class="[&+&]:mt-2">
              <div v-if="part.type === 'text'" class="px-3.5 py-2.5 rounded-[15px] bg-[var(--chat-surface-2)] text-[var(--chat-text)] border border-[var(--chat-border)] rounded-bl-[2px] shadow-[0_2px_5px_rgba(2,14,17,0.24)]">{{ part.content }}</div>

              <div v-else-if="part.type === 'card'" class="bg-[#173741] border border-[#2f5562] rounded-xl overflow-hidden shadow-md w-full max-w-[280px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-[#4f7886]" @click="navigateToLot(part.content.code)">
                <div class="px-3 py-2.5 bg-[#122d35] border-b border-[#2f5562] flex justify-between items-center">
                  <span class="font-bold text-[#ebf9fc]">{{ part.content.code }}</span>
                  <span
                    class="text-[0.7rem] font-bold uppercase px-2 py-0.5 rounded-[10px]"
                    :class="part.content.status.toLowerCase() === 'disponível' ? 'bg-emerald-500/[0.12] text-emerald-400' : 'bg-red-500/[0.12] text-red-900'"
                  >{{ part.content.status }}</span>
                </div>
                <div class="p-3 flex flex-col gap-1.5">
                  <div class="flex justify-between text-[0.85rem]">
                    <span class="text-[var(--chat-muted)]">Área:</span>
                    <span class="font-semibold text-[#e6f4f8]">{{ part.content.area }}</span>
                  </div>
                  <div class="flex justify-between text-[0.85rem]">
                    <span class="text-[var(--chat-muted)]">Preço:</span>
                    <span class="font-semibold text-[#e6f4f8]">{{ part.content.price }}</span>
                  </div>
                  <div class="flex justify-between text-[0.85rem]">
                    <span class="text-[var(--chat-muted)]">Topografia:</span>
                    <span class="font-semibold text-[#e6f4f8]">{{ part.content.topography }}</span>
                  </div>
                </div>
                <div v-if="part.content.tags && part.content.tags.length" class="px-3 py-2 flex flex-wrap gap-1 border-t border-dashed border-[#38606d]">
                  <span v-for="tag in part.content.tags" :key="tag" class="text-[0.7rem] bg-[#0f2b32] text-[#c9e7ed] px-1.5 py-0.5 rounded">{{ tag }}</span>
                </div>
                <div class="px-3 py-2 bg-[#122d35] border-t border-[#2f5562] flex justify-between items-center text-[0.8rem] font-semibold text-[#7ad7e4]">
                  <span>Ver detalhes</span>
                  <span>&rarr;</span>
                </div>
              </div>
            </div>

            <!-- Multi-card Action -->
            <div v-if="getCards(msg.text).length > 1" class="mt-3 flex justify-start pl-2.5">
              <button class="bg-[var(--chat-primary)] text-white border-none px-4 py-2 rounded-[20px] text-[0.85rem] font-semibold cursor-pointer transition-all duration-200 shadow-[0_6px_14px_rgba(9,82,92,0.35)] hover:bg-[var(--chat-primary-strong)] hover:-translate-y-[1px] hover:shadow-[0_8px_18px_rgba(9,82,92,0.45)]" @click="navigateToUnits(getCards(msg.text).map(c => c.code))">
                Ver todos os {{ getCards(msg.text).length }} lotes encontrados
              </button>
            </div>
          </template>
          <div v-else class="px-3.5 py-2.5 rounded-[15px] bg-[var(--chat-user-bubble)] text-white rounded-br-[2px]">{{ msg.text }}</div>
        </div>
        <div v-if="loading" class="max-w-[85%] self-start">
          <div class="flex items-center gap-2.5 bg-[#173741] text-[#b8d5dd] italic text-[0.85rem] px-4 py-3 rounded-[15px] rounded-bl-[2px]">
            <div class="flex gap-1">
              <div class="w-1.5 h-1.5 bg-[#7dc6d2] rounded-full animate-[pulse_1.5s_infinite_ease-in-out]"></div>
              <div class="w-1.5 h-1.5 bg-[#7dc6d2] rounded-full animate-[pulse_1.5s_infinite_ease-in-out_0.2s]"></div>
              <div class="w-1.5 h-1.5 bg-[#7dc6d2] rounded-full animate-[pulse_1.5s_infinite_ease-in-out_0.4s]"></div>
            </div>
            <span class="whitespace-nowrap">{{ loadingStatus }}</span>
          </div>
        </div>
      </div>

      <form class="px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] bg-[#10262d] border-t border-[var(--chat-border)] flex flex-wrap gap-2.5 items-center max-[420px]:px-3 max-[420px]:py-2.5 max-[420px]:pb-[calc(10px+env(safe-area-inset-bottom,0px))] max-[420px]:gap-2" @submit.prevent="sendMessage">
        <div
          v-if="showConsentBlock"
          class="w-full bg-[#0d2128] border border-[#a6c9d1] rounded-[10px] px-2.5 py-2 overflow-hidden max-h-40 opacity-100 translate-y-0 transition-all duration-[240ms] ease-in-out"
          :class="consentClosing ? 'max-h-0 opacity-0 -translate-y-1.5 !m-0 !py-0 !border-0' : ''"
        >
          <label class="flex gap-2 items-start text-[0.72rem] text-[#cfe8ee] leading-[1.45]">
            <input
              type="checkbox"
              :checked="lgpdConsentAccepted"
              class="mt-0.5 accent-[var(--chat-primary)]"
              @change="onConsentChange"
            />
            <span>
              Concordo que um resumo desta conversa com o assistente virtual possa ser registrado para atendimento e melhoria do serviço, conforme
              <NuxtLink to="/termos-de-uso" target="_blank" class="text-[#61d9ff] underline">Termos de Uso</NuxtLink>
              e
              <NuxtLink to="/politica-de-privacidade" target="_blank" class="text-[#61d9ff] underline">Política de Privacidade</NuxtLink>.
            </span>
          </label>
        </div>

        <div class="relative flex-1 min-w-0 flex items-center">
          <input
            v-model="input"
            placeholder="Digite sua dúvida..."
            maxlength="280"
            :disabled="!lgpdConsentAccepted"
            class="w-full max-w-full border border-[#86aeb8] rounded-[20px] py-[11px] pl-[18px] pr-[65px] text-[0.95rem] outline-none transition-all duration-200 bg-[#0b1e24] text-[#ecfafc] placeholder:text-[#8eb2bc] focus:border-[var(--chat-primary)] focus:bg-[#0a1a20] focus:shadow-[0_0_0_3px_rgba(21,180,166,0.2)] max-[420px]:py-2.5 max-[420px]:pl-3.5 max-[420px]:pr-[58px] max-[420px]:text-[0.9rem]"
          />
          <div
            class="absolute right-[15px] max-[420px]:right-3 text-[0.65rem] text-[#a8c7cf] pointer-events-none font-medium"
            :class="input.length >= 280 ? '!text-red-500' : ''"
          >
            {{ input.length }}/280
          </div>
        </div>
        <button
          type="submit"
          :disabled="!lgpdConsentAccepted || !input.trim() || loading"
          class="bg-[var(--chat-primary)] text-white border-none w-10 h-10 min-w-[40px] max-[420px]:w-[38px] max-[420px]:h-[38px] max-[420px]:min-w-[38px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 shrink-0 shadow-[0_4px_10px_rgba(8,75,84,0.45)] hover:enabled:scale-105 hover:enabled:bg-[var(--chat-primary-strong)] hover:enabled:shadow-[0_6px_12px_rgba(8,75,84,0.55)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </form>
    </div>
  </div>
</template>
