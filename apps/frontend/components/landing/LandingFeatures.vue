<template>
  <section id="features" class="features">
    <div class="container-landing">
      <div class="section-header">
        <h2 class="section-title">Tecnologia que acelera o seu <span class="text-primary">sucesso</span>.</h2>
        <p class="section-subtitle">
          Nossa plataforma foi construída ouvindo as reais necessidades de quem está no campo vendendo.
        </p>
      </div>

      <div class="features-grid">
        <!-- Feature 1: Mapas -->
        <div class="feature-card">
          <div class="feature-icon-wrapper blue">
            <svg class="feature-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A2 2 0 013 15.382V5.618a2 2 0 011.553-1.944L9 1.236m0 18.764l5.447-2.724A2 2 0 0015 15.382V5.618a2 2 0 00-1.553-1.944L9 1.236m0 18.764V1.236m6 14.41l5.447-2.724A2 2 0 0021 11.056V1.282a2 2 0 00-1.553-1.944L15 2.056"/>
            </svg>
          </div>
          <h3 class="feature-title">Mapas Interativos</h3>
          <p class="feature-description">
            Suba o mapa do seu empreendimento e torne-o interativo. Status em tempo real para clientes e corretores.
          </p>
        </div>

        <!-- Feature 2: Leads -->
        <div class="feature-card">
          <div class="feature-icon-wrapper green">
            <svg class="feature-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <h3 class="feature-title">Captura & Gestão de Leads</h3>
          <p class="feature-description">
            O cliente se interessou? Ele clica e você recebe o WhatsApp ou E-mail com a identificação exata do lote.
          </p>
        </div>

        <!-- Feature 3: Realtors -->
        <div class="feature-card">
          <div class="feature-icon-wrapper purple">
            <svg class="feature-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
          </div>
          <h3 class="feature-title">Links para Corretores</h3>
          <p class="feature-description">
            Crie links exclusivos para que seus corretores possam divulgar sem medo de perder a reserva para outro.
          </p>
        </div>

        <!-- Feature 4: Editor -->
        <div class="feature-card">
          <div class="feature-icon-wrapper orange">
            <svg class="feature-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </div>
          <h3 class="feature-title">Editor Canvas Integrado</h3>
          <p class="feature-description">
            Desenhe ruas, blocos e lotes diretamente no navegador. Tecnologia de ponta para sua engenharia.
          </p>
        </div>

        <!-- Feature 5: Multi-tenant -->
        <div class="feature-card">
          <div class="feature-icon-wrapper red">
            <svg class="feature-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <h3 class="feature-title">Dashboard Multi-Projeto</h3>
          <p class="feature-description">
            Gerencie um ou cem empreendimentos. Controle de acesso total para sua equipe e parceiros comerciais.
          </p>
        </div>

        <!-- Feature 6: Performance -->
        <div class="feature-card">
          <div class="feature-icon-wrapper teal">
            <svg class="feature-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h3 class="feature-title">Respostas Instantâneas</h3>
          <p class="feature-description">
            Infraestrutura em cluster e escalonamento em segundos. Seu mapa carrega rápido em qualquer conexão.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features {
  padding: 120px 0;
  background-color: white;
}

.section-header {
  text-align: center;
  max-width: 800px;
  margin: 0 auto 80px;
}

.section-title {
  font-size: 2.25rem;
  font-weight: 800;
  margin-bottom: 20px;
  letter-spacing: -1px;
}

@media (min-width: 768px) {
  .section-title { font-size: 3.5rem; }
}

.section-subtitle {
  font-size: 1.1rem;
  color: var(--gray-600);
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

@media (min-width: 640px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .features-grid { grid-template-columns: repeat(3, 1fr); }
}

.feature-card {
  padding: 40px;
  border-radius: 24px;
  background-color: var(--gray-50);
  transition: all 0.3s;
  border: 1px solid transparent;
}

.feature-card:hover {
  background-color: white;
  border-color: var(--primary-50);
  box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.1);
  transform: translateY(-5px);
}

.feature-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.feature-icon { width: 28px; height: 28px; }

.blue { background-color: #ebf5ff; color: #2563eb; }
.green { background-color: #ecfdf5; color: #10b981; }
.purple { background-color: #f5f3ff; color: #7c3aed; }
.orange { background-color: #fff7ed; color: #f97316; }
.red { background-color: #fef2f2; color: #ef4444; }
.teal { background-color: #f0fdfa; color: #0d9488; }

.feature-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--gray-900);
}

.feature-description {
  color: var(--gray-600);
  font-size: 0.95rem;
  line-height: 1.7;
}
</style>
