<template>
  <div></div>
</template>

<script setup>
const authStore = useAuthStore()
navigateTo(authStore.isLoggedIn ? '/painel' : '/login')
</script>
