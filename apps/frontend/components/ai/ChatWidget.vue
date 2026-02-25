<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { usePublicApi } from '@/composables/usePublicApi'

const props = defineProps<{
  project: any
}>()

const { post } = usePublicApi()
const isOpen = ref(false)
const input = ref('')
const messages = ref<{ role: 'user' | 'ai', text: string }[]>([
  { role: 'ai', text: `Olá! Sou o assistente virtual do ${props.project.name}. Como posso te ajudar hoje?` }
])
const loading = ref(false)
const scrollContainer = ref<HTMLElement | null>(null)

function toggleChat() {
  isOpen.value = !isOpen.value
}

async function sendMessage() {
  if (!input.value.trim() || loading.value) return
  
  const userMsg = input.value
  messages.value.push({ role: 'user', text: userMsg })
  input.value = ''
  loading.value = true
  
  await nextTick()
  scrollToBottom()

  try {
    const res = await post(`/p/${props.project.slug}/ai/chat`, {
      message: userMsg
    })
    messages.value.push({ role: 'ai', text: res.message })
  } catch (error) {
    messages.value.push({ role: 'ai', text: 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente em instantes.' })
  } finally {
    loading.value = false
    await nextTick()
    scrollToBottom()
  }
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
  <div v-if="project.aiEnabled" class="ai-widget">
    <!-- Bubble Button -->
    <button class="ai-bubble" @click="toggleChat" :class="{ 'is-open': isOpen }">
      <span v-if="!isOpen">🤖</span>
      <span v-else>&times;</span>
      <div v-if="!isOpen" class="ai-tooltip">Falar com Assistente</div>
    </button>

    <!-- Chat Window -->
    <div v-if="isOpen" class="ai-window">
      <div class="ai-header">
        <div class="ai-avatar">🤖</div>
        <div class="ai-info">
          <div class="ai-name">Assistente {{ project.name }}</div>
          <div class="ai-status">Online agora</div>
        </div>
        <button class="ai-close" @click="isOpen = false">&times;</button>
      </div>

      <div class="ai-messages" ref="scrollContainer">
        <div v-for="(msg, i) in messages" :key="i" class="ai-msg" :class="`ai-msg-${msg.role}`">
          <div class="ai-msg-bubble">{{ msg.text }}</div>
        </div>
        <div v-if="loading" class="ai-msg ai-msg-ai">
          <div class="ai-msg-bubble typing">...</div>
        </div>
      </div>

      <form class="ai-input-area" @submit.prevent="sendMessage">
        <input v-model="input" placeholder="Digite sua dúvida..." />
        <button type="submit" :disabled="!input.trim() || loading">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.ai-widget {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: 2147483647;
  font-family: var(--font-sans, sans-serif);
}

.ai-bubble {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--primary, #0071e3);
  color: white;
  border: none;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
}

.ai-bubble:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0,0,0,0.25);
}

.ai-bubble.is-open {
  background: var(--gray-800, #1f2937);
}

.ai-tooltip {
  position: absolute;
  right: 75px;
  top: 50%;
  transform: translateY(-50%);
  background: white;
  color: var(--gray-800);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
}

.ai-bubble:hover .ai-tooltip {
  opacity: 1;
}

.ai-window {
  position: absolute;
  bottom: 75px;
  right: 0;
  width: 350px;
  max-width: calc(100vw - 40px);
  height: 500px;
  max-height: calc(100vh - 120px);
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.ai-header {
  padding: 20px;
  background: var(--primary, #0071e3);
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar {
  font-size: 1.5rem;
  background: rgba(255,255,255,0.2);
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.ai-name {
  font-weight: 700;
  font-size: 1rem;
}

.ai-status {
  font-size: 0.75rem;
  opacity: 0.8;
}

.ai-close {
  margin-left: auto;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  opacity: 0.7;
}

.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f8fafc;
}

.ai-msg {
  max-width: 85%;
  line-height: 1.5;
  font-size: 0.95rem;
}

.ai-msg-user {
  align-self: flex-end;
}

.ai-msg-ai {
  align-self: flex-start;
}

.ai-msg-bubble {
  padding: 10px 14px;
  border-radius: 15px;
}

.ai-msg-user .ai-msg-bubble {
  background: var(--primary, #0071e3);
  color: white;
  border-bottom-right-radius: 2px;
}

.ai-msg-ai .ai-msg-bubble {
  background: white;
  color: var(--gray-800);
  border-bottom-left-radius: 2px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.ai-input-area {
  padding: 15px;
  background: white;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 10px;
}

.ai-input-area input {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  padding: 10px 18px;
  font-size: 0.95rem;
  outline: none;
}

.ai-input-area input:focus {
  border-color: var(--primary, #0071e3);
}

.ai-input-area button {
  background: var(--primary, #0071e3);
  color: white;
  border: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
}

.ai-input-area button:disabled {
  opacity: 0.5;
}

.typing {
  font-weight: bold;
  letter-spacing: 2px;
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0% { opacity: 0.2; }
  50% { opacity: 1; }
  100% { opacity: 0.2; }
}
</style>
