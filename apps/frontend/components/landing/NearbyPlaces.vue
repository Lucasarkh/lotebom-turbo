<template>
  <section v-if="visible && groupedItems.length" class="v4-section" id="proximidades">
    <div class="v4-container">
      <div class="v4-section-header center">
        <h2 class="v4-section-title">Proximidades</h2>
        <p class="v4-section-subtitle" style="max-width: 600px; margin: 0 auto;">
          Distâncias estimadas a partir do endereço do empreendimento.
        </p>
      </div>

      <div class="nearby-grid">
        <div v-for="group in groupedItems" :key="group.category" class="nearby-category">
          <div class="nearby-category-header">
            <span class="nearby-category-icon">{{ categoryIcon(group.category) }}</span>
            <h3 class="nearby-category-title">{{ group.categoryLabel }}</h3>
          </div>

          <div class="nearby-items">
            <div v-for="item in group.items" :key="item.name" class="nearby-item">
              <div class="nearby-item-info">
                <span class="nearby-item-name">{{ item.name }}</span>
                <span class="nearby-item-meta">
                  {{ item.distanceLabel }}
                  <template v-if="item.drivingLabel"> · {{ item.drivingLabel }} de carro</template>
                  <template v-if="item.walkingLabel"> · {{ item.walkingLabel }} a pé</template>
                </span>
              </div>
              <a
                :href="item.routeUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="nearby-route-btn"
                title="Ver rota no Google Maps"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                <span>Ver rota</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{
  projectSlug: string
}>()

interface NearbyItem {
  category: string
  categoryLabel: string
  name: string
  distanceLabel: string
  drivingLabel: string | null
  walkingLabel: string | null
  shortAddress: string | null
  routeUrl: string
}

interface NearbyResponse {
  enabled: boolean
  center: { lat: number; lng: number } | null
  radiusMeters: number
  items: NearbyItem[]
}

const data = ref<NearbyResponse | null>(null)
const visible = computed(() => data.value?.enabled && data.value?.items?.length > 0)

const groupedItems = computed(() => {
  if (!data.value?.items?.length) return []
  
  const groups: Record<string, { category: string; categoryLabel: string; items: NearbyItem[] }> = {}
  
  for (const item of data.value.items) {
    if (!groups[item.category]) {
      groups[item.category] = {
        category: item.category,
        categoryLabel: item.categoryLabel,
        items: [],
      }
    }
    groups[item.category].items.push(item)
  }
  
  return Object.values(groups)
})

const ICONS: Record<string, string> = {
  school: '🎓',
  supermarket: '🛒',
  pharmacy: '💊',
  hospital: '🏥',
  park: '🌳',
  restaurant: '🍽️',
  gym: '🏋️',
  shopping_mall: '🛍️',
}

const categoryIcon = (category: string) => ICONS[category] || '📍'

onMounted(async () => {
  try {
    const config = useRuntimeConfig()
    const baseUrl = `${config.public.apiBase}/api`
    const res = await fetch(`${baseUrl}/p/${props.projectSlug}/nearby`, {
      credentials: 'include',
    })
    if (res.ok) {
      data.value = await res.json()
    }
  } catch {
    // Silently ignore — section just won't show
  }
})
</script>

<style scoped>
.nearby-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 32px;
  margin-top: 48px;
}

.nearby-category {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.nearby-category-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.nearby-category-icon {
  font-size: 1.3rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.nearby-category-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0;
}

.nearby-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nearby-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
}

.nearby-item:not(:last-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.nearby-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.nearby-item-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #1d1d1f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nearby-item-meta {
  font-size: 0.75rem;
  color: #86868b;
  line-height: 1.3;
}

.nearby-route-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 0.72rem;
  font-weight: 500;
  color: #0071e3;
  background: rgba(0, 113, 227, 0.06);
  border-radius: 8px;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s;
  flex-shrink: 0;
}

.nearby-route-btn:hover {
  background: rgba(0, 113, 227, 0.12);
}

.nearby-route-btn svg {
  width: 13px;
  height: 13px;
}

/* Dark section variant (if inside dark bg) */
:deep(.v4-section[style*="background: #1d1d1f"]) .nearby-category-title,
:deep(.v4-section[style*="background:#1d1d1f"]) .nearby-category-title {
  color: white;
}

/* Responsive */
@media (max-width: 640px) {
  .nearby-grid {
    grid-template-columns: 1fr;
    gap: 20px;
    margin-top: 32px;
  }

  .nearby-category {
    padding: 20px;
  }

  .nearby-route-btn span {
    display: none;
  }

  .nearby-route-btn {
    padding: 8px;
    border-radius: 50%;
  }
}
</style>
