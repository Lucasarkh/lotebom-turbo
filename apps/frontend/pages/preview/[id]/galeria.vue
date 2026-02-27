<template>
  <ProjectGalleryView :id="route.params.id as string" />
</template>

<script setup lang="ts">
import ProjectGalleryView from '~/components/ProjectGalleryView.vue'

const route = useRoute()

definePageMeta({
  layout: 'public'
})
</script>
