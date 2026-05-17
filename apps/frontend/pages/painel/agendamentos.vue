<template>
  <div class="space-y-6">
    <UiPageHeader title="Agenda" description="Gerencie visitas e monitoramento de leads com precisão.">
      <template #actions>
        <UiButton variant="secondary" :disabled="!canWriteScheduling || !filters.projectId" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="showConfig = true">
          <i class="pi pi-sliders-h"></i>
          <span>Regras</span>
        </UiButton>
        <UiButton variant="primary" :disabled="!canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="openCreateModal(null)">
          <i class="pi pi-plus"></i>
          <span>Novo Agendamento</span>
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center gap-4 rounded-xl border border-p-border bg-p-elevated p-4">
      <div class="min-w-[200px] flex-1">
        <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-p-text-muted">Empreendimento</label>
        <select v-model="filters.projectId" class="w-full rounded-lg border border-p-border bg-p-raised px-3 py-2 text-sm text-p-text focus:border-p-accent focus:outline-none" @change="loadSchedulings">
          <option value="">Todos os projetos ativos</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="min-w-[180px] flex-1">
        <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-p-text-muted">Filtrar Status</label>
        <select v-model="filters.status" class="w-full rounded-lg border border-p-border bg-p-raised px-3 py-2 text-sm text-p-text focus:border-p-accent focus:outline-none" @change="loadSchedulings">
          <option value="">Qualquer status</option>
          <option value="PENDING">Pendentes</option>
          <option value="CONFIRMED">Confirmados</option>
          <option value="CANCELLED">Cancelados</option>
          <option value="COMPLETED">Concluídos</option>
        </select>
      </div>
      <div class="ml-auto flex items-center gap-3">
        <div class="flex items-center gap-2 rounded-lg border border-p-border bg-p-raised p-1">
          <button class="flex h-8 w-8 items-center justify-center rounded-md text-p-text-secondary hover:bg-p-overlay" @click="prevMonth"><i class="pi pi-chevron-left text-xs"></i></button>
          <span class="min-w-[140px] text-center text-sm font-bold capitalize text-p-text">{{ currentMonthName }}</span>
          <button class="flex h-8 w-8 items-center justify-center rounded-md text-p-text-secondary hover:bg-p-overlay" @click="nextMonth"><i class="pi pi-chevron-right text-xs"></i></button>
        </div>
        <UiButton variant="primary" size="sm" @click="goToToday">Hoje</UiButton>
      </div>
    </div>

    <UiLoadingState v-if="loading && schedulings.length === 0" />

    <!-- Calendar -->
    <UiCard v-else padding="none">
      <div class="grid grid-cols-7 border-b border-p-border bg-p-raised/50">
        <div v-for="day in weekDays" :key="day" class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-p-text-muted">{{ day }}</div>
      </div>
      <div class="grid grid-cols-7">
        <div
          v-for="(date, idx) in calendarDays"
          :key="idx"
          class="min-h-[130px] cursor-pointer border-b border-r border-p-border p-3 transition-colors hover:bg-p-raised"
          :class="{
            'opacity-20': !isSameMonth(date, currentViewDate),
            'ring-2 ring-inset ring-p-accent': selectedDay && isSameDay(date, selectedDay),
          }"
          @click="selectDate(date)"
        >
          <div class="mb-2">
            <span
              class="inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-p-text"
              :class="{ 'bg-p-accent text-white': isToday(date) }"
            >{{ date.getDate() }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <div
              v-for="event in getDayEvents(date).slice(0, 3)"
              :key="event.id"
              class="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold"
              :class="{
                'bg-amber-500/15 text-amber-400': event.status.toLowerCase() === 'pending',
                'bg-emerald-500/15 text-emerald-400': event.status.toLowerCase() === 'confirmed',
                'bg-red-500/15 text-red-400 line-through opacity-70': event.status.toLowerCase() === 'cancelled',
              }"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
              <span>{{ formatTime(event.scheduledAt) }}</span>
              <span class="truncate">{{ event.lead?.name || 'Manual' }}</span>
            </div>
            <div v-if="getDayEvents(date).length > 3" class="pl-2 text-[11px] font-bold text-p-accent">
              + {{ getDayEvents(date).length - 3 }} atividades
            </div>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- Sidebar Panel -->
    <Transition name="panel-slide">
      <div v-if="selectedDay" class="fixed inset-y-0 right-0 z-[1000] flex w-[400px] flex-col border-l border-p-border bg-p-elevated shadow-2xl max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:h-[70vh] max-md:w-full max-md:rounded-t-2xl max-md:border-l-0 max-md:border-t">
        <div class="border-b border-p-border px-6 py-5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div>
                <div class="text-xs font-bold uppercase text-p-accent">{{ getMonthShort(selectedDay) }}</div>
                <div class="text-3xl font-extrabold leading-none text-p-text">{{ selectedDay.getDate() }}</div>
              </div>
              <div>
                <h3 class="text-lg font-extrabold capitalize text-p-text">{{ getDayLong(selectedDay) }}</h3>
                <p class="text-sm text-p-text-muted">{{ getDayEvents(selectedDay).length }} compromissos agendados</p>
              </div>
            </div>
            <button class="flex h-8 w-8 items-center justify-center rounded-full bg-p-overlay text-p-text-muted hover:text-p-text" @click="selectedDay = null">
              <i class="pi pi-times text-sm"></i>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <div v-if="getDayEvents(selectedDay).length === 0" class="py-10 text-center">
            <div class="mb-4 text-4xl"><i class="bi bi-calendar-event-fill" aria-hidden="true"></i></div>
            <h4 class="font-bold text-p-text">Agenda Livre</h4>
            <p class="mt-1 text-sm text-p-text-muted">Nenhum compromisso marcado para este dia.</p>
            <UiButton variant="primary" class="mt-4 w-full" :disabled="!canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="openCreateModal(selectedDay)">
              <i class="pi pi-plus mr-2"></i> Criar Agendamento
            </UiButton>
          </div>

          <div v-else class="flex flex-col gap-6">
            <div v-for="event in getDayEvents(selectedDay)" :key="event.id">
              <div class="mb-2 text-sm font-bold text-p-accent">{{ formatTime(event.scheduledAt) }}</div>
              <div class="rounded-xl border border-p-border bg-p-raised p-4">
                <div class="flex items-start justify-between">
                  <h4 class="font-bold text-p-text">{{ event.lead?.name || 'Agendamento Manual' }}</h4>
                  <span
                    class="rounded-md px-2 py-1 text-[11px] font-bold uppercase"
                    :class="{
                      'bg-emerald-500/15 text-emerald-400': event.status.toLowerCase() === 'confirmed',
                      'bg-amber-500/15 text-amber-400': event.status.toLowerCase() === 'pending',
                      'bg-red-500/15 text-red-400': event.status.toLowerCase() === 'cancelled',
                    }"
                  >{{ translateStatus(event.status) }}</span>
                </div>
                <div class="mb-3 mt-1 text-sm text-p-text-muted">
                  <i class="pi pi-building"></i> {{ event.project?.name }}
                </div>
                <div v-if="event.lead" class="flex flex-col gap-1.5 border-t border-p-border pt-3">
                  <a v-if="event.lead.phone" :href="'tel:' + event.lead.phone" class="flex items-center gap-2 text-sm font-semibold text-p-text no-underline">
                    <i class="pi pi-whatsapp text-p-text-muted"></i> {{ event.lead.phone }}
                  </a>
                  <span v-if="event.lead.email" class="flex items-center gap-2 text-sm font-semibold text-p-text">
                    <i class="pi pi-envelope text-p-text-muted"></i> {{ event.lead.email }}
                  </span>
                </div>
                <div v-if="event.user" class="mt-2 text-xs text-p-text-muted">Corretor: {{ event.user.name }}</div>
                <div class="mt-4 flex gap-2">
                  <UiButton v-if="event.status === 'PENDING'" variant="primary" size="sm" class="flex-1" :disabled="!canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="updateStatus(event.id, 'CONFIRMED')">Confirmar</UiButton>
                  <UiButton v-if="['PENDING', 'CONFIRMED'].includes(event.status)" variant="danger" size="sm" :disabled="!canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="updateStatus(event.id, 'CANCELLED')">Cancelar</UiButton>
                  <UiButton variant="ghost" size="sm" :disabled="!canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="deleteScheduling(event.id)">
                    <i class="pi pi-trash"></i>
                  </UiButton>
                </div>
              </div>
            </div>
            <UiButton variant="secondary" class="w-full" :disabled="!canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="openCreateModal(selectedDay)">
              <i class="pi pi-plus mr-2"></i> Novo compromisso
            </UiButton>
          </div>
        </div>
      </div>
    </Transition>

    <PainelSchedulingConfigModal
      v-if="showConfig && filters.projectId"
      :projectId="filters.projectId"
      @close="showConfig = false"
    />
    <PainelSchedulingModal
      v-if="showCreate"
      :initialDate="targetDate || undefined"
      @close="showCreate = false"
      @success="loadSchedulings"
    />
  </div>
</template>

<script setup lang="ts">
import { formatTimeToBrasilia, formatDateToBrasilia, getISODateInBrasilia } from '~/utils/date'

definePageMeta({ layout: 'painel' })

const api = useApi();
const toast = useToast();
const authStore = useAuthStore();
const canWriteScheduling = computed(() => {
  if (authStore.isLoteadora || authStore.isSysAdmin) {
    return authStore.canWriteFeature('scheduling');
  }
  return true;
});
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição';
const canLoadProjectsCatalog = computed(() => {
  return !authStore.isLoteadora || !authStore.hasPanelRestrictions || authStore.canReadFeature('projects');
});

const loading = ref(true);
type ProjectOption = {
  id: string;
  name: string;
};

type SchedulingItem = {
  id: string;
  scheduledAt: string;
  status: string;
  lead?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  project?: {
    name?: string | null;
  } | null;
  user?: {
    name?: string | null;
  } | null;
};

const projects = ref<ProjectOption[]>([]);
const schedulings = ref<any[]>([]);
const showConfig = ref(false);
const showCreate = ref(false);
const selectedDay = ref<Date | null>(null);
const targetDate = ref<string | null>(null);

const currentViewDate = ref(new Date());
const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const filters = ref({
  projectId: '',
  status: ''
});

onMounted(async () => {
    try {
        if (canLoadProjectsCatalog.value) {
          const res = await api.get('/projects');
          projects.value = Array.isArray(res) ? res : (res.data || []);
        } else {
          projects.value = [];
        }

        // Load all initially or let filters decide
        await loadSchedulings();
    } catch (e) {
        toast.error('Erro ao inicializar página');
    } finally {
        loading.value = false;
    }
});

const loadSchedulings = async () => {
   loading.value = true;
   try {
       const url = filters.value.projectId ? `/scheduling?projectId=${filters.value.projectId}` : '/scheduling';
       const res = await api.get(url);
       let data = Array.isArray(res) ? res : (res.data || []);

       if (filters.value.status) {
         schedulings.value = data.filter((s: SchedulingItem) => s.status === filters.value.status);
       } else {
          schedulings.value = data;
       }
   } catch (e) {
       toast.error('Erro ao buscar agendamentos');
   } finally {
       loading.value = false;
   }
}

// Calendar Logic
const currentMonthName = computed(() => {
   return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentViewDate.value);
});

const getMonthShort = (date: Date) => new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '');
const getDayLong = (date: Date) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);

const calendarDays = computed(() => {
   const year = currentViewDate.value.getFullYear();
   const month = currentViewDate.value.getMonth();
   const firstDayOfMonth = new Date(year, month, 1);
   const days = [];

   const startOffset = firstDayOfMonth.getDay();
   const date = new Date(year, month, 1 - startOffset);

   for (let i = 0; i < 42; i++) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
   }
   return days;
});

const isSameMonth = (d1: Date, d2: Date) => d1.getMonth() === d2.getMonth();
const isSameDay = (d1: Date, d2: Date) => {
   return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
}
const isToday = (d: Date) => isSameDay(d, new Date());

const getDayEvents = (date: Date) => {
   return schedulings.value.filter(s => {
      // Comparison in YYYY-MM-DD format (forced to Brasilia time for both)
      const sDay = getISODateInBrasilia(s.scheduledAt);
      const calendarDay = getISODateInBrasilia(date);
      return sDay === calendarDay;
   });
}

const nextMonth = () => { currentViewDate.value = new Date(currentViewDate.value.getFullYear(), currentViewDate.value.getMonth() + 1, 1); }
const prevMonth = () => { currentViewDate.value = new Date(currentViewDate.value.getFullYear(), currentViewDate.value.getMonth() - 1, 1); }
const goToToday = () => { currentViewDate.value = new Date(); selectedDay.value = new Date(); }

const selectDate = (date: Date) => { selectedDay.value = date; }

const openCreateModal = (date: Date | null) => {
   const d = date || new Date();
   const year = d.getFullYear();
   const month = (d.getMonth() + 1).toString().padStart(2, '0');
   const day = d.getDate().toString().padStart(2, '0');
   targetDate.value = `${year}-${month}-${day}T08:00`;
   showCreate.value = true;
}

const formatTime = (dateStr: string) => {
   return formatTimeToBrasilia(dateStr);
}

const translateStatus = (status: string) => {
  const map: Record<string, string> = { PENDING: 'Pendente', CONFIRMED: 'Confirmado', CANCELLED: 'Cancelado', COMPLETED: 'Concluído' };
  return map[status] || status;
}

const updateStatus = async (id: string, status: string) => {
    try {
       await api.patch(`/scheduling/${id}/status`, { status });
       toast.success('Status atualizado');
       await loadSchedulings();
    } catch (e) {
       toast.error('Erro ao atualizar status');
    }
}

const deleteScheduling = async (id: string) => {
   if (!confirm('Deseja realmente remover este agendamento?')) return;
    try {
       await api.delete(`/scheduling/${id}`);
       toast.success('Agendamento removido');
       await loadSchedulings();
    } catch (e) {
       toast.error('Erro ao remover agendamento');
    }
}
</script>

<style scoped>
.panel-slide-enter-active, .panel-slide-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.panel-slide-enter-from, .panel-slide-leave-to { transform: translateX(100px); opacity: 0; }
</style>
