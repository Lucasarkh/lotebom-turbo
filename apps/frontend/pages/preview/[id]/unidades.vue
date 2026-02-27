<template>
  <ProjectUnitsView :id="route.params.id as string" />
</template>

<script setup lang="ts">
import ProjectUnitsView from '~/components/ProjectUnitsView.vue'

const route = useRoute()

definePageMeta({
  layout: 'public'
})
</script>
