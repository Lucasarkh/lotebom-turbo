<template>
  <ProjectLandingView :id="route.params.id as string" />
</template>

<script setup lang="ts">
import ProjectLandingView from '~/components/ProjectLandingView.vue'

const route = useRoute()

definePageMeta({
  layout: 'public'
})
</script>
