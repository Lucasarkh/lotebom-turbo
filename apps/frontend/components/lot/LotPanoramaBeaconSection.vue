<template>
  <section class="rounded-2xl border border-emerald-600/20 bg-gradient-to-b from-emerald-900/30 to-slate-900/50 p-4">
    <div class="flex justify-between gap-3 items-start mb-3">
      <div>
        <h4 style="margin-bottom: 6px;">
          <i class="bi bi-geo-alt-fill" aria-hidden="true"></i> Beacon no Panorama 360°
        </h4>
        <p class="text-sm text-slate-400/70 leading-snug max-w-[48ch]">
          Posicione um marcador neste lote no panorama 360° do empreendimento. Visitantes poderão clicar e ir direto para este lote.
        </p>
      </div>
      <span
        class="inline-flex items-center justify-center min-h-[34px] px-3 rounded-full text-xs font-bold whitespace-nowrap"
        :class="beaconExists ? 'bg-emerald-900/85 border border-emerald-500/30 text-emerald-300' : 'bg-slate-900/85 border border-slate-600/20 text-slate-200'"
      >
        {{ beaconExists ? '✓ Posicionado' : 'Não posicionado' }}
      </span>
    </div>

    <!-- Panorama selector -->
    <div class="form-group" style="margin-bottom: 10px;">
      <label style="font-size: 0.78rem; color: var(--color-surface-300);">Panorama de destino</label>
      <select v-model="selectedPanoramaId" class="form-input" @change="onPanoramaChange">
        <option value="">Selecione um panorama...</option>
        <option v-for="p in panoramas" :key="p.id" :value="p.id">{{ p.title }}</option>
      </select>
      <p v-if="!panoramas.length" style="font-size: 0.72rem; color: var(--color-surface-500); margin-top: 4px;">
        Nenhum panorama cadastrado. <NuxtLink :to="`/painel/projetos/${projectId}/panorama`" style="color: var(--color-primary-400);">Criar panorama</NuxtLink>
      </p>
    </div>

    <!-- Existing beacon info -->
    <div v-if="beaconExists && selectedPanoramaId" class="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/15">
      <div class="flex-1 text-sm text-slate-300">
        <span class="font-semibold text-emerald-300">Posicionado</span>
        <span class="text-slate-500 mx-1.5">•</span>
        <span>X: {{ ((beaconData?.x ?? 0) * 100).toFixed(0) }}% • Y: {{ ((beaconData?.y ?? 0) * 100).toFixed(0) }}%</span>
      </div>
      <button class="btn btn-xs btn-ghost" @click="openPositionModal">Reposicionar</button>
      <button class="btn btn-xs btn-ghost text-red-400 hover:text-red-300" @click="removeBeacon">Remover</button>
    </div>

    <!-- Add button -->
    <button
      v-if="!beaconExists && selectedPanoramaId"
      class="btn btn-sm w-full"
      style="background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3);"
      @click="openPositionModal"
    >
      <i class="bi bi-plus-lg" aria-hidden="true"></i> Posicionar beacon neste lote
    </button>
    <p v-if="!beaconExists && !selectedPanoramaId && panoramas.length" style="font-size: 0.78rem; color: var(--color-surface-400);">
      Selecione um panorama acima para posicionar o beacon.
    </p>

    <!-- Position Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
        <div class="modal-content" style="max-width: 740px; max-height: 85vh;">
          <h2>Posicionar Beacon no Panorama</h2>
          <p style="font-size: 0.82rem; color: var(--color-surface-400); margin-bottom: 12px;">
            Clique na imagem para posicionar o marcador do lote "{{ lotLabel }}".
          </p>

          <div
            v-if="targetPanoramaImageUrl"
            ref="canvasRef"
            class="beacon-position-canvas"
            @click="onCanvasClick"
          >
            <img
              :src="targetPanoramaImageUrl"
              class="beacon-position-image"
              draggable="false"
              @load="onCanvasImageLoad"
            />
            <div
              v-if="previewPos"
              class="beacon-position-preview"
              :style="previewStyle"
            >
              <div class="beacon-position-dot"></div>
              <span class="beacon-position-label">{{ lotLabel }}</span>
            </div>
          </div>
          <div v-else style="padding: 32px; text-align: center; color: var(--color-surface-400);">
            O panorama selecionado não possui imagens (snapshots). Adicione uma imagem no editor de panorama primeiro.
          </div>

          <div class="modal-actions" style="justify-content: space-between;">
            <span v-if="previewPos" style="font-size: 0.78rem; color: var(--color-surface-300);">
              X: {{ (previewPos.x * 100).toFixed(0) }}% • Y: {{ (previewPos.y * 100).toFixed(0) }}%
            </span>
            <span v-else></span>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-ghost" @click="showModal = false">Cancelar</button>
              <button class="btn btn-primary" :disabled="!previewPos || saving" @click="saveBeacon">
                {{ saving ? 'Salvando...' : 'Confirmar Posição' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePanoramaApi } from '~/composables/panorama/usePanoramaApi'
import { useApi } from '~/composables/useApi'
import { useToast } from '~/composables/useToast'
import type { Panorama } from '~/composables/panorama/types'

const props = defineProps<{
  projectId: string
  lotId: string
  lotLabel: string
}>()

const emit = defineEmits<{
  changed: []
}>()

const api = usePanoramaApi()
const { fetchApi } = useApi()
const toast = useToast()

// ── State ───────────────────────────────────────────
const panoramas = ref<Panorama[]>([])
const selectedPanoramaId = ref('')
const beaconData = ref<{ id: string; x: number; y: number } | null>(null)
const showModal = ref(false)
const saving = ref(false)

// Canvas state
const canvasRef = ref<HTMLElement | null>(null)
const previewPos = ref<{ x: number; y: number } | null>(null)
const canvasW = ref(1200)
const canvasH = ref(800)

// ── Computed ────────────────────────────────────────
const beaconExists = computed(() => beaconData.value !== null)

const targetPanorama = computed(() =>
  panoramas.value.find(p => p.id === selectedPanoramaId.value) ?? null
)

const targetPanoramaImageUrl = computed(() => {
  const pano = targetPanorama.value
  if (!pano || !pano.snapshots.length) return null
  // Use last snapshot (most recent)
  return pano.snapshots[pano.snapshots.length - 1]?.imageUrl ?? null
})

const previewStyle = computed(() => {
  if (!previewPos.value) return {}
  return {
    left: `${previewPos.value.x * 100}%`,
    top: `${previewPos.value.y * 100}%`,
  }
})

// ── Init ────────────────────────────────────────────
async function loadPanoramas() {
  try {
    panoramas.value = await api.getPanoramas(props.projectId)
  } catch { /* ignore */ }
}

async function loadBeaconForLot() {
  if (!props.lotId || !selectedPanoramaId.value) {
    beaconData.value = null
    return
  }
  try {
    // Fetch the panorama to get its beacons and find one linked to this lot
    const pano = await api.getPanorama(selectedPanoramaId.value)
    const beacon = pano.beacons.find(b => b.linkLotId === props.lotId)
    if (beacon) {
      beaconData.value = { id: beacon.id, x: beacon.x, y: beacon.y }
    } else {
      beaconData.value = null
    }
  } catch {
    beaconData.value = null
  }
}

function onPanoramaChange() {
  loadBeaconForLot()
}

function openPositionModal() {
  previewPos.value = beaconData.value
    ? { x: beaconData.value.x, y: beaconData.value.y }
    : { x: 0.5, y: 0.5 }
  showModal.value = true
}

function onCanvasImageLoad(e: Event) {
  const img = e.target as HTMLImageElement
  canvasW.value = img.naturalWidth
  canvasH.value = img.naturalHeight
}

function onCanvasClick(e: MouseEvent) {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
  previewPos.value = { x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 }
}

async function saveBeacon() {
  if (!previewPos.value || !selectedPanoramaId.value) return
  saving.value = true
  try {
    if (beaconData.value) {
      // Update existing beacon
      await api.updateBeacon(beaconData.value.id, {
        x: previewPos.value.x,
        y: previewPos.value.y,
      })
      beaconData.value = { ...beaconData.value, ...previewPos.value }
      toast.success('Beacon reposicionado!')
    } else {
      // Create new beacon linked to this lot
      const created = await api.createBeacon(selectedPanoramaId.value, {
        title: props.lotLabel || 'Lote',
        x: previewPos.value.x,
        y: previewPos.value.y,
        style: 'default',
        visible: true,
        linkType: 'LOT',
        linkLotId: props.lotId,
      })
      beaconData.value = { id: created.id, x: created.x, y: created.y }
      toast.success('Beacon criado no panorama!')
    }
    showModal.value = false
    emit('changed')
  } catch (e: any) {
    toast.error(e.message || 'Erro ao salvar beacon')
  } finally {
    saving.value = false
  }
}

async function removeBeacon() {
  if (!beaconData.value) return
  if (!confirm('Remover este beacon do panorama?')) return
  try {
    await api.deleteBeacon(beaconData.value.id)
    beaconData.value = null
    toast.success('Beacon removido.')
    emit('changed')
  } catch (e: any) {
    toast.error(e.message || 'Erro ao remover beacon')
  }
}

// Load panoramas on mount
loadPanoramas()
</script>

<style scoped>
.beacon-position-canvas {
  position: relative;
  width: 100%;
  cursor: crosshair;
  border-radius: 12px;
  overflow: hidden;
  background: #111;
  margin-bottom: 16px;
}

.beacon-position-image {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
}

.beacon-position-preview {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.beacon-position-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.8);
  border: 2.5px solid #fff;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
  animation: beacon-pulse 1.2s infinite;
}

@keyframes beacon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.25); }
}

.beacon-position-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #fff;
  background: rgba(0, 0, 0, 0.75);
  padding: 3px 10px;
  border-radius: 6px;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

/* Reuse modal styles from PanoramaEditor */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
}

.modal-content h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.modal-content .btn {
  border-radius: 10px;
  font-weight: 700;
}

.modal-content .btn-ghost {
  background: rgba(148, 163, 184, 0.24);
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.44);
}

.modal-content .btn-ghost:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.36);
}

.modal-content .btn-primary {
  background: #2563eb;
  color: #f8fafc;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
}

.modal-content .btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
  box-shadow: 0 10px 22px rgba(29, 78, 216, 0.42);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  display: block;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-surface-200);
  margin-bottom: 4px;
}

.form-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 8px;
  font-size: 0.85rem;
  background: rgba(15, 23, 42, 0.88);
  color: #f8fafc;
}
</style>
