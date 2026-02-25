<template>
  <div class="audience-strip">
    <div class="container-landing">
      <div class="strip-content">
        <div class="strip-items">
          <span class="strip-text">Loteadoras</span>
          <span class="strip-dot"></span>
          <span class="strip-text">Incorporadoras</span>
          <span class="strip-dot"></span>
          <span class="strip-text">Imobiliárias</span>
          <span class="strip-dot"></span>
          <span class="strip-text">Corretores</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audience-strip {
  background-color: white;
  border-bottom: 1px solid var(--gray-100);
  padding: 24px 0;
  position: relative;
  z-index: 5;
}

.strip-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

.strip-items {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

@media (min-width: 768px) {
  .strip-items {
    gap: 32px;
  }
}

.strip-text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--gray-900);
  letter-spacing: -0.01em;
}

.strip-dot {
  width: 4px;
  height: 4px;
  background-color: var(--gray-200);
  border-radius: 50%;
}
</style>
