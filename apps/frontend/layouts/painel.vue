<template>
  <div class="painel-layout min-h-screen bg-p-base text-p-text">
    <!-- Top Navbar -->
    <nav class="fixed top-0 left-0 right-0 z-50 h-14 border-b border-p-border bg-p-raised/95 backdrop-blur-sm">
      <div class="flex h-full items-center justify-between px-4">
        <div class="flex items-center gap-3">
          <!-- Hamburger (mobile) -->
          <button
            type="button"
            class="rounded-lg p-1.5 -ml-1.5 text-p-text-secondary hover:bg-p-overlay hover:text-p-text transition-colors md:hidden"
            @click="sidebarOpen = !sidebarOpen"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!sidebarOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <NuxtLink :to="homeRoute" class="flex items-center">
            <img src="/img/logo-white.svg" alt="Lotio" class="h-6" />
          </NuxtLink>
          <span class="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 bg-p-accent/10 text-p-accent">
            {{ roleLabel }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/painel/notificacoes"
            class="relative rounded-lg p-2 text-p-text-secondary hover:bg-p-overlay hover:text-p-text transition-colors"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span v-if="unreadCount > 0" class="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-p-danger px-1 text-[10px] font-bold text-white">
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
          </NuxtLink>
          <span class="hidden sm:block text-sm text-p-text-secondary">{{ authStore.user?.name }}</span>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-p-text-muted hover:text-p-danger transition-colors"
            @click="handleLogout"
          >
            Sair
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-black/60 md:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <div class="pt-14">
      <div class="flex w-full">
        <!-- Sidebar -->
        <aside
          class="fixed left-0 top-14 bottom-0 z-40 w-64 flex flex-col border-r border-p-border bg-p-raised transition-transform duration-200 md:translate-x-0 overflow-y-auto"
          :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
        >
          <!-- User card -->
          <div class="border-b border-p-border px-4 py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-p-accent/15 text-p-accent text-xs font-bold">
                {{ initials }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-p-text">{{ authStore.user?.name }}</p>
                <p class="truncate text-xs text-p-text-muted">{{ roleLabel }}</p>
              </div>
            </div>
          </div>

          <!-- Navigation -->
          <nav class="flex-1 px-3 py-4">
            <div class="space-y-1">
              <!-- Dashboard -->
              <NuxtLink
                v-if="showDashboardEntry"
                :to="homeRoute"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                :class="isActive(homeRoute)
                  ? 'bg-p-accent/10 text-p-accent'
                  : 'text-p-text-secondary hover:bg-p-overlay hover:text-p-text'"
                @click="sidebarOpen = false"
              >
                <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                <span>Dashboard</span>
              </NuxtLink>

              <!-- Notifications -->
              <NuxtLink
                to="/painel/notificacoes"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                :class="isActive('/painel/notificacoes')
                  ? 'bg-p-accent/10 text-p-accent'
                  : 'text-p-text-secondary hover:bg-p-overlay hover:text-p-text'"
                @click="sidebarOpen = false"
              >
                <div class="relative">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-p-danger" />
                </div>
                <span class="flex-1">Notificações</span>
                <span v-if="unreadCount > 0" class="rounded-full bg-p-danger/15 px-2 py-0.5 text-[11px] font-bold text-p-danger">
                  {{ unreadCount > 99 ? '99+' : unreadCount }}
                </span>
              </NuxtLink>

              <!-- SYSADMIN Menu -->
              <template v-if="authStore.isSysAdmin">
                <div class="pt-4 pb-1 px-3">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Administração</span>
                </div>
                <NavItem to="/painel/tenants" label="Loteadoras" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M4 21v-4m5 4v-4m5 4v-4m5 4v-4m-11-7a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2z"/></svg>
                </NavItem>
                <NavItem to="/painel/mensagens" label="Mensagens" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </NavItem>
                <NavItem to="/painel/configuracoes" label="Configurações" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </NavItem>
                <NavItem to="/painel/backups" label="Backups" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </NavItem>
              </template>

              <!-- LOTEADORA Menu -->
              <template v-if="authStore.isLoteadora">
                <div class="pt-4 pb-1 px-3">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Gestão</span>
                </div>
                <NavItem v-if="authStore.canReadFeature('projects')" to="/painel/projetos" label="Projetos" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('projects')" to="/painel/reservas" label="Reservas" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 7V3.5A1.5 1.5 0 019.5 2h5A1.5 1.5 0 0116 3.5V7"/><path d="M5 7h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('leads')" to="/painel/leads" label="Leads" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('distribution')" to="/painel/distribuicao" label="Distribuição" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('scheduling')" to="/painel/agendamentos" label="Agendamentos" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('agencies')" to="/painel/imobiliarias" label="Imobiliárias" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M4 21v-4m5 4v-4m5 4v-4m5 4v-4m-11-7a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2z"/></svg>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('realtors')" to="/painel/corretores" label="Corretores" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('payments')" to="/painel/pagamentos" label="Pagamentos" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('campaigns')" to="/painel/campanhas" label="Campanhas" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 10V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h3l-1 5h2l1-5h4l4 4V6l-4 4z"/></svg>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('ai')" to="/painel/ai" label="Assistente IA" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8zm-1-11a1 1 0 112 0v2a1 1 0 01-2 0V9zm1 7a1 1 0 100-2 1 1 0 000 2z"/></svg>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('signupLinks')" to="/painel/links-cadastro" label="Links de Cadastro" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('metrics') || authStore.isCorretor" to="/painel/metricas" label="Métricas" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </NavItem>
              </template>

              <!-- CORRETOR Menu -->
              <template v-if="authStore.isCorretor">
                <div class="pt-4 pb-1 px-3">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Minha Área</span>
                </div>
                <NavItem to="/painel/leads" label="Meus Leads" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                </NavItem>
                <NavItem to="/painel/meus-links" label="Meus Links" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                </NavItem>
                <NavItem to="/painel/reservar" label="Reservar Lote" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                </NavItem>
                <NavItem to="/painel/agendamentos" label="Agendamentos" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </NavItem>
                <NavItem to="/painel/campanhas" label="Campanhas" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 15h2m-2-4h2m-2-4h2M9 21h6a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                </NavItem>
                <NavItem to="/painel/metricas" label="Métricas" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </NavItem>
              </template>

              <!-- IMOBILIARIA Menu -->
              <template v-if="authStore.isImobiliaria">
                <div class="pt-4 pb-1 px-3">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Equipe</span>
                </div>
                <NavItem to="/painel/leads" label="Leads da Equipe" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                </NavItem>
                <NavItem to="/painel/corretores" label="Minha Equipe" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                </NavItem>
                <NavItem to="/painel/reservar" label="Reservar Lote" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                </NavItem>
                <NavItem to="/painel/agendamentos" label="Agendamentos" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </NavItem>
                <NavItem to="/painel/metricas-imobiliaria" label="Métricas da Equipe" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                </NavItem>
              </template>

              <!-- Common: User Management -->
              <template v-if="authStore.canManageUsers">
                <div class="pt-4 pb-1 px-3">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Configurações</span>
                </div>
                <NavItem to="/painel/usuarios" label="Gerenciar Usuários" @click="sidebarOpen = false">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </NavItem>
              </template>

              <!-- Common: Support & Profile -->
              <div class="pt-4 pb-1 px-3">
                <span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Conta</span>
              </div>
              <NavItem to="/painel/suporte" label="Suporte" @click="sidebarOpen = false">
                <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </NavItem>
              <NavItem to="/painel/perfil" label="Meu Perfil" @click="sidebarOpen = false">
                <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </NavItem>
            </div>
          </nav>
        </aside>

        <!-- Main content -->
        <main class="min-w-0 flex-1 px-4 py-6 md:ml-64 md:px-8 md:py-8">
          <slot />
        </main>
      </div>
    </div>

    <!-- Terms Acceptance Modal -->
    <CommonTermsAcceptanceModal
      :visible="showTermsModal"
      @accepted="onTermsAccepted"
      @declined="onTermsDeclined"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const { success: toastSuccess } = useToast()
const sidebarOpen = ref(false)
const homeRoute = computed(() => authStore.getDashboardRoute())
const showDashboardEntry = computed(() => !(authStore.isLoteadora && authStore.hasPanelRestrictions))

const { unreadCount, startPolling, stopPolling } = useNotifications()

onMounted(() => {
  if (authStore.isLoggedIn) startPolling(60000)
})
onUnmounted(() => stopPolling())

useHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

// Terms acceptance modal
const showTermsModal = computed(() => {
  return authStore.isLoggedIn && !authStore.hasAcceptedTerms
})

const onTermsAccepted = () => {
  toastSuccess('Termos aceitos com sucesso!')
}

const onTermsDeclined = async () => {
  const { fetchApi } = useApi()
  try { await fetchApi('/auth/logout', { method: 'POST' }) } catch {}
  authStore.logout()
  toastSuccess('Sessão encerrada')
  router.push('/login')
}

const initials = computed(() => {
  const n = authStore.user?.name ?? ''
  if (!n) return '?'
  const parts = n.split(' ').filter(Boolean)
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase()
})

const roleLabel = computed(() => {
  const map = {
    SYSADMIN: 'System Admin',
    LOTEADORA: authStore.hasPanelRestrictions ? 'Usuário do sistema' : 'Loteadora',
    IMOBILIARIA: 'Imobiliária',
    CORRETOR: 'Corretor'
  }
  return map[authStore.user?.role] ?? 'Usuário'
})

const handleLogout = async () => {
  const { fetchApi } = useApi()
  try { await fetchApi('/auth/logout', { method: 'POST' }) } catch {}
  authStore.logout()
  toastSuccess('Sessão encerrada')
  sidebarOpen.value = false
  router.push('/login')
}

function isActive(to) {
  if (to === '/painel' || to === '/painel/') return route.path === '/painel' || route.path === '/painel/'
  return route.path.startsWith(to)
}

// Close sidebar on route change (mobile)
watch(() => route.path, () => {
  sidebarOpen.value = false
})

// NavItem functional component
const NavItem = defineComponent({
  props: {
    to: { type: String, required: true },
    label: { type: String, required: true },
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () => h(
      resolveComponent('NuxtLink'),
      {
        to: props.to,
        class: [
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive(props.to)
            ? 'bg-p-accent/10 text-p-accent'
            : 'text-p-text-secondary hover:bg-p-overlay hover:text-p-text'
        ],
        onClick: () => emit('click')
      },
      () => [slots.default?.(), h('span', null, props.label)]
    )
  }
})
</script>
