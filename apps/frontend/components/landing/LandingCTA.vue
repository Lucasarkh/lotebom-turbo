<template>
  <section class="cta">
    <div class="container-landing">
      <div class="cta-box animate-float">
        <h2 class="cta-title">Pronto para digitalizar suas vendas?</h2>
        <p class="cta-subtitle">
          Junte-se a centenas de loteadoras que já estão vendendo mais com LotSaaS.
        </p>
        <div class="cta-buttons">
          <NuxtLink to="/cadastro" class="btn btn-white btn-lg btn-rounded btn-shadow">
            Começar Agora
          </NuxtLink>
          <NuxtLink to="/login" class="btn btn-outline-white btn-lg btn-rounded">
            Acessar Painel
          </NuxtLink>
        </div>
        <div class="cta-meta">
          <span>✓ Sem cartão de crédito</span>
          <span>✓ Configure em 5 minutos</span>
          <span>✓ Suporte em português</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
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
