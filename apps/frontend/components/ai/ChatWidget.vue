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
      const cardData = JSON.parse(match[1])
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
      <span v-if="!isOpen" class="ai-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
      </span>
      <span v-else>&times;</span>
      <div v-if="!isOpen" class="ai-tooltip">Dúvidas? Fale comigo!</div>
    </button>

    <!-- Chat Window -->
    <div v-if="isOpen" class="ai-window">
      <div class="ai-header">
        <div class="ai-avatar">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </div>
        <div class="ai-info">
          <div class="ai-name">Assistente {{ project.name }}</div>
          <div class="ai-status">Online agora</div>
        </div>
        <button class="ai-close" @click="isOpen = false">&times;</button>
      </div>

      <div class="ai-messages" ref="scrollContainer">
        <div v-for="(msg, i) in messages" :key="i" class="ai-msg" :class="`ai-msg-${msg.role}`">
          <template v-if="msg.role === 'ai'">
            <div v-for="(part, pi) in parseMessage(msg.text)" :key="pi" class="ai-message-part">
              <div v-if="part.type === 'text'" class="ai-msg-bubble">{{ part.content }}</div>
              
              <div v-else-if="part.type === 'card'" class="lot-mini-card">
                <div class="lot-mini-header">
                  <span class="lot-mini-code">{{ part.content.code }}</span>
                  <span class="lot-mini-status" :class="part.content.status.toLowerCase()">{{ part.content.status }}</span>
                </div>
                <div class="lot-mini-body">
                  <div class="lot-mini-info">
                    <span class="label">Área:</span>
                    <span class="value">{{ part.content.area }}</span>
                  </div>
                  <div class="lot-mini-info">
                    <span class="label">Preço:</span>
                    <span class="value">{{ part.content.price }}</span>
                  </div>
                  <div class="lot-mini-info">
                    <span class="label">Topografia:</span>
                    <span class="value">{{ part.content.topography }}</span>
                  </div>
                </div>
                <div v-if="part.content.tags && part.content.tags.length" class="lot-mini-tags">
                  <span v-for="tag in part.content.tags" :key="tag" class="tag">{{ tag }}</span>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="ai-msg-bubble">{{ msg.text }}</div>
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
  left: var(--space-6);
  z-index: 2147483647;
  font-family: var(--font-sans, sans-serif);
}

@media (max-width: 768px) {
  .ai-widget {
    bottom: 20px;
    left: 16px;
  }
}

.ai-bubble {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #111;
  color: white;
  border: none;
  box-shadow: 0 4px 15px rgba(0,0,0,0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
}

.ai-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-bubble:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0,0,0,0.2);
}

.ai-bubble.is-open {
  background: var(--gray-800, #1f2937);
}

.ai-tooltip {
  position: absolute;
  left: 70px;
  top: 50%;
  transform: translateY(-50%);
  background: white;
  color: var(--gray-800);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.825rem;
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: all 0.2s;
}

.ai-bubble:hover .ai-tooltip {
  opacity: 1;
  left: 65px;
}

.ai-window {
  position: absolute;
  bottom: 70px;
  left: 0;
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
  padding: 16px 20px;
  background: #111;
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar {
  background: rgba(255,255,255,0.1);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.ai-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.ai-status {
  font-size: 0.7rem;
  opacity: 0.6;
  display: flex;
  align-items: center;
  gap: 4px;
}

.ai-status::before {
  content: '';
  width: 6px;
  height: 6px;
  background: #22c55e;
  border-radius: 50%;
}

.ai-close {
  margin-left: auto;
  background: none;
  border: none;
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.ai-close:hover {
  opacity: 1;
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

.ai-message-part + .ai-message-part {
  margin-top: 8px;
}

/* Lot Mini Card */
.lot-mini-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 280px;
}

.lot-mini-header {
  padding: 10px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lot-mini-code {
  font-weight: 700;
  color: var(--gray-900);
}

.lot-mini-status {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 10px;
}

.lot-mini-status.disponível {
  background: #dcfce7;
  color: #166534;
}

.lot-mini-status.vendido {
  background: #fee2e2;
  color: #991b1b;
}

.lot-mini-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lot-mini-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.lot-mini-info .label {
  color: #64748b;
}

.lot-mini-info .value {
  font-weight: 600;
  color: #1e293b;
}

.lot-mini-tags {
  padding: 8px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  border-top: 1px dashed #e2e8f0;
}

.lot-mini-tags .tag {
  font-size: 0.7rem;
  background: #f1f5f9;
  color: #475569;
  padding: 2px 6px;
  border-radius: 4px;
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
