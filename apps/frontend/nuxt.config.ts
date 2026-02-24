// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false, 
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  css: [
    '@/assets/css/main.css',
    'vue3-toastify/dist/index.css',
    'primeicons/primeicons.css'
  ],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080'
    }
  }
})
