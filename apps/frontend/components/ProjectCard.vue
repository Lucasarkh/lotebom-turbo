<template>
  <div class="project-card" @click="$emit('click')">
    <div class="project-card__image">
      <img v-if="project.bannerImageUrl" :src="project.bannerImageUrl" :alt="project.name" referrerpolicy="no-referrer" />
      <div v-else class="project-card__placeholder">
        <span style="font-size: 2rem;">🏗️</span>
      </div>
      <div v-if="project.status === 'PUBLISHED'" class="project-card__badge project-card__badge--published">
        Publicado
      </div>
    </div>
    <div class="project-card__content">
      <h3 class="project-card__title">{{ project.name }}</h3>
      <p class="project-card__slug">/{{ project.slug }}</p>
      <div class="project-card__footer">
        <span class="project-card__date" v-if="showDate">{{ formatDate(project.createdAt) }}</span>
        <div class="project-card__stats">
          <span title="Leads">👥 {{ project._count?.leads || 0 }}</span>
          <span title="Elementos">📍 {{ project._count?.mapElements || 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  project: { type: Object, required: true },
  showDate: { type: Boolean, default: false }
})

defineEmits(['click'])

const formatDate = (d) => formatDateToBrasilia(d)
</script>

<style scoped>
.project-card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.08);
  border-color: var(--primary);
}

.project-card__image {
  height: 140px;
  position: relative;
  background: var(--gray-50);
}

.project-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-card__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
}

.project-card__badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  backdrop-filter: blur(4px);
}

.project-card__badge--published {
  background: rgba(34, 197, 94, 0.9);
  color: white;
}

.project-card__content {
  padding: var(--space-4);
  flex: 1;
  display: flex;
  flex-direction: column;
}

.project-card__title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 4px;
  color: var(--gray-900);
}

.project-card__slug {
  font-size: 0.8125rem;
  color: var(--gray-500);
  margin-bottom: var(--space-4);
  font-family: var(--font-mono);
}

.project-card__footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-3);
  border-top: 1px solid var(--gray-100);
}

.project-card__date {
  font-size: 0.75rem;
  color: var(--gray-400);
}

.project-card__stats {
  display: flex;
  gap: 12px;
  font-size: 0.8125rem;
  color: var(--gray-600);
  font-weight: 500;
}
</style>
