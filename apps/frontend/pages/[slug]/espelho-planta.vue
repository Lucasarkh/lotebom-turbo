<template>
  <ProjectPlantMirrorView :slug="route.params.slug as string" />
</template>

<script setup lang="ts">
import ProjectPlantMirrorView from '~/components/ProjectPlantMirrorView.vue'

const route = useRoute()

definePageMeta({
  layout: false,
})
</script>
