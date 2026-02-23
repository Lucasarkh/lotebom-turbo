<template>
  <header :class="{ 'scrolled': isScrolled }" class="header">
    <div class="container container-landing">
      <div class="logo">
        <div class="logo-icon">L</div>
        <span class="logo-text">Lotio</span>
      </div>

      <!-- Desktop Nav -->
      <nav class="nav-desktop">
        <a href="#features" class="nav-link">Funcionalidades</a>
        <a href="#benefits" class="nav-link">Benefícios</a>
        <a href="#about" class="nav-link">Soluções</a>
        <div class="nav-divider"></div>
        
        <template v-if="!authStore.isLoggedIn">
          <NuxtLink to="/login" class="nav-link">Login</NuxtLink>
          <NuxtLink to="/cadastro" class="btn btn-primary btn-sm btn-rounded">
            Criar conta
          </NuxtLink>
        </template>
        <template v-else>
          <NuxtLink to="/painel" class="btn btn-primary btn-sm btn-rounded shadow-sm">
            Ir para o Painel
          </NuxtLink>
        </template>
      </nav>

      <!-- Mobile Nav Toggle -->
      <button class="mobile-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
        <svg v-if="!mobileMenuOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Mobile Nav Menu -->
      <Transition name="fade">
        <div v-if="mobileMenuOpen" class="nav-mobile">
          <a href="#features" class="nav-link" @click="mobileMenuOpen = false">Funcionalidades</a>
          <a href="#benefits" class="nav-link" @click="mobileMenuOpen = false">Benefícios</a>
          <a href="#about" class="nav-link" @click="mobileMenuOpen = false">Soluções</a>
          <div class="nav-divider"></div>
          
          <template v-if="!authStore.isLoggedIn">
            <NuxtLink to="/login" class="nav-link" @click="mobileMenuOpen = false">Entrar</NuxtLink>
            <NuxtLink to="/cadastro" class="btn btn-primary btn-block" @click="mobileMenuOpen = false">
              Experimente Grátis
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/painel" class="btn btn-primary btn-block" @click="mobileMenuOpen = false">
              Acessar Meu Painel
            </NuxtLink>
          </template>
        </div>
      </Transition>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const isScrolled = ref(false)
const mobileMenuOpen = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 72px;
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  background-color: transparent;
}

.header.scrolled {
  background-color: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(20px);
  height: 64px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.container-landing {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-weight: 800;
  font-size: 1.25rem;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--gray-900);
}

.nav-desktop {
  display: none;
  align-items: center;
  gap: 32px;
}

@media (min-width: 1024px) {
  .nav-desktop {
    display: flex;
  }
}

.nav-link {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--gray-700);
  transition: color 0.2s;
  cursor: pointer;
}

.nav-link:hover {
  color: var(--primary);
}

.nav-divider {
  width: 1px;
  height: 20px;
  background-color: var(--gray-200);
}

.btn-rounded {
  border-radius: 100px;
  padding: 8px 20px;
}

.mobile-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: var(--gray-800);
}

@media (min-width: 1024px) {
  .mobile-toggle {
    display: none;
  }
}

.mobile-toggle svg {
  width: 24px;
  height: 24px;
}

.nav-mobile {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  border-top: 1px solid var(--gray-100);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
