<template>
  <section id="cta" class="cta">
    <div class="container-landing">
      <div class="cta-inner">
        <h2 class="cta-title">Sua jornada digital <br> começa aqui.</h2>
        <p class="cta-subtitle">
          Transforme sua forma de vender com a tecnologia líder para gestão de loteamentos.
        </p>
        <div class="cta-actions">
          <button v-if="settings?.contactWhatsapp" @click="openWhatsapp" class="btn btn-primary btn-apple-lg btn-shadow">
            Falar com um especialista
          </button>
          <button v-else @click="showContactForm = true" class="btn btn-primary btn-apple-lg btn-shadow">
            Solicitar Demonstração
          </button>
          <button @click="showContactForm = true" class="btn btn-secondary btn-apple-lg btn-ghost">
            Solicitar Orçamento
          </button>
        </div>
      </div>

      <!-- Contact Form Modal -->
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
.cta {
  padding: 120px 0;
  background-color: var(--gray-50);
}

.cta-inner {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.cta-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 24px;
  letter-spacing: -2.5px;
  color: var(--gray-900);
  line-height: 1.05;
}

@media (min-width: 768px) {
  .cta-title { font-size: 4.5rem; }
}

.cta-subtitle {
  font-size: 1.25rem;
  margin-bottom: 48px;
  color: var(--gray-500);
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.4;
}

.cta-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

@media (min-width: 640px) {
  .cta-actions {
    flex-direction: row;
  }
}

.btn-apple-lg {
  border-radius: 980px;
  padding: 16px 36px;
  font-size: 1.1rem;
  font-weight: 500;
}

.btn-ghost {
  background: transparent;
  color: var(--primary);
  border: none;
}

/* Modal from Hero for consistency */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1100;
}

.modal-content {
  background: white;
  padding: 48px;
  border-radius: 32px;
  width: 100%;
  max-width: 480px;
  position: relative;
  box-shadow: 0 40px 100px rgba(0,0,0,0.2);
}

.modal-close {
  position: absolute; top: 24px; right: 24px; background: none; border: none; font-size: 2rem; cursor: pointer; color: var(--gray-400);
}

.modal-title { margin-bottom: 12px; font-size: 1.75rem; font-weight: 700; color: var(--gray-900); letter-spacing: -0.02em; }
.modal-subtitle { margin-bottom: 32px; color: var(--gray-500); font-size: 1rem; }

.contact-form .form-group { margin-bottom: 16px; }
.contact-form input { 
  width: 100%; 
  padding: 14px 20px; 
  border: 1px solid var(--gray-200); 
  border-radius: 12px; 
  background: var(--gray-50);
  font-size: 1rem;
  transition: all 0.2s;
}

.contact-form input:focus {
  outline: none;
  border-color: var(--primary);
  background: white;
}

.btn-block { width: 100%; margin-top: 16px; }
</style>
