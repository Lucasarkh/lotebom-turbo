<template>
  <section v-if="visible" class="v4-section v4-section-alt" id="proximidades">
    <div class="v4-container">
      <div class="v4-section-header center">
        <h2 class="v4-section-title">Proximidades do Empreendimento</h2>
        <p class="v4-section-subtitle">
          Distâncias estimadas a partir do endereço do empreendimento.
        </p>
      </div>

      <div class="nearby-categories">
        <div v-for="group in groupedItems" :key="group.category" class="nearby-category">
          <div class="nearby-category-header">
            <span class="nearby-category-icon">
              <i :class="['bi', categoryIcon(group.category)]" aria-hidden="true"></i>
            </span>
            <h3 class="nearby-category-title">{{ group.categoryLabel }}</h3>
          </div>

          <div class="nearby-items">
            <a
              v-for="item in group.items"
              :key="item.name"
              :href="item.routeUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="nearby-item"
              :title="`Ver rota para ${item.name}`"
            >
              <span class="nearby-item-name">{{ item.name }}</span>
              <span class="nearby-item-distance">{{ item.distanceLabel }}</span>
              <span class="nearby-item-meta">
                <span v-if="item.drivingLabel" class="nearby-chip">
                  <i class="bi bi-car-front-fill" aria-hidden="true"></i> {{ item.drivingLabel }}
                </span>
                <span v-if="item.walkingLabel" class="nearby-chip">
                  <i class="bi bi-person-walking" aria-hidden="true"></i> {{ item.walkingLabel }}
                </span>
              </span>
            </a>
          </div>
        </div>
      </div>

      <div class="nearby-attribution">
        <svg class="nearby-google-icon" viewBox="0 0 24 24" width="16" height="16">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>Informações de localização fornecidas pelo Google Maps</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps<{
  projectSlug: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
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

const { fetchPublic } = usePublicApi()
const data = ref<NearbyResponse | null>(null)
const visible = computed(() => !!(data.value?.enabled && data.value?.items?.length))

watch(visible, (val) => emit('update:visible', val), { immediate: true })

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
    groups[item.category]!.items.push(item)
  }

  return Object.values(groups)
})

const ICONS: Record<string, string> = {
  school: 'bi-mortarboard-fill',
  supermarket: 'bi-cart-fill',
  pharmacy: 'bi-capsule',
  hospital: 'bi-hospital-fill',
  park: 'bi-tree-fill',
  restaurant: 'bi-fork-knife',
  gym: 'bi-activity',
  shopping_mall: 'bi-bag-fill',
}

const categoryIcon = (category: string) => ICONS[category] || 'bi-geo-alt-fill'

async function loadNearby() {
  if (!props.projectSlug) return
  try {
    data.value = await fetchPublic(`/p/${props.projectSlug}/nearby`)
  } catch {
    // Section won't show
  }
}

onMounted(loadNearby)
watch(() => props.projectSlug, loadNearby)
</script>

<style scoped>
.v4-container {
  max-width: 1040px;
  margin: 0 auto;
  padding: 0 20px;
  box-sizing: border-box;
}

.v4-section-header {
  margin-bottom: 40px;
  max-width: 800px;
}

.v4-section-header.center {
  margin-inline: auto;
  text-align: center;
}

.v4-section-title {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.003em;
  line-height: 1.1;
  margin-bottom: 12px;
  color: var(--v4-text, #1d1d1f);
}

.v4-section-subtitle {
  font-size: 17px;
  line-height: 1.38105;
  color: var(--v4-text-muted, #86868b);
  font-weight: 400;
}

/* ========================================
   Category sections
   ======================================== */
.nearby-categories {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.nearby-category-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.nearby-category-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  font-size: 1.1rem;
  color: var(--v4-text, #1d1d1f);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
}

.nearby-category-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--v4-text, #1d1d1f);
  margin: 0;
  letter-spacing: -0.01em;
}

/* ========================================
   Items grid — mobile first (2 cols)
   ======================================== */
.nearby-items {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

/* ========================================
   Individual item
   ======================================== */
.nearby-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  padding: 12px 14px;
  text-decoration: none;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  height: 100%;
}

.nearby-item:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
  border-color: rgba(0, 0, 0, 0.12);
}

.nearby-item-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--v4-text, #1d1d1f);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.nearby-item-distance {
  font-size: 17px;
  font-weight: 700;
  color: var(--v4-text, #1d1d1f);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.nearby-item-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 8px;
}

.nearby-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  font-size: 11px;
  color: var(--v4-text-muted, #86868b);
  white-space: nowrap;
}

.nearby-chip i {
  font-size: 10px;
}

/* ========================================
   Tablet (≥ 640px) — 4 cols
   ======================================== */
@media (min-width: 640px) {
  .v4-container {
    padding: 0 40px;
  }

  .v4-section-title {
    font-size: 36px;
  }

  .v4-section-subtitle {
    font-size: 19px;
  }

  .v4-section-header {
    margin-bottom: 48px;
  }

  .nearby-items {
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }

  .nearby-item {
    padding: 14px 16px;
  }

  .nearby-item-name {
    font-size: 14px;
  }

  .nearby-item-distance {
    font-size: 18px;
  }
}

/* ========================================
   Desktop (≥ 960px) — 6 cols
   ======================================== */
@media (min-width: 960px) {
  .v4-section-title {
    font-size: 40px;
  }

  .v4-section-subtitle {
    font-size: 21px;
  }

  .v4-section-header {
    margin-bottom: 56px;
  }

  .nearby-categories {
    gap: 40px;
  }

  .nearby-items {
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
  }
}

/* ========================================
   Google attribution
   ======================================== */
.nearby-attribution {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 13px;
  color: var(--v4-text-muted, #86868b);
}

.nearby-google-icon {
  flex-shrink: 0;
}
</style>
