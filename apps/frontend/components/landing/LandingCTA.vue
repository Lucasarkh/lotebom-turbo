<template>
  <section class="cta">
    <div class="container-landing">
      <div class="cta-box animate-float">
        <h2 class="cta-title">Pronto para digitalizar suas vendas?</h2>
        <p class="cta-subtitle">
          Junte-se a centenas de loteadoras que já estão vendendo mais com Lotio.
        </p>
        <div class="cta-buttons">
          <button v-if="settings?.contactWhatsapp" @click="openWhatsapp" class="btn btn-white btn-lg btn-rounded btn-shadow">
            Falar pelo WhatsApp
          </button>
          <button v-else @click="showContactForm = true" class="btn btn-white btn-lg btn-rounded btn-shadow">
            Começar Agora
          </button>
          <NuxtLink to="/login" class="btn btn-outline-white btn-lg btn-rounded">
            Acessar Painel
          </NuxtLink>
        </div>

        <!-- Contact Form Modal (Reuse from Hero logic if needed, or implement here) -->
        <div v-if="showContactForm" class="modal-overlay" @click.self="showContactForm = false">
          <div class="modal-content animate-scale-in">
            <button class="modal-close" @click="showContactForm = false">&times;</button>
            <h2 class="modal-title">Comece Agora</h2>
            <p class="modal-subtitle">Preencha os campos e nossa equipe entrará em contato.</p>
            <form @submit.prevent="submitContact" class="contact-form">
              <input v-model="form.name" type="text" placeholder="Nome" required>
              <input v-model="form.email" type="email" placeholder="E-mail" required>
              <input v-model="form.phone" type="tel" placeholder="WhatsApp" v-maska="'(##) #####-####'" required>
              <button type="submit" class="btn btn-primary btn-block" :disabled="submitting">
                {{ submitting ? 'Enviando...' : 'Enviar' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const { get, post } = usePublicApi()
const toast = useToast()

const settings = ref(null)
const showContactForm = ref(false)
const submitting = ref(false)
const form = ref({ name: '', email: '', phone: '' })

onMounted(async () => {
  try {
    settings.value = await get('/p/settings')
  } catch (e) {
    console.error('Erro ao carregar configurações:', e)
  }
})

const openWhatsapp = () => {
  if (!settings.value?.contactWhatsapp) return
  const phone = settings.value.contactWhatsapp.replace(/\D/g, '')
  const text = encodeURIComponent('Olá! Vim pelo site da Lotio e gostaria de mais informações.')
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
}

const submitContact = async () => {
  submitting.value = true
  try {
    await post('/p/settings/contact', form.value)
    toast.success('Recebemos sua solicitação! Entraremos em contato em breve.')
    showContactForm.value = false
    form.value = { name: '', email: '', phone: '' }
  } catch (e) {
    toast.error('Ocorreu um erro. Tente novamente.')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* Add modal styles similar to Hero here for consistency */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  color: #333;
}
.modal-content {
  background: white; padding: 40px; border-radius: 20px; width: 400px;
  position: relative;
}
.modal-close {
  position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.5rem; cursor: pointer;
}
.modal-title { margin-bottom: 10px; font-size: 1.5rem; font-weight: 700; color: #111; }
.modal-subtitle { margin-bottom: 25px; color: #666; font-size: 0.9rem; }
.contact-form { display: flex; flex-direction: column; gap: 15px; }
.contact-form input { padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
.btn-block { width: 100%; }

.cta {
  padding: 80px 0 120px;
  background-color: white;
}

.cta-box {
  background: radial-gradient(circle at top right, #3b82f6, #2563eb);
  border-radius: 40px;
  padding: 100px 40px;
  text-align: center;
  color: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 40px 80px -20px rgba(37, 99, 235, 0.4);
}

.cta-title {
  font-size: 2.25rem;
  font-weight: 800;
  margin-bottom: 24px;
  color: white;
}

@media (min-width: 768px) {
  .cta-title { font-size: 3.5rem; }
}

.cta-subtitle {
  font-size: 1.15rem;
  margin-bottom: 48px;
  color: white;
  opacity: 1;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.cta-buttons {
  display: flex;
  flex-direction: column;
  gap: 20px;
  justify-content: center;
  align-items: center;
}

@media (min-width: 640px) {
  .cta-buttons {
    flex-direction: row;
  }
}

.btn-white {
  background: white;
  color: var(--primary);
}

.btn-outline-white {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
}

.btn-outline-white:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: white;
}

.cta-meta {
  margin-top: 56px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
  font-size: 0.85rem;
  opacity: 0.8;
  font-weight: 500;
}

.animate-float {
  animation: float 10s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
