<template>
  <footer class="footer">
    <div class="container-landing">
      <div class="footer-top">
        <div class="footer-brand">
          <div class="logo">
            <div class="logo-icon">L</div>
            <span class="logo-text">Lotio</span>
          </div>
          <p class="footer-desc">
            A plataforma definitiva para incorporadoras, loteadoras e corretores.
            Gestão de vendas e mapas interativos em um só lugar.
          </p>
        </div>

        <div class="footer-links">
          <div class="link-group">
            <h4 class="link-title">Plataforma</h4>
            <NuxtLink to="/painel" class="link-item">Painel</NuxtLink>
            <NuxtLink to="/login" class="link-item">Login</NuxtLink>
            <NuxtLink to="/cadastro" class="link-item">Cadastro</NuxtLink>
          </div>
          <div class="link-group">
            <h4 class="link-title">Soluções</h4>
            <a href="#" class="link-item">Incorporadoras</a>
            <a href="#" class="link-item">Loteadoras</a>
            <a href="#" class="link-item">Imobiliárias</a>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="copyright">&copy; {{ new Date().getFullYear() }} Lotio. Todos os direitos reservados.</p>
        <div class="footer-policy">
          <a href="#">Privacidade</a>
          <a href="#">Cookies</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background-color: var(--gray-900);
  color: white;
  padding: 80px 0 40px;
}

.footer-top {
  display: flex;
  flex-direction: column;
  gap: 60px;
  margin-bottom: 60px;
}

@media (min-width: 1024px) {
  .footer-top {
    flex-direction: row;
    justify-content: space-between;
  }
}

.footer-brand {
  max-width: 320px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
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
  color: white;
  font-weight: 800;
  font-size: 1.5rem;
}

.footer-desc {
  color: var(--gray-400);
  margin-top: 0;
  font-size: 1rem;
}

.social-links {
  display: flex;
  gap: 16px;
}

.social-link {
  color: var(--gray-400);
  transition: color 0.2s;
}

.social-link:hover {
  color: white;
}

.social-link svg {
  width: 24px;
  height: 24px;
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 40px;
}

@media (min-width: 640px) {
  .footer-links {
    grid-template-columns: repeat(3, 1fr);
  }
}

.link-title {
  color: white;
  margin-bottom: 24px;
  font-size: 1rem;
}

.link-item {
  display: block;
  color: var(--gray-400);
  text-decoration: none;
  margin-bottom: 12px;
  font-size: 0.95rem;
  transition: color 0.2s;
}

.link-item:hover {
  color: var(--primary);
}

.footer-bottom {
  padding-top: 40px;
  border-top: 1px solid var(--gray-800);
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  text-align: center;
}

@media (min-width: 768px) {
  .footer-bottom {
    flex-direction: row;
    justify-content: space-between;
    text-align: left;
  }
}

.copyright {
  color: var(--gray-500);
  font-size: 0.9rem;
}

.footer-policy {
  display: flex;
  gap: 24px;
}

.footer-policy a {
  color: var(--gray-500);
  font-size: 0.9rem;
  text-decoration: none;
}
</style>
