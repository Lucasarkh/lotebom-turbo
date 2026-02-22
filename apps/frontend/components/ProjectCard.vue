<template>
  <div class="project-card" @click="$emit('click')">
    <div v-if="project.bannerImageUrl" class="project-card-banner">
      <img :src="project.bannerImageUrl" :alt="project.name" />
    </div>
    <div v-else class="project-card-banner-placeholder">
      <span class="icon">🏗️</span>
    </div>
    
    <div class="project-card-content">
      <div class="project-card-header">
        <div class="project-card-info">
          <h3 class="project-card-title">{{ project.name }}</h3>
          <p class="project-card-subtitle">{{ subtitle || project.description || 'Sem descrição' }}</p>
        </div>
        <span class="badge" :class="project.status === 'PUBLISHED' ? 'badge-success' : 'badge-neutral'">
          {{ project.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho' }}
        </span>
      </div>
      
      <div class="project-card-meta">
        <div class="meta-item">
          <span class="meta-icon">🗺️</span>
          <span>{{ project._count?.mapElements ?? 0 }} elementos</span>
        </div>
        <div class="meta-item">
          <span class="meta-icon">👥</span>
          <span>{{ project._count?.leads ?? 0 }} leads</span>
        </div>
        <div v-if="showDate" class="meta-item ml-auto">
          <span>Criado {{ formatDate(project.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  project: {
    type: Object,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  showDate: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const formatDate = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('pt-BR')
}
</script>

<style scoped>
.project-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--gray-200);
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 20px -10px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-200);
}

.project-card:hover .project-card-title {
  color: var(--primary);
}

.project-card-banner {
  height: 140px;
  width: 100%;
  overflow: hidden;
  background: var(--gray-100);
}

.project-card-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.project-card:hover .project-card-banner img {
  transform: scale(1.05);
}

.project-card-banner-placeholder {
  height: 140px;
  width: 100%;
  background-color: var(--gray-50);
  background-image: radial-gradient(var(--gray-200) 0.5px, transparent 0.5px), radial-gradient(var(--gray-200) 0.5px, var(--gray-50) 0.5px);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-card-banner-placeholder .icon {
  font-size: 2rem;
  opacity: 0.5;
}

.project-card-content {
  padding: var(--space-4);
  flex: 1;
  display: flex;
  flex-direction: column;
}

.project-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.project-card-info {
  flex: 1;
  min-width: 0;
}

.project-card-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0 0 var(--space-1) 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-card-subtitle {
  font-size: 0.875rem;
  color: var(--gray-500);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-card-meta {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: 0.8125rem;
  color: var(--gray-500);
  border-top: 1px solid var(--gray-100);
  padding-top: var(--space-3);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.meta-icon {
  font-size: 1rem;
}

.ml-auto {
  margin-left: auto;
}

.badge {
  flex-shrink: 0;
}
</style>
