<template>
  <div
    v-if="corretor"
    class="v4-trust-bar"
    :class="{ 'v4-trust-bar--with-prelaunch': showWithPreLaunch }"
  >
    <div class="v4-container">
      <div class="v4-trust-inner">
        <div class="v4-trust-person">
          <div class="v4-trust-avatar">
            <img v-if="corretor.photoUrl || corretor.profileImageUrl || corretor.avatarUrl" :src="corretor.photoUrl || corretor.profileImageUrl || corretor.avatarUrl" :alt="corretor.name" />
            <span v-else class="v4-avatar-placeholder">{{ corretor.name[0] }}</span>
          </div>
          <div class="v4-trust-info">
            <span class="v4-trust-label">Atendimento Exclusivo</span>
            <strong class="v4-trust-name v4-trust-name--desktop">{{ corretor.name }}</strong>
            <span class="v4-trust-name v4-trust-name--mobile">Seu corretor: <strong>{{ corretor.name?.split(' ')[0] }}</strong></span>
            <span v-if="corretor.creci" class="v4-trust-creci">CRECI {{ corretor.creci }}</span>
          </div>
        </div>
        <div class="v4-trust-actions">
          <a v-if="corretor.phone" :href="`https://wa.me/${corretor.phone.replace(/\D/g,'')}`" target="_blank" class="v4-trust-btn v4-trust-btn--whatsapp" @click="tracking.trackWhatsappClick({ realtorName: corretor.name })">
            <span class="v4-whatsapp-text">WhatsApp</span>
            <svg class="v4-whatsapp-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </a>
          <a :href="primaryHref || '#contato'" class="v4-trust-btn v4-trust-btn--primary" @click="tracking.trackClick(trackingLabel)">
            <span>{{ primaryInterestLabel }}</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTracking } from '~/composables/useTracking'

const props = defineProps<{
  corretor: any
  showWithPreLaunch: boolean
  primaryInterestLabel: string
  trackingLabel: string
  primaryHref?: string
  stickyOffset?: number
}>()

const tracking = useTracking()

</script>

<style scoped>
.v4-trust-bar {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0,0,0,0.05);
  padding: 12px 0;
  position: sticky;
  top: var(--v4-trust-offset, 0px);
  z-index: 100;
  box-shadow: 0 4px 30px rgba(0,0,0,0.03);
}

.v4-trust-bar--with-prelaunch {
  top: calc(var(--v4-trust-offset, 0px) + 86px);
}

.v4-trust-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.v4-trust-person {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.v4-trust-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: #f5f5f7;
  border: 1px solid var(--v4-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.v4-trust-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.v4-avatar-placeholder {
  line-height: 1;
  font-size: 18px;
  font-weight: 700;
  color: var(--v4-primary);
  text-transform: uppercase;
}

.v4-trust-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.v4-trust-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--v4-text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.v4-trust-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--v4-text);
}

.v4-trust-name--mobile {
  display: none;
}

.v4-trust-creci {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--v4-text-muted);
  overflow-wrap: anywhere;
}

.v4-trust-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
}

.v4-trust-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  transition: all 0.2s;
}

.v4-trust-btn--whatsapp { background: #25d366; color: white; }
.v4-trust-btn--primary { background: var(--v4-primary); color: white; }

.v4-whatsapp-icon { display: none; }

/* Mobile overrides */
@media (max-width: 768px) {
  .v4-trust-bar { padding: 8px 0; box-shadow: none; border-bottom: 1px solid rgba(0,0,0,0.06); }
  .v4-trust-bar--with-prelaunch { top: var(--v4-trust-offset, 0px); }

  .v4-trust-inner { gap: 12px; }
  .v4-trust-person { gap: 10px; }
  .v4-trust-avatar { width: 32px; height: 32px; border: 1px solid rgba(0,0,0,0.08); }
  .v4-avatar-placeholder { font-size: 13px; }

  .v4-trust-label { display: none; }
  .v4-trust-name--desktop { display: none; }
  .v4-trust-name--mobile { display: block; font-size: 12px; font-weight: 400; }
  .v4-trust-name--mobile strong { font-weight: 700; }
  .v4-trust-creci { font-size: 10px; }

  .v4-trust-actions { gap: 6px; flex-wrap: nowrap; }
  .v4-whatsapp-text { display: none; }
  .v4-whatsapp-icon { display: block; }
  .v4-trust-btn--whatsapp { width: 32px; height: 32px; padding: 0; }
  .v4-trust-btn--primary { padding: 7px 12px; font-size: 11px; height: 32px; }
  .v4-trust-btn { border-radius: 100px; }
}
</style>
