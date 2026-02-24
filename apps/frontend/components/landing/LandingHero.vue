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
          <NuxtLink to="/cadastro" class="btn btn-primary btn-lg btn-rounded btn-shadow">
            Comece agora
          </NuxtLink>
        </div>

        <div class="hero-visual animate-scale-in">
          <div class="visual-placeholder shadow-float">
            <!-- Representing the Interactive Map -->
            <div class="mockup-ui">
              <div class="mockup-header">
                <div class="dot red"></div>
                <div class="dot yellow"></div>
                <div class="dot green"></div>
                <div class="mockup-search">Mapa de Lotes - Residencial Solar</div>
              </div>
              <div class="mockup-body">
                <div class="map-grid">
                  <div v-for="i in 12" :key="i" class="lot-block" :class="{ 'sold': i % 3 === 0, 'reserved': i % 5 === 0 }">
                    <span class="lot-number">L-{{ 100 + i }}</span>
                    <span class="lot-status" v-if="i % 3 === 0">Vendido</span>
                    <span class="lot-status" v-else-if="i % 5 === 0">Reservado</span>
                    <span class="lot-status" v-else>Disponível</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 140px 0 80px;
  background: url('~/static/img/banner-hero.jpg') center/cover no-repeat;
  overflow: hidden;
}

.hero-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.hero-badge {
  background-color: var(--primary-light);
  color: var(--primary);
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
}

@media (min-width: 768px) {
  .hero-title {
    font-size: 4.5rem;
  }
}

.text-gradient {
  background: linear-gradient(135deg, var(--primary) 0%, #10b981 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: var(--gray-600);
  margin-bottom: 40px;
  max-width: 650px;
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
  margin-top: 80px;
  width: 100%;
  perspective: 1000px;
}

.visual-placeholder {
  background: white;
  border-radius: 20px;
  border: 1px solid var(--gray-200);
  overflow: hidden;
  max-width: 1000px;
  margin: 0 auto;
  transform: rotateX(10deg);
  transition: transform 0.5s;
}

.visual-placeholder:hover {
  transform: rotateX(0deg);
}

.shadow-float {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.mockup-ui {
  background: #f8fafc;
  width: 100%;
}

.mockup-header {
  height: 40px;
  border-bottom: 1px solid var(--gray-200);
  background: white;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 8px;
}

.dot { width: 10px; height: 10px; border-radius: 50%; }
.red { background: #ff5f56; }
.yellow { background: #ffbd2e; }
.green { background: #27c93f; }

.mockup-search {
  margin-left: 20px;
  font-size: 0.75rem;
  background: var(--gray-100);
  padding: 4px 12px;
  border-radius: 4px;
  color: var(--gray-400);
  width: 200px;
  text-align: left;
}

.mockup-body {
  padding: 24px;
  min-height: 400px;
}

.map-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

@media (min-width: 640px) {
  .map-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.lot-block {
  aspect-ratio: 16/9;
  background: white;
  border: 2px solid var(--primary-50);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.2s;
}

.lot-block.sold { background: #fee2e2; border-color: #fecaca; }
.lot-block.reserved { background: #ffedd5; border-color: #fed7aa; }

.lot-number { font-size: 0.7rem; font-weight: 700; color: var(--gray-900); }
.lot-status { font-size: 0.6rem; color: var(--gray-500); }
.sold .lot-status { color: #dc2626; font-weight: 600; }
.reserved .lot-status { color: #d97706; font-weight: 600; }

/* Animations */
.animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1); }
.animate-slide-up-delay-1 { animation: slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s both; }
.animate-slide-up-delay-2 { animation: slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s both; }
.animate-scale-in { animation: scaleIn 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s both; }
.animate-fade-in { animation: fadeIn 1s ease-out; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9) rotateX(10deg); }
  to { opacity: 1; transform: scale(1) rotateX(10deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
