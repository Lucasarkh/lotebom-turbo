<template>
  <div class="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-[2000] p-5">
    <div class="bg-p-elevated w-full max-w-[520px] rounded-xl shadow-2xl flex flex-col border border-p-border">
      <div class="px-8 py-6 border-b border-p-border flex justify-between items-center">
        <h2 class="text-lg font-semibold text-p-text m-0">Configurações de Agendamento</h2>
        <button class="bg-transparent border-none text-2xl text-p-text-muted cursor-pointer p-1 leading-none transition-colors duration-200 hover:text-p-text" @click="$emit('close')">&times;</button>
      </div>

      <div class="flex flex-col gap-8 px-8 py-6 overflow-y-auto max-h-[calc(100vh-14rem)]">
        <UiLoadingState v-if="loading" text="Sincronizando configurações..." />

        <div v-else class="flex flex-col gap-8">
          <fieldset :disabled="!canWriteScheduling" class="contents">
          <!-- Seção: Ativação -->
          <section class="bg-p-overlay border border-p-border p-6 rounded-lg flex justify-between items-center gap-5">
            <div>
              <h3 class="text-base font-semibold text-p-text m-0 mb-1">Agendamentos Públicos</h3>
              <p class="text-sm text-p-text-muted m-0 leading-relaxed">Habilite a reserva de horários diretamente pelos clientes no seu portal.</p>
            </div>
            <label class="relative inline-block w-12 h-[26px] shrink-0">
              <input v-model="config.enabled" type="checkbox" class="opacity-0 w-0 h-0 peer">
              <span class="absolute cursor-pointer inset-0 bg-white/15 rounded-full transition-all duration-300 peer-checked:bg-blue-600 before:content-[''] before:absolute before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition-all before:duration-300 before:shadow-sm peer-checked:before:translate-x-[22px]"></span>
            </label>
          </section>

          <!-- Seção: Horários -->
          <section class="flex flex-col gap-4">
            <header>
              <h4 class="text-[0.825rem] font-semibold text-p-text-muted uppercase tracking-wide m-0">Janela de Atendimento</h4>
            </header>

            <div class="grid grid-cols-2 gap-5">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium text-p-text">Início</label>
                <input v-model="config.startTime" type="time" class="w-full h-11 px-4 bg-p-raised border border-p-border rounded-lg text-[0.95rem] text-p-text transition-all duration-200 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25">
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium text-p-text">Término</label>
                <input v-model="config.endTime" type="time" class="w-full h-11 px-4 bg-p-raised border border-p-border rounded-lg text-[0.95rem] text-p-text transition-all duration-200 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25">
              </div>
            </div>
          </section>

          <!-- Seção: Regras -->
          <section class="flex flex-col gap-4">
            <header>
              <h4 class="text-[0.825rem] font-semibold text-p-text-muted uppercase tracking-wide m-0">Regras de Reserva</h4>
            </header>

            <div class="grid grid-cols-2 gap-5">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium text-p-text">Intervalo entre Visitas</label>
                <select v-model="config.scheduleInterval" class="w-full h-11 px-4 bg-p-raised border border-p-border rounded-lg text-[0.95rem] text-p-text transition-all duration-200 outline-none appearance-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25">
                  <option :value="15">15 minutos</option>
                  <option :value="30">30 minutos</option>
                  <option :value="45">45 minutos</option>
                  <option :value="60">1 hora</option>
                  <option :value="90">1 hora e 30 min</option>
                  <option :value="120">2 horas</option>
                </select>
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium text-p-text">Atendimentos Simultâneos</label>
                <input v-model.number="config.maxSimultaneous" type="number" class="w-full h-11 px-4 bg-p-raised border border-p-border rounded-lg text-[0.95rem] text-p-text transition-all duration-200 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25" min="1">
              </div>
            </div>
          </section>

          <!-- Seção: Intervalos e Pausas -->
          <section class="flex flex-col gap-4">
            <header>
              <h4 class="text-[0.825rem] font-semibold text-p-text-muted uppercase tracking-wide m-0">Intervalos e Pausas</h4>
            </header>

            <div class="grid grid-cols-2 gap-5">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium text-p-text">Almoço (Início)</label>
                <input v-model="config.lunchStart" type="time" class="w-full h-11 px-4 bg-p-raised border border-p-border rounded-lg text-[0.95rem] text-p-text transition-all duration-200 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25">
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium text-p-text">Almoço (Fim)</label>
                <input v-model="config.lunchEnd" type="time" class="w-full h-11 px-4 bg-p-raised border border-p-border rounded-lg text-[0.95rem] text-p-text transition-all duration-200 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25">
              </div>
            </div>

            <!-- Custom Breaks -->
            <div class="mt-4">
              <header class="flex justify-between items-center mb-3">
                <span class="text-[0.8rem] font-semibold text-p-text-muted">Outras Pausas</span>
                <button class="bg-transparent border-none text-blue-600 text-xs font-semibold cursor-pointer p-0" @click="addBreak">+ Adicionar</button>
              </header>

              <div v-for="(b, idx) in (config.breaks || [])" :key="idx"
                   class="flex items-center gap-2 bg-p-overlay p-2 rounded-lg mb-2 border border-p-border">
                <input v-model="b.name" placeholder="Motivo" class="flex-[2] h-8 text-[0.8rem] px-2 bg-p-raised border border-p-border rounded-lg text-p-text outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25">
                <input v-model="b.start" type="time" class="flex-1 h-8 text-[0.8rem] px-2 bg-p-raised border border-p-border rounded-lg text-p-text outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25">
                <span class="text-[10px] text-p-text-muted">até</span>
                <input v-model="b.end" type="time" class="flex-1 h-8 text-[0.8rem] px-2 bg-p-raised border border-p-border rounded-lg text-p-text outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25">
                <button class="bg-transparent border-none text-red-500 text-xl cursor-pointer px-1 leading-none" @click="removeBreak(idx)">&times;</button>
              </div>
            </div>
          </section>

          <!-- Seção: Calendário -->
          <section class="flex flex-col gap-4">
            <header>
              <h4 class="text-[0.825rem] font-semibold text-p-text-muted uppercase tracking-wide m-0">Dias de Operação</h4>
            </header>

            <div class="flex gap-2 justify-between">
              <label v-for="day in dayOptions" :key="day.value" class="flex-1 cursor-pointer">
                <input v-model="config.availableDays" type="checkbox" :value="day.value" class="hidden peer">
                <div class="h-10 flex items-center justify-center bg-p-raised border border-p-border rounded-lg text-xs font-medium text-p-text-muted transition-all duration-200 hover:border-p-border-hover peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-checked:text-white peer-checked:font-semibold">{{ day.label }}</div>
              </label>
            </div>
            <footer class="text-xs text-p-text-muted mt-1">
              Os horários serão gerados automaticamente para os dias selecionados.
            </footer>
          </section>
          </fieldset>
        </div>
      </div>

      <div class="px-8 py-5 bg-p-elevated border-t border-p-border flex gap-3 justify-end">
        <UiButton variant="secondary" @click="$emit('close')">Cancelar</UiButton>
        <UiButton variant="primary" :loading="saving" :disabled="saving || !canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="save">
          Salvar Configurações
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  projectId: string;
}>();

const emit = defineEmits(['close', 'updated']);
const api = useApi();
const toast = useToast();
const authStore = useAuthStore();
const canWriteScheduling = computed(() => authStore.canWriteFeature('scheduling'));
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição';

const loading = ref(true);
const saving = ref(false);
const config = ref({
  enabled: false,
  startTime: '08:00',
  endTime: '18:00',
  scheduleInterval: 60,
  maxSimultaneous: 1,
  availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  lunchStart: '',
  lunchEnd: '',
  breaks: [] as any[]
});

const dayOptions = [
  { label: 'Dom', value: 'SUN' },
  { label: 'Seg', value: 'MON' },
  { label: 'Ter', value: 'TUE' },
  { label: 'Qua', value: 'WED' },
  { label: 'Qui', value: 'THU' },
  { label: 'Sex', value: 'FRI' },
  { label: 'Sáb', value: 'SAT' },
];

onMounted(async () => {
  try {
    const data = await api.get(`/scheduling/config/${props.projectId}`);
    if (data) config.value = {
      ...config.value,
      ...data,
      breaks: Array.isArray(data.breaks) ? data.breaks : []
    };
  } catch (e) {
    toast.error('Erro ao carregar configurações');
  } finally {
    loading.value = false;
  }
});

const addBreak = () => {
  if (!canWriteScheduling.value) return
  if (!config.value.breaks) config.value.breaks = [];
  config.value.breaks.push({ name: '', start: '', end: '' });
}

const removeBreak = (idx: number) => {
  if (!canWriteScheduling.value) return
  config.value.breaks.splice(idx, 1);
}

const save = async () => {
  if (!canWriteScheduling.value) return
  saving.value = true;
  try {
    // Destructuring to remove read-only/metadata fields that backend might reject
    const { id, projectId, createdAt, updatedAt, ...updateData } = config.value as any;

    await api.patch(`/scheduling/config/${props.projectId}`, updateData);
    toast.success('Configurações salvas com sucesso');
    emit('updated');
    emit('close');
  } catch (e) {
    toast.error('Erro ao salvar configurações');
  } finally {
    saving.value = false;
  }
};
</script>
