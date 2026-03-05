<template>
  <div class="maintenance-page">
    <div class="maintenance-container">
      <div class="maintenance-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="80" height="80">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      </div>
      <h1 class="maintenance-title">Sistema em Manutenção</h1>
      <p class="maintenance-message">{{ message }}</p>
      <div class="maintenance-info">
        <p>Estamos trabalhando para melhorar sua experiência.</p>
        <p>Por favor, tente novamente em alguns instantes.</p>
      </div>
      <div class="maintenance-pulse"></div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'public' })

const message = ref('Sistema em manutenção. Voltaremos em breve.')

onMounted(async () => {
  try {
    const { usePublicApi } = await import('../composables/usePublicApi')
    const { get } = usePublicApi()
    const data = await get('/p/settings/maintenance')
    if (data && data.message) {
      message.value = data.message
    }
    if (data && !data.enabled) {
      navigateTo('/')
    }
  } catch {
    // fallback message already set
  }
})
</script>

<style scoped>
.maintenance-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0f0d 0%, #1a2332 50%, #0a0f0d 100%);
  padding: 20px;
}

.maintenance-container {
  text-align: center;
  max-width: 500px;
  padding: 48px 32px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(52, 211, 153, 0.15);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  position: relative;
}

.maintenance-icon {
  color: #f59e0b;
  margin-bottom: 24px;
  animation: pulse-icon 2s ease-in-out infinite;
}

@keyframes pulse-icon {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.maintenance-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 12px;
}

.maintenance-message {
  font-size: 1.1rem;
  color: #94a3b8;
  margin-bottom: 24px;
  line-height: 1.6;
}

.maintenance-info {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.8;
}

.maintenance-pulse {
  width: 40px;
  height: 4px;
  background: rgba(52, 211, 153, 0.4);
  border-radius: 2px;
  margin: 32px auto 0;
  animation: loading-bar 1.5s ease-in-out infinite;
}

@keyframes loading-bar {
  0% { width: 40px; opacity: 0.4; }
  50% { width: 100px; opacity: 1; }
  100% { width: 40px; opacity: 0.4; }
}
</style>
