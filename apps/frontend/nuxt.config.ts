// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false, 
  devtools: { enabled: true },
  app: {
    head: {
      title: 'Lotio - Gestão Inteligente para Loteamentos',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/img/logo-icon.svg' }
      ]
    }
  },
  modules: ['@pinia/nuxt'],
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
      autoprefixer: {},
    },
  },
  css: [
    '@/assets/css/main.css',
    'vue3-toastify/dist/index.css',
    'primeicons/primeicons.css'
  ],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080'
    }
  },
  vite: {
    server: {
      allowedHosts: ['all']
    }
  }
})
