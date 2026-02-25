<template>
  <div class="public-layout">
    <slot />
    <ClientOnly>
      <AiChatWidget :project="chatStore.currentProject" />
    </ClientOnly>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useTenantStore } from '~/stores/tenant'
import { useAiChatStore } from '~/stores/aiChat'
import AiChatWidget from '~/components/ai/ChatWidget.vue'
const tenantStore = useTenantStore()
const chatStore = useAiChatStore()

onMounted(() => {
  if (tenantStore.config?.project) {
    chatStore.setProject(tenantStore.config.project)
  }
})

watch(() => tenantStore.config?.project, (newProject) => {
  if (newProject) {
    chatStore.setProject(newProject)
  }
})
</script>

<style scoped>
.public-layout {
  min-height: 100vh;
  background: var(--gray-50);
}
</style>
