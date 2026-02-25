<template>
  <section id="cta" class="cta">
    <div class="container-landing">
      <div class="cta-inner">
        <h2 class="cta-title">Sua jornada digital <br> começa aqui.</h2>
        <p class="cta-subtitle">
          Transforme sua forma de vender com a tecnologia líder para gestão de loteamentos.
        </p>
        
        <div class="cta-form-container animate-slide-up-delay-1">
          <form @submit.prevent="submitContact" class="cta-card-form">
            <div class="form-group">
              <input v-model="form.name" type="text" placeholder="Seu nome" required>
            </div>
            <div class="form-group">
              <input v-model="form.email" type="email" placeholder="E-mail corporativo" required>
            </div>
            <div class="form-group">
              <input v-model="form.phone" type="tel" placeholder="WhatsApp" v-maska="'(##) #####-####'" required>
            </div>
            <button type="submit" class="btn btn-primary btn-apple-lg btn-block" :disabled="submitting">
              {{ submitting ? 'Enviando...' : 'Solicitar uma Demonstração' }}
            </button>
          </form>
          <div class="cta-footer-links" v-if="settings?.contactWhatsapp">
            <p>Prefere conversar agora? <a @click.prevent="openWhatsapp" href="#" class="wa-link">Chamar no WhatsApp</a></p>
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
.cta {
  padding: 140px 0;
  background: radial-gradient(circle at top, var(--gray-100) 0%, var(--gray-50) 100%);
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
  letter-spacing: -0.04em;
  color: var(--gray-900);
  line-height: 1.05;
}

@media (min-width: 768px) {
  .cta-title { font-size: 4.8rem; }
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

.cta-form-container {
  max-width: 450px;
  margin: 0 auto;
}

.cta-card-form {
  background: white;
  padding: 32px;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.06);
  border: 1px solid var(--gray-100);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cta-card-form input {
  width: 100%;
  padding: 16px 20px;
  border-radius: 12px;
  border: 1px solid var(--gray-200);
  background: var(--gray-50);
  font-size: 1rem;
  transition: all 0.2s ease;
  outline: none;
}

.cta-card-form input:focus {
  border-color: var(--primary);
  background: white;
  box-shadow: 0 0 0 4px var(--primary-50);
}

.cta-footer-links {
  margin-top: 24px;
  font-size: 0.95rem;
  color: var(--gray-500);
}

.wa-link {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
}

.wa-link:hover {
  text-decoration: underline;
}

.btn-apple-lg {
  border-radius: 12px;
  padding: 18px;
  font-size: 1.1rem;
  font-weight: 600;
}

.btn-block {
  width: 100%;
}
</style>
