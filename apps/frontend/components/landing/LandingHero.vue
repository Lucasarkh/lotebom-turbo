<template>
  <section class="hero">
    <div class="container-landing">
      <div class="hero-content">
        <div class="hero-badge animate-fade-in">Mestre em Vendas Imobiliárias</div>
        <h1 class="hero-title animate-slide-up">
          O futuro do loteamento é <span class="text-gradient">interativo</span>.
        </h1>
        <p class="hero-subtitle animate-slide-up-delay-1">
          Transforme seus mapas estáticos em ferramentas de venda poderosas. 
          Gerencie seu estoque de lotes, capture leads em tempo real e conecte corretores com o que há de mais moderno.
        </p>
        <div class="hero-actions animate-slide-up-delay-2">
          <button v-if="settings?.contactWhatsapp" @click="openWhatsapp" class="btn btn-whatsapp btn-lg btn-rounded btn-shadow">
            <i class="pi pi-whatsapp mr-2"></i>
            Falar pelo WhatsApp
          </button>
          <button v-else @click="showContactForm = true" class="btn btn-primary btn-lg btn-rounded btn-shadow">
            Comece agora
          </button>
        </div>
      </div>
    </div>

    <!-- Contact Form Modal -->
    <div v-if="showContactForm" class="modal-overlay" @click.self="showContactForm = false">
      <div class="modal-content animate-scale-in">
        <button class="modal-close" @click="showContactForm = false">&times;</button>
        <h2 class="modal-title">Solicite uma Demonstração</h2>
        <p class="modal-subtitle">Preencha os campos abaixo e entraremos em contato o mais breve possível.</p>
        
        <form @submit.prevent="submitContact" class="contact-form">
          <div class="form-group">
            <label>Qual seu nome?</label>
            <input v-model="form.name" type="text" placeholder="Seu nome completo" required>
          </div>
          <div class="form-group">
            <label>E-mail corporativo</label>
            <input v-model="form.email" type="email" placeholder="seu@email.com" required>
          </div>
          <div class="form-group">
            <label>WhatsApp / Celular</label>
            <input v-model="form.phone" type="tel" placeholder="(00) 00000-0000" v-maska="'(##) #####-####'" required>
          </div>
          <div class="form-group">
            <label>Sua mensagem (Opcional)</label>
            <textarea v-model="form.message" placeholder="Conte um pouco sobre seu empreendimento..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-block" :disabled="submitting">
            {{ submitting ? 'Enviando...' : 'Enviar Solicitação' }}
          </button>
        </form>
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
const form = ref({
  name: '',
  email: '',
  phone: '',
  message: ''
})

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
    toast.success('Solicitação enviada com sucesso! Em breve entraremos em contato.')
    showContactForm.value = false
    form.value = { name: '', email: '', phone: '', message: '' }
  } catch (e) {
    toast.error('Erro ao enviar solicitação. Tente novamente.')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 100px 0;
  background: 
    linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.65)),
    url('~/static/img/banner-hero.jpg') center/cover no-repeat fixed;
  overflow: hidden;
  position: relative;
}

.hero-content {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-block;
  background-color: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  backdrop-filter: blur(8px);
  padding: 8px 16px;
  border-radius: 100px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 24px;
}

.hero-title {
  font-size: 2.75rem;
  line-height: 1.1;
  letter-spacing: -1.5px;
  font-weight: 800;
  margin-bottom: 24px;
  color: white;
}

@media (min-width: 768px) {
  .hero-title {
    font-size: 4.5rem;
  }
}

.text-gradient {
  background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 40px;
  max-width: 650px;
}

.btn-whatsapp {
  background-color: #25d366;
  color: white !important;
}
.btn-whatsapp:hover {
  background-color: #128c7e;
  transform: translateY(-2px);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-content {
  background: white;
  width: 100%;
  max-width: 500px;
  border-radius: 24px;
  padding: 40px;
  position: relative;
  box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.5);
}

.modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: var(--gray-400);
}

.modal-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--gray-900);
}

.modal-subtitle {
  color: var(--gray-500);
  margin-bottom: 32px;
}

.contact-form .form-group {
  margin-bottom: 20px;
}

.contact-form label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--gray-700);
}

.contact-form input,
.contact-form textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--gray-200);
  border-radius: 12px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.contact-form input:focus,
.contact-form textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.contact-form textarea {
  height: 100px;
  resize: none;
}

.btn-block {
  width: 100%;
  margin-top: 12px;
}

@media (min-width: 768px) {
  .hero-subtitle {
    font-size: 1.35rem;
  }
}

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

@media (min-width: 640px) {
  .hero-actions {
    flex-direction: row;
    justify-content: center;
    width: auto;
  }
}

.btn-lg {
  padding: 16px 36px;
  font-size: 1.1rem;
  font-weight: 600;
}

.btn-shadow {
  box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4);
}

.hero-visual {
  display: none;
}
</style>
