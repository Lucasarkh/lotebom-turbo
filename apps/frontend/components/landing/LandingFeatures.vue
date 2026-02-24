<template>
  <section id="features" class="features">
    <div class="container-landing">
      <div class="section-header animate-slide-up">
        <h2 class="section-title">Tecnologia desenhada para <br><span class="text-primary">converter</span>.</h2>
        <p class="section-subtitle">
          Cada pixel do Lotio foi pensado para eliminar atritos entre o corretor, o mapa e a venda final.
        </p>
      </div>

      <div class="bento-grid">
        <!-- Main: Interactive Maps -->
        <div class="bento-item main-feature animate-slide-up">
          <div class="bento-content">
            <div class="bento-tag">Visualização</div>
            <h3 class="bento-title">Mapas Interativos de Alta Precisão</h3>
            <p class="bento-desc">Abandone os PDFs estáticos. Dê aos seus clientes e corretores a visão em tempo real de cada lote disponível, reservado ou vendido.</p>
          </div>
          <div class="bento-visual">
            <!-- Representação abstrata ou ícone grande -->
            <div class="abstract-map">
              <div class="block" v-for="i in 12" :key="i" :class="{ 'sold': i % 4 === 0, 'reserved': i === 7 }"></div>
            </div>
          </div>
        </div>

        <!-- Conversion -->
        <div class="bento-item animate-slide-up">
          <div class="bento-content">
            <div class="bento-tag">Conversão</div>
            <h3 class="bento-title">Lead Direto ao Ponto</h3>
            <p class="bento-desc">O interesse vira contato em segundos. Receba leads qualificados diretamente no seu WhatsApp com a identificação exata do lote desejado.</p>
          </div>
        </div>

        <!-- Realtors -->
        <div class="bento-item animate-slide-up">
          <div class="bento-content">
            <div class="bento-tag">Ecossistema</div>
            <h3 class="bento-title">Links Exclusivos para Corretores</h3>
            <p class="bento-desc">Capacite sua força de vendas com links personalizados que garantem o tracking correto de cada negociação.</p>
          </div>
        </div>

        <!-- Editor -->
        <div class="bento-item animate-slide-up">
          <div class="bento-content">
            <div class="bento-tag">Autonomia</div>
            <h3 class="bento-title">Editor Canvas Integrado</h3>
            <p class="bento-desc">Você no controle. Desenhe, edite e publique alterações no seu empreendimento sem depender de terceiros.</p>
          </div>
        </div>

        <!-- Multi-tenant -->
        <div class="bento-item animate-slide-up">
          <div class="bento-content">
            <div class="bento-tag">Escala</div>
            <h3 class="bento-title">Multi-Empreendimentos</h3>
            <p class="bento-desc">Gerencie um portfólio completo com facilidade. Troque de projeto em um clique com controle total de acesso.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features {
  padding: 100px 0;
  background-color: white;
}

.section-header {
  text-align: center;
  max-width: 800px;
  margin: 0 auto 80px;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 24px;
  letter-spacing: -1.5px;
  color: var(--gray-900);
  line-height: 1.1;
}

@media (min-width: 768px) {
  .section-title { font-size: 4rem; }
}

.section-subtitle {
  font-size: 1.25rem;
  color: var(--gray-500);
  max-width: 600px;
  margin: 0 auto;
}

.bento-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  padding: 0 20px;
}

@media (min-width: 768px) {
  .bento-grid {
    grid-template-columns: repeat(6, 1fr);
    grid-auto-rows: minmax(300px, auto);
  }
}

.bento-item {
  background-color: var(--gray-50);
  border-radius: var(--radius-xl);
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  position: relative;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid var(--gray-100);
}

.bento-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.05);
}

@media (min-width: 768px) {
  .main-feature { grid-column: span 4; grid-row: span 2; }
  .bento-item:nth-child(2) { grid-column: span 2; }
  .bento-item:nth-child(3) { grid-column: span 2; }
  .bento-item:nth-child(4) { grid-column: span 3; }
  .bento-item:nth-child(5) { grid-column: span 3; }
}

.bento-tag {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--primary);
  margin-bottom: 12px;
  letter-spacing: 0.05em;
}

.bento-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--gray-900);
  letter-spacing: -0.02em;
}

.main-feature .bento-title {
  font-size: 2rem;
}

.bento-desc {
  color: var(--gray-600);
  font-size: 1rem;
  line-height: 1.5;
}

.bento-visual {
  margin-top: 40px;
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.abstract-map {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 400px;
}

.block {
  aspect-ratio: 1;
  background-color: var(--gray-200);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.block.sold { background-color: var(--danger); opacity: 0.7; }
.block.reserved { background-color: var(--warning); opacity: 0.7; }
.block:hover { transform: scale(1.05); background-color: var(--primary); }

.text-primary { color: var(--primary); }
</style>
