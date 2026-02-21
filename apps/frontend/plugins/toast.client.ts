import Vue3Toastify, { type ToastContainerOptions } from 'vue3-toastify'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Vue3Toastify, {
    autoClose: 3000,
    position: 'top-right',
    theme: 'colored',
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    transition: 'slide'
  } as ToastContainerOptions)
})
