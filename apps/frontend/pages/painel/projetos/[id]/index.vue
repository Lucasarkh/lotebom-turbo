<template>
  <div>
    <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" style="margin-top: var(--space-4);" @click="loadProject">Tentar novamente</button>
    </div>

    <template v-else-if="project">
      <div class="page-header" style="border-bottom: 1px solid var(--gray-100); padding-bottom: var(--space-6); margin-bottom: var(--space-8);">
        <div style="flex: 1;">
          <div class="flex items-center gap-2" style="margin-bottom: var(--space-1);">
            <NuxtLink to="/painel/projetos" class="btn btn-ghost btn-sm" style="padding-left: 0; color: var(--gray-500);">← Projetos</NuxtLink>
            <div style="width: 1px; height: 10px; background: var(--gray-200);"></div>
            <span class="badge" :class="project.status === 'PUBLISHED' ? 'badge-success' : 'badge-neutral'" style="font-size: 0.6rem; letter-spacing: 0.05em; text-transform: uppercase;">
              {{ project.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho' }}
            </span>
          </div>
          <h1 style="margin: 0; font-size: 1.75rem; letter-spacing: -0.02em;">{{ project.name }}</h1>
          <p style="margin: 0; color: var(--gray-500); font-weight: 500;">{{ project.description || 'Sem descrição' }}</p>
        </div>

        <div class="flex items-center gap-4">
          <a
            v-if="project.status === 'PUBLISHED'"
            :href="`/${project.slug}`"
            target="_blank"
            class="btn btn-sm btn-primary"
            style="border-radius: var(--radius-full); padding-left: var(--space-5); padding-right: var(--space-5); height: 38px;"
          >
            <span style="font-size: 1rem;">🌐</span>
            <span>Ver Página Pública</span>
          </a>

          <NuxtLink
            v-else
            :to="`/preview/${project.id}`"
            target="_blank"
            class="btn btn-sm btn-secondary"
            style="border-radius: var(--radius-full); padding-left: var(--space-5); padding-right: var(--space-5); height: 38px;"
          >
            <span style="font-size: 1rem;">👀</span>
            <span>Link de Preview</span>
          </NuxtLink>

          <div style="width: 1px; height: 24px; background: var(--gray-200);"></div>

          <div class="flex items-center gap-2">
            <button 
              v-if="authStore.canEdit" 
              class="btn btn-sm" 
              :class="project.status === 'PUBLISHED' ? 'btn-secondary' : 'btn-success'" 
              style="border-radius: var(--radius-full); padding-left: var(--space-5); padding-right: var(--space-5); height: 38px;"
              @click="togglePublish"
            >
              <span>{{ project.status === 'PUBLISHED' ? '⏸️ Parar Publicação' : '📡 Publicar Agora' }}</span>
            </button>
            
            <button 
              v-if="authStore.canEdit" 
              class="btn btn-sm btn-danger" 
              style="border-radius: var(--radius-full); padding-left: var(--space-4); padding-right: var(--space-4); height: 38px;"
              @click="confirmDelete"
            >
              <span>🗑️ Excluir</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs / Navigation -->
      <div class="flex items-center justify-between gap-4" style="margin-bottom: var(--space-8);">
        <div class="filter-bar">
          <button 
            v-for="t in tabs" 
            :key="t.key" 
            class="filter-btn" 
            :class="{ active: activeTab === t.key }" 
            @click="activeTab = t.key"
          >
            {{ t.label }}
          </button>
        </div>

        <div style="width: 1px; height: 24px; background: var(--gray-200); align-self: center;"></div>

        <div class="filter-bar" style="background: var(--gray-200);">
          <!-- Planta Interativa — main visual tool -->
          <NuxtLink :to="`/painel/projetos/${projectId}/planta`" class="filter-btn filter-btn-primary active" style="text-decoration: none;">
            🗺️ Planta Interativa
          </NuxtLink>
          <!-- Panorama 360° -->
          <NuxtLink :to="`/painel/projetos/${projectId}/panorama`" class="filter-btn filter-btn-dark active" style="text-decoration: none;">
            🌄 Panorama 360°
          </NuxtLink>
        </div>
      </div>

      <!-- Tab: Configurações -->
      <div v-if="activeTab === 'settings'">
        <div class="card" style="max-width: 600px;">
          <form @submit.prevent="saveSettings">
            <div class="form-group">
              <label class="form-label">Nome</label>
              <input v-model="editForm.name" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Slug</label>
              <input v-model="editForm.slug" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Descrição</label>
              <textarea v-model="editForm.description" class="form-textarea" rows="3"></textarea>
            </div>
            <div v-if="authStore.isSysAdmin" class="form-group">
              <label class="form-label">Domínio Customizado (Somente SysAdmin)</label>
              <input v-model="editForm.customDomain" class="form-input" placeholder="ex: vendas.meu-loteamento.com" />
              <small class="text-muted">Informe o domínio completo ou subdomínio que aponta para cá.</small>
            </div>
            <div class="form-group" style="display:flex; align-items:center; gap: var(--space-2); margin-top: var(--space-4); margin-bottom: var(--space-5);">
              <input type="checkbox" v-model="editForm.showPaymentConditions" id="chkShowPayment" style="width:18px; height:18px; cursor:pointer;" />
              <label for="chkShowPayment" class="form-label" style="margin-bottom:0; cursor:pointer; font-weight:600;">Exibir tabela de financiamento nas páginas dos lotes</label>
            </div>
            <div v-if="settingsError" class="alert alert-error">{{ settingsError }}</div>
            <div v-if="settingsSaved" class="alert alert-success">Salvo com sucesso!</div>
            <button type="submit" class="btn btn-primary" :disabled="savingSettings">{{ savingSettings ? 'Salvando...' : 'Salvar' }}</button>
          </form>
        </div>
      </div>

      <!-- Tab: Pagamentos -->
      <div v-if="activeTab === 'payment'">
        <div class="card" style="max-width: 800px;">
          <h3>💳 Ativar Gateways de Pagamento</h3>
          <p class="text-muted">Selecione abaixo quais perfis de pagamento globais você deseja habilitar para este projeto.</p>
          
          <div v-if="loadingPaymentOptions" class="flex justify-center p-8">
             <div class="loader"></div>
          </div>

          <div v-else-if="allConfigs.length === 0" class="empty-state" style="padding: 24px;">
            <p>Nenhum perfil de pagamento configurado globalmente.</p>
            <NuxtLink to="/painel/pagamentos" class="btn btn-primary btn-sm">Criar Primeiro Perfil</NuxtLink>
          </div>

          <div v-else class="grid gap-4" style="margin-top: 24px;">
            <div v-for="config in allConfigs" :key="config.id" 
                 class="flex items-center justify-between p-4 border rounded-lg"
                 :style="{ borderColor: isConfigActive(config.id) ? 'var(--primary)' : 'var(--gray-200)', background: isConfigActive(config.id) ? 'var(--primary-light)' : 'white' }">
              <div class="flex items-center gap-3">
                <div class="provider-badge-sm" :class="config.provider.toLowerCase()">{{ config.provider }}</div>
                <div>
                  <div style="font-weight: 600;">{{ config.name }}</div>
                  <div style="font-size: 0.75rem; color: var(--gray-500);">ID: {{ config.id.split('-')[0] }}...</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span style="font-size: 0.8rem; font-weight: 600;" :style="{ color: isConfigActive(config.id) ? 'var(--primary)' : 'var(--gray-400)' }">
                  {{ isConfigActive(config.id) ? 'Habilitado' : 'Desabilitado' }}
                </span>
                <div class="toggle-switch">
                  <input type="checkbox" :checked="isConfigActive(config.id)" @change="toggleGateway(config.id, !isConfigActive(config.id))" :id="'config-'+config.id" />
                  <label :for="'config-'+config.id"></label>
                </div>
              </div>
            </div>
          </div>

          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 32px; border: 1px solid var(--gray-200);">
            <h4 style="margin: 0 0 8px 0; font-size: 0.9rem; color: var(--gray-700);">Como funciona?</h4>
            <p style="font-size: 0.8rem; margin: 0; color: var(--gray-600); line-height: 1.5;">
              As chaves e credenciais são gerenciadas na página global de <b>Pagamentos</b>. 
              Aqui você apenas decide qual conta receberá os pagamentos deste projeto específico. 
              Se múltiplos gateways forem habilitados, o sistema usará o primeiro ativo.
            </p>
          </div>

          <!-- NEW: Reservation Fee Config -->
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--gray-200);">
            <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span>🎟️</span> Taxa de Reserva Online
            </h3>
            <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 24px;">Configure o valor que o cliente deve pagar para reservar um lote online via cartão ou PIX.</p>
            
            <div class="grid grid-cols-2 gap-6">
              <div class="form-group">
                <label class="form-label">Tipo de Cobrança</label>
                <select v-model="editForm.reservationFeeType" class="form-input">
                  <option value="FIXED">Valor Fixo (R$)</option>
                  <option value="PERCENTAGE">Porcentagem do Valor do Lote (%)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">
                  {{ editForm.reservationFeeType === 'FIXED' ? 'Valor da Reserva (R$)' : 'Porcentagem da Reserva (%)' }}
                </label>
                <input v-model="editForm.reservationFeeValue" type="number" step="0.01" class="form-input" 
                       :placeholder="editForm.reservationFeeType === 'FIXED' ? 'Ex: 500.00' : 'Ex: 0.5'" />
                <small v-if="editForm.reservationFeeType === 'PERCENTAGE'" style="color: var(--gray-500); font-size: 0.75rem;">
                  Ex: 0.5 = 0,5% do valor total do lote.
                </small>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-6" style="margin-top: 16px;">
              <div class="form-group">
                <label class="form-label">Tempo de Expiração da Reserva (Horas)</label>
                <input v-model.number="editForm.reservationExpiryHours" type="number" class="form-input" placeholder="Ex: 24" />
                <small class="text-muted">Tempo que o lote ficará reservado aguardando confirmação (manual ou pagamento). Padrão: 24h.</small>
              </div>
            </div>
            
            <div class="flex justify-end" style="margin-top: 20px;">
              <button class="btn btn-primary" @click="saveSettings" :disabled="savingSettings" style="min-width: 200px;">
                {{ savingSettings ? 'Salvando...' : '💾 Salvar Configuração de Taxa' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: AI -->
      <div v-if="activeTab === 'ai'">
        <div class="card" style="max-width: 600px;">
          <h3 style="margin-bottom: var(--space-4); display: flex; align-items: center; gap: 8px;">
            <span>🤖</span> Assistente de IA
          </h3>
          <p class="text-muted" style="font-size: 0.85rem; margin-bottom: var(--space-6);">
            Habilite um assistente virtual para ajudar clientes interessados. A IA responderá perguntas sobre lotes, disponibilidade e preços de acordo com os dados deste projeto.
          </p>

          <div class="form-group" style="display:flex; align-items:center; gap: var(--space-2); margin-bottom: var(--space-6);">
            <input type="checkbox" v-model="editForm.aiEnabled" id="chkAiEnabled" style="width:20px; height:20px; cursor:pointer;" />
            <label for="chkAiEnabled" style="font-weight: 600; cursor:pointer;">Ativar assistente de IA para este projeto</label>
          </div>

          <div v-if="editForm.aiEnabled">
            <div class="form-group">
              <label class="form-label">Modelo de Assistente (Configuração de IA)</label>
              <select v-model="editForm.aiConfigId" class="form-input">
                <option value="">Selecione uma configuração...</option>
                <option v-for="c in aiConfigs" :key="c.id" :value="c.id">{{ c.name }} ({{ c.model }})</option>
              </select>
              <small class="text-muted">As configurações de modelos e chaves de API são feitas na página <NuxtLink to="/painel/ai">Assistente IA</NuxtLink>.</small>
            </div>
            
            <div v-if="aiConfigs.length === 0" style="background: #fff5f5; color: #c53030; padding: 12px; border-radius: 8px; font-size: 0.85rem; margin-top: 12px; border: 1px solid #feb2b2;">
              ⚠️ Você ainda não tem nenhuma configuração de IA cadastrada. <NuxtLink to="/painel/ai" style="color: #c53030; font-weight: 700;">Clique aqui para criar</NuxtLink>.
            </div>

            <div v-else-if="!editForm.aiConfigId" style="background: #ebf8ff; color: #2b6cb0; padding: 12px; border-radius: 8px; font-size: 0.85rem; margin-top: 12px; border: 1px solid #bee3f8;">
              ℹ️ Selecione um modelo acima para habilitar o chat na página pública deste projeto.
            </div>
          </div>

          <div class="flex justify-end" style="margin-top: var(--space-8); padding-top: var(--space-4); border-top: 1px solid var(--gray-100);">
            <button class="btn btn-primary" @click="saveSettings" :disabled="savingSettings">
              {{ savingSettings ? 'Salvando...' : '💾 Salvar Configurações de IA' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Tab: Financiamento -->
      <div v-if="activeTab === 'financing'" class="financing-layout-v4">
        <div class="card" style="flex: 1; max-width: 800px;">
          <h3 style="margin-bottom: var(--space-2); display: flex; align-items: center; gap: 8px;">
            <span>🧮</span> Regras de Simulação Financeira
          </h3>
          <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 24px;">Configure as regras padrão para o simulador que aparece na página dos lotes.</p>

          <div class="form-group" style="display:flex; align-items:center; gap: var(--space-2); margin-bottom: 32px; background: #fffbeb; padding: 16px; border-radius: 12px; border: 1px solid #fde68a;">
            <input type="checkbox" v-model="editForm.showPaymentConditions" id="chkShowSimOnFinancing" style="width:20px; height:20px; cursor:pointer;" />
            <label for="chkShowSimOnFinancing" style="font-weight: 700; cursor:pointer; color: #92400e;">✅ Habilitar Simulador nas Páginas Públicas</label>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div class="form-group">
              <label class="form-label">Entrada Mínima (%)</label>
              <input v-model.number="editForm.minDownPaymentPercent" type="number" class="form-input" placeholder="Ex: 10" />
            </div>
            <div class="form-group">
              <label class="form-label">Entrada Mínima Fixa (R$)</label>
              <input v-model.number="editForm.minDownPaymentValue" type="number" class="form-input" placeholder="Ex: 15000" />
              <small class="text-muted">Se preenchido, o sistema usará o maior entre % e Valor Fixo.</small>
            </div>
            <div class="form-group">
              <label class="form-label">Número Máximo de Parcelas</label>
              <input v-model.number="editForm.maxInstallments" type="number" class="form-input" placeholder="Ex: 180" />
            </div>
            <div class="form-group">
              <label class="form-label">Taxa de Juros Mensal (%)</label>
              <input v-model.number="editForm.monthlyInterestRate" type="number" step="0.01" class="form-input" placeholder="Ex: 0.9" />
            </div>
            <div class="form-group">
              <label class="form-label">Indexador de Correção</label>
              <input v-model="editForm.indexer" class="form-input" placeholder="Ex: IGP-M, IPCA..." />
            </div>
            <div class="form-group">
              <label class="form-label">Parcelas Intermediárias (Balões)</label>
              <div style="display:flex; align-items:center; gap: var(--space-2); height: 42px;">
                <input type="checkbox" v-model="editForm.allowIntermediary" id="chkInter" style="width:18px; height:18px; cursor:pointer;" />
                <label for="chkInter" style="margin:0; cursor:pointer; font-weight:600;">Permitir cálculo de balões anuais</label>
              </div>
            </div>
          </div>

          <div class="form-group" style="margin-top: 16px;">
            <label class="form-label">Aviso Legal (Disclaimer)</label>
            <textarea v-model="editForm.financingDisclaimer" class="form-textarea" rows="2"></textarea>
            <small class="text-muted">Aparecerá abaixo do resultado da simulação.</small>
          </div>

          <div class="flex justify-end" style="margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--gray-200);">
            <button class="btn btn-primary" @click="saveSettings" :disabled="savingSettings" style="min-width: 200px;">
              {{ savingSettings ? 'Salvando...' : '💾 Salvar Regras Financeiras' }}
            </button>
          </div>
        </div>

        <!-- LIVE PREVIEW SIDEBAR -->
        <div class="financing-preview-sidebar">
          <div class="preview-header">
            <h4>👀 Preview em Tempo Real</h4>
            <p>Assim é como o simulador aparece na página pública</p>
          </div>

          <div class="simulator-card-v4">
            <div class="sim-header" style="background: #eff6ff;">
              <div class="h-item">
                <span class="l" style="font-weight: 700; color: #3b82f6;">Valor do Lote (Simulado)</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.5rem; font-weight: 800; color: var(--v4-primary);">R$</span>
                  <input v-model.number="previewLotPrice" type="number" step="1000" style="font-size: 1.5rem; font-weight: 800; color: var(--v4-primary); border: none; background: transparent; padding: 0; outline: none; width: 100%;" />
                </div>
                <small style="color: #60a5fa; font-weight: 500;">Digite aqui o valor para testar a simulação</small>
              </div>
            </div>

            <div class="sim-body">
              <!-- Down Payment Selection -->
              <div class="input-group-v4">
                <div class="ig-label">Quanto deseja dar de entrada?</div>
                <div class="ig-flex">
                  <div class="ig-field" style="flex: 2;">
                    <span class="ig-curr">R$</span>
                    <input v-model.number="previewDownPayment" type="number" step="0.01" @input="updatePercentFromDownPaymentPreview" class="ig-input" :min="minDownPaymentValueForPreview" />
                  </div>
                  <div class="ig-field" style="flex: 1;">
                    <input v-model.number="previewDownPaymentPercent" type="number" step="0.1" class="ig-input" />
                    <span class="ig-curr">%</span>
                  </div>
                </div>
                <small class="ig-hint">Entrada mínima: {{ formatCurrencyToBrasilia(minDownPaymentValueForPreview) }} ({{ editForm?.minDownPaymentPercent || 10 }}%)</small>
              </div>

              <!-- Installments Slider -->
              <div class="input-group-v4" style="margin-top: 32px;">
                <div class="ig-label">Número de Parcelas: <strong>{{ previewMonths }} meses</strong></div>
                <div class="slider-wrapper">
                  <input 
                    type="range" 
                    v-model.number="previewMonths" 
                    min="12" 
                    :max="editForm.maxInstallments || 180" 
                    step="12"
                    class="range-slider-v4"
                  />
                  <div class="slider-labels">
                    <span>12x</span>
                    <span>{{ Math.round((editForm.maxInstallments || 180) / 2) }}x</span>
                    <span>{{ editForm.maxInstallments || 180 }}x</span>
                  </div>
                </div>
              </div>

              <!-- Result -->
              <div class="sim-result-v4">
                <div class="r-label">Primeira Parcela Estimada</div>
                <div class="r-value" style="font-size: 2rem;">{{ formatCurrencyToBrasilia(previewResult) }}</div>
                <div class="r-detail">
                  <span v-if="editForm?.monthlyInterestRate > 0">
                    Juros: {{ editForm.monthlyInterestRate }}% am ({{ annualInterestRateEffective.toFixed(2) }}% aa) + {{ editForm.indexer || 'IGP-M' }}
                  </span>
                  <span v-else>Sem juros + {{ editForm.indexer || 'IGP-M' }}</span>
                </div>

                <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(0, 112, 227, 0.1); font-size: 0.85rem; color: #1e40af;">
                  <div style="display:flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>Total do Investimento:</span>
                    <strong>{{ formatCurrencyToBrasilia(previewTotalInvested) }}</strong>
                  </div>
                  <div style="display:flex; justify-content: space-between;" v-if="previewTotalInterest > 0">
                    <span>Custo Total de Juros:</span>
                    <strong>{{ formatCurrencyToBrasilia(previewTotalInterest) }}</strong>
                  </div>
                </div>
              </div>

              <div class="sim-disclaimer-v4">
                ⚠️ {{ editForm?.financingDisclaimer || 'Simulação baseada nas regras vigentes. Sujeito à aprovação de crédito e alteração de taxas.' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Lotes (Elementos do Projeto) -->
      <div v-if="activeTab === 'lots'">
        <div v-if="lots.length === 0" class="empty-state">
          <h3>Nenhum elemento criado na planta</h3>
          <p>Adicione pontos (hotspots) na Planta Interativa para que apareçam aqui para edição detalhada.</p>
          <NuxtLink :to="`/painel/projetos/${projectId}/planta`" class="btn btn-primary" style="margin-top: 10px;">Ir para a Planta</NuxtLink>
        </div>
        <div v-else class="table-wrapper">
          <div style="padding: 12px 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; margin-bottom: 16px; font-size: 0.85rem; color: #92400e; display: flex; align-items: center; gap: 8px;">
            <span>ℹ️</span>
            Todos os pontos criados na Planta Interativa aparecem nesta lista para que você adicione fotos, preços e dados do contrato.
          </div>
          <table>
            <thead>
              <tr><th>Quadra/Lote</th><th>Status</th><th>Valor M²</th><th>Total</th><th>Entrada/Ato</th><th>Área</th><th v-if="authStore.canEdit">Ações</th></tr>
            </thead>
            <tbody>
              <tr v-for="l in lots" :key="l.id">
                <td>
                   <div style="font-weight: 700; color: var(--gray-800);">{{ l.block || '' }} {{ l.lotNumber || (l.mapElement?.code || '—') }}</div>
                   <div style="font-size: 0.7rem; color: var(--gray-400); display: flex; align-items: center; gap: 4px;">
                     <span class="badge badge-neutral" style="font-size: 8px; padding: 1px 4px; border-radius: 4px;">{{ l.mapElement?.type === 'LOT' ? 'Lote' : 'Ponto' }}</span>
                     <span>{{ l.mapElement?.code }}</span>
                   </div>
                </td>
                <td>
                  <span class="badge" :class="lotBadge(l.status)">{{ lotLabel(l.status) }}</span>
                </td>
                <td style="font-weight: 500;">{{ l.pricePerM2 ? formatCurrencyToBrasilia(l.pricePerM2) : '—' }}</td>
                <td style="font-weight: 700;">{{ l.price ? formatCurrencyToBrasilia(l.price) : '—' }}</td>
                <td style="font-weight: 600; color: var(--success);">
                  {{ l.price ? formatCurrencyToBrasilia(Number(l.price) * (project?.minDownPaymentPercent / 100 || 0.1)) : '—' }}
                </td>
                <td style="font-weight: 500;">{{ l.areaM2 ? `${l.areaM2.toFixed(2)} m²` : '—' }}</td>
                <td v-if="authStore.canEdit">
                  <div class="flex gap-2">
                     <button class="btn btn-sm btn-secondary" @click="openEditLot(l)">Editar Dados</button>
                     <a v-if="publicUrl && l.mapElement" :href="`/${project.slug}/${l.mapElement.code}`" target="_blank" class="btn btn-sm btn-outline">Ver Página</a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <CommonPagination :meta="lotsMeta" @change="loadLotsPaginated" />
        </div>
      </div>

      <!-- Lot Edit Modal -->
      <div v-if="editingLot" class="modal-overlay" @click.self="editingLot = null">
        <div class="modal" style="max-width: 800px;">
          <div class="modal-header" style="margin-bottom: var(--space-4);">
            <h3>Editar Lote: {{ editingLot.mapElement?.code || editingLot.id }}</h3>
            <button class="modal-close" @click="editingLot = null">✕</button>
          </div>
          
          <div class="grid grid-cols-2" style="gap: var(--space-4); margin-top: var(--space-4);">
            <div class="form-group">
              <label class="form-label">Quadra</label>
              <input v-model="lotForm.block" class="form-input" placeholder="Ex: Quadra B" />
            </div>
            <div class="form-group">
              <label class="form-label">Lote nº</label>
              <input v-model="lotForm.lotNumber" class="form-input" placeholder="Ex: 31" />
            </div>
          </div>

          <div class="grid grid-cols-3" style="gap: var(--space-4); margin-top: var(--space-4);">
            <div class="form-group">
              <label class="form-label">Status</label>
              <select v-model="lotForm.status" class="form-input">
                <option value="AVAILABLE">Disponível</option>
                <option value="RESERVED">Reservado</option>
                <option value="SOLD">Vendido</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Valor do M² (R$)</label>
              <input v-model.number="lotForm.pricePerM2" type="number" step="0.01" class="form-input" placeholder="0.00" @input="calculatePriceFromM2" />
            </div>
            <div class="form-group">
              <label class="form-label">Preço Total (R$)</label>
              <input v-model.number="lotForm.price" type="number" step="0.01" class="form-input" placeholder="0.00" @input="calculateM2FromPrice" />
            </div>
          </div>

          <div style="margin-top: var(--space-4);">
            <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: var(--space-3);">Medidas para Contrato</h4>
            <div v-if="lotContractArea !== null" style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:8px 14px; margin-bottom: var(--space-3); display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.75rem; font-weight:700; color:#3b82f6; text-transform:uppercase; letter-spacing:0.3px;">Área Calculada</span>
              <span style="font-size:0.95rem; font-weight:700; color:#1d4ed8;">{{ lotContractArea.toFixed(2) }} m²</span>
            </div>
            <!-- Per-side metrics from map editor -->
            <div v-if="editingLotSideMetrics.length > 0" style="margin-bottom: var(--space-3);">
              <div style="font-size:0.7rem; font-weight:700; color:var(--gray-500); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Lados do Lote (do editor)</div>
              <div style="display:flex; flex-wrap:wrap; gap:6px;">
                <div v-for="(s, i) in editingLotSideMetrics" :key="i" style="background:var(--gray-50); border:1px solid var(--gray-200); border-radius:6px; padding:4px 10px; display:flex; align-items:center; gap:8px;">
                  <span style="font-size:0.75rem; color:var(--gray-500);">{{ s.label }}</span>
                  <span v-if="s.meters != null" style="font-size:0.875rem; font-weight:600; color:var(--gray-800);">{{ Number(s.meters).toFixed(2) }} m</span>
                  <span v-else style="font-size:0.75rem; color:var(--gray-400); font-style:italic;">—</span>
                </div>
              </div>
              <p style="font-size:0.7rem; color:var(--gray-400); margin-top:4px;">Edite no editor de mapas para alterar os lados.</p>
            </div>
            <div class="grid grid-cols-2" style="gap: var(--space-3);">
              <div class="form-group" style="margin:0">
                <label class="form-label">Frente (m)</label>
                <input v-model.number="lotForm.frontage" type="number" step="0.01" class="form-input" placeholder="Ex: 10.00" />
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Lado Esquerdo (m)</label>
                <input v-model.number="lotForm.sideLeft" type="number" step="0.01" class="form-input" placeholder="Ex: 25.00" />
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Fundo (m) <small style="color:var(--gray-400)">se diferente da frente</small></label>
                <input v-model.number="lotForm.depth" type="number" step="0.01" class="form-input" placeholder="= Frente" />
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Lado Direito (m) <small style="color:var(--gray-400)">se diferente</small></label>
                <input v-model.number="lotForm.sideRight" type="number" step="0.01" class="form-input" placeholder="= Lado Esq." />
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Inclinação</label>
                <select v-model="lotForm.slope" class="form-input">
                  <option value="FLAT">Plano</option>
                  <option value="UPHILL">Aclive</option>
                  <option value="DOWNHILL">Declive</option>
                </select>
              </div>
            </div>
          </div>

          <div style="margin-top: var(--space-6); margin-bottom: var(--space-6);">
            <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: var(--space-3);">Selos Customizados</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
              <div v-for="(tag, idx) in (lotForm.tags || [])" :key="idx" 
                   style="background: #eff6ff; color: #1d4ed8; padding: 3px 10px; border-radius: 99px; font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                {{ tag }}
                <span @click="lotForm.tags.splice(idx, 1)" style="cursor: pointer; opacity: 0.6; font-size: 0.8rem;">✕</span>
              </div>
              <div v-if="!(lotForm.tags?.length)" style="color: var(--gray-400); font-size: 0.75rem;">Nenhum selo cadastrado.</div>
            </div>
            
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <input v-model="newTag" @keyup.enter="addTag" type="text" class="form-input btn-sm" style="flex: 1; height: 32px; font-size: 0.85rem;" placeholder="Novo selo (ex: sol da manhã)..." />
              <button @click="addTag" class="btn btn-sm btn-secondary" style="height: 32px; padding: 0 12px; font-size: 0.85rem;">Adicionar</button>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button v-for="suggestion in ['sol da manhã', 'esquina', 'vista livre', 'próximo à portaria', 'fundo para área verde']" 
                      :key="suggestion"
                      @click="addSuggestedTag(suggestion)"
                      class="btn btn-xs btn-outline"
                      style="font-size: 9px; padding: 2px 6px; color: var(--gray-500); border-color: var(--gray-300);">
                + {{ suggestion }}
              </button>
            </div>
          </div>

          <div class="form-group" style="margin-top: var(--space-6);">
            <label class="form-label">Notas / Descrição</label>
            <textarea v-model="lotForm.notes" class="form-textarea" rows="3" placeholder="Informações adicionais do lote..."></textarea>
          </div>

          <div class="form-group" style="border-top: 1px dashed var(--gray-200); padding-top: var(--space-4); margin-top: var(--space-4);">
            <div class="flex justify-between items-center" style="margin-bottom: var(--space-2);">
              <label class="form-label" style="margin:0">Tabela de Financiamento</label>
              <button v-if="!lotForm.paymentConditions" class="btn btn-sm btn-ghost" @click="initPaymentConditionsInForm">+ Habilitar Tabela</button>
              <button v-else class="btn btn-sm btn-ghost btn-danger" @click="lotForm.paymentConditions = null">Remover Tabela</button>
            </div>

            <template v-if="lotForm.paymentConditions">
              <div class="grid grid-cols-2" style="gap: var(--space-3); background: #f8fafc; padding: var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--gray-100);">
                <div class="form-group" style="margin:0">
                  <label class="form-label">Setor / Localização</label>
                  <input v-model="lotForm.paymentConditions.setor" class="form-input" placeholder="Ex: Setor 6" />
                </div>
                <div class="form-group" style="margin:0">
                  <label class="form-label">Ato (R$)</label>
                  <input v-model.number="lotForm.paymentConditions.ato" type="number" step="0.01" class="form-input" placeholder="0.00" />
                </div>
                <div class="form-group" style="margin:0">
                  <label class="form-label">Entrada (Qtd Parcelas)</label>
                  <input v-model.number="lotForm.paymentConditions.entrada.count" type="number" class="form-input" placeholder="Ex: 6" />
                </div>
                <div class="form-group" style="margin:0">
                  <label class="form-label">Entrada Total (R$)</label>
                  <input v-model.number="lotForm.paymentConditions.entrada.total" type="number" step="0.01" class="form-input" placeholder="0.00" />
                </div>
                <div class="form-group" style="margin:0">
                  <label class="form-label">Saldo do Saldo (R$)</label>
                  <input v-model.number="lotForm.paymentConditions.saldo" type="number" step="0.01" class="form-input" placeholder="0.00" />
                </div>
              </div>

              <div style="margin-top: var(--space-4);">
                <label class="form-label">Parcelas Mensais</label>
                <div v-for="(p, i) in lotForm.paymentConditions.parcelas" :key="i" class="flex gap-2 items-center" style="margin-bottom: var(--space-1);">
                  <input v-model.number="p.months" type="number" class="form-input" style="width: 80px;" placeholder="Meses" />
                  <span style="font-size: 0.8rem; color: var(--gray-400);">vezes de</span>
                  <input v-model.number="p.amount" type="number" step="0.01" class="form-input flex-1" placeholder="R$ 0.00" />
                  <button class="btn btn-sm" style="padding: 4px;" @click="removeParcelaInForm(Number(i))">✕</button>
                </div>
                <button class="btn btn-sm btn-outline" style="width:100%; margin-top: var(--space-2);" @click="addParcelaInForm">+ Adicionar Parcela</button>
              </div>

              <div class="form-group" style="margin-top: var(--space-4);">
                <label class="form-label">Observações da Tabela (uma por linha)</label>
                <textarea 
                  :value="lotForm.paymentConditions.observacoes?.join('\n')" 
                  @input="lotForm.paymentConditions.observacoes = ($event.target as HTMLTextAreaElement).value.split('\n')"
                  class="form-textarea" 
                  rows="3" 
                  placeholder="Observações legais..."
                ></textarea>
              </div>
            </template>
          </div>

          <hr style="margin: var(--space-5) 0; border: 0; border-top: 1px solid var(--gray-200);" />

          <h4 style="margin-bottom: var(--space-3);">Fotos do Lote</h4>
          <div v-if="lotMedias.length === 0" class="empty-state" style="padding: var(--space-4); background: var(--gray-50); border-radius: 12px;">
            <p>Nenhuma foto específica deste lote.</p>
          </div>
          <div v-else class="grid grid-cols-4" style="gap: var(--space-3); margin-bottom: var(--space-4);">
            <div v-for="m in lotMedias" :key="m.id" class="media-card-v4">
              <img :src="m.url" class="media-thumb-v4" />
              <button class="media-delete-btn-v4" @click="removeLotMedia(m.id)">✕</button>
            </div>
          </div>
          
          <label class="btn btn-secondary btn-sm" style="cursor:pointer; width: fit-content;">
            {{ uploadingLotMedia ? 'Enviando...' : '+ Adicionar Foto do Lote' }}
            <input type="file" accept="image/*" style="display:none" @change="uploadLotMediaFile" :disabled="uploadingLotMedia" />
          </label>

          <hr style="margin: var(--space-5) 0; border: 0; border-top: 1px solid var(--gray-200);" />

          <h4 style="margin-bottom: var(--space-3);">🌄 Panorama 360° do Lote</h4>
          <div v-if="lotForm.panoramaUrl" class="media-card-v4" style="max-width: 240px; margin-bottom: var(--space-4);">
            <div class="relative group">
              <img :src="lotForm.panoramaUrl" class="media-thumb-v4" style="aspect-ratio: 2/1;" />
              <button class="media-delete-btn-v4" @click="lotForm.panoramaUrl = null">✕</button>
              <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none">
                <span class="text-white text-xs font-bold">Vista 360° Ativa</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state" style="padding: var(--space-4); background: var(--gray-50); border-radius: 12px; margin-bottom: var(--space-4);">
            <p>Nenhuma imagem 360° enviada para este lote.</p>
          </div>
          
          <label class="btn btn-secondary btn-sm" style="cursor:pointer; width: fit-content;">
            {{ uploadingPanorama ? 'Enviando...' : (lotForm.panoramaUrl ? 'Alterar Imagem 360°' : '+ Adicionar Imagem 360°') }}
            <input type="file" accept="image/*" style="display:none" @change="uploadLotPanoramaFile" :disabled="uploadingPanorama" />
          </label>

          <div class="modal-actions" style="margin-top: var(--space-6);">
            <button class="btn btn-secondary" @click="editingLot = null">Cancelar</button>
            <button class="btn btn-primary" :disabled="savingLot" @click="saveLotDetails">
              {{ savingLot ? 'Salvando...' : 'Salvar Detalhes' }}
            </button>
          </div>
        </div>
      </div>


      <!-- Tab: Pág. Pública -->
      <div v-if="activeTab === 'public'">
        <div class="flex justify-between items-center" style="margin-bottom: 40px;">
          <div>
            <h2 style="margin:0; font-size: 1.25rem;">Conteúdo da Página Pública</h2>
            <p style="margin:0; font-size: 0.875rem; color: var(--gray-500);">Gerencie o que seus clientes verão ao acessar o link do loteamento.</p>
          </div>
          <div v-if="authStore.canEdit" class="flex items-center gap-4">
            <transition name="fade">
              <span v-if="pubInfoSaved" style="color: var(--success); font-weight: 600; font-size: 0.875rem;">✅ Salvo!</span>
            </transition>
            <button class="btn btn-primary" style="min-width: 160px;" :disabled="savingPubInfo" @click="savePubInfo">
              {{ savingPubInfo ? 'Salvando...' : '💾 Salvar Alterações' }}
            </button>
          </div>
        </div>

        <div class="card-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; align-items: start;">
          
          <!-- Column 1 -->
          <div class="flex flex-col" style="gap: 40px;">
            <!-- Section: Hero Banner -->
            <section class="card" style="padding: var(--space-6); margin: 0;">
              <div class="flex items-center gap-3" style="margin-bottom: var(--space-4);">
                <div style="width: 32px; height: 32px; background: var(--primary-light); color: var(--primary); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1rem;">🖼️</div>
                <div>
                  <h3 style="margin:0; font-size: 1rem;">Banner do Loteamento</h3>
                </div>
              </div>

              <div v-if="project.bannerImageUrl" class="banner-preview" style="position: relative; margin-bottom: var(--space-4); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm); aspect-ratio: 16/5;">
                <img :src="project.bannerImageUrl" alt="Banner" style="width: 100%; height: 100%; object-fit: cover;" />
                <div v-if="authStore.canEdit" style="position: absolute; bottom: 12px; right: 12px;">
                  <button class="btn btn-danger btn-xs" style="background: white; color: var(--danger); border: 1px solid var(--danger);" @click="removeBannerImage">🗑️ Remover</button>
                </div>
              </div>
              
              <div v-else class="banner-placeholder" style="margin-bottom: var(--space-4); border: 2px dashed var(--gray-200); background: var(--gray-50); border-radius: var(--radius-lg); padding: var(--space-6); text-align: center;">
                <p style="color: var(--gray-500); font-size: 0.75rem;">Nenhum banner configurado.</p>
              </div>

              <div v-if="authStore.canEdit" class="flex justify-start">
                <label class="btn btn-secondary btn-sm" style="cursor:pointer; display: flex; align-items: center; gap: 8px;">
                  <span>{{ uploadingBanner ? '⌛ Enviando...' : '📤 Upload do Banner' }}</span>
                  <input type="file" accept="image/*" style="display:none" @change="uploadBannerImage" :disabled="uploadingBanner" />
                </label>
              </div>
            </section>

            <!-- Section: Price & Conditions -->
            <section class="card" style="padding: var(--space-6); margin: 0;">
              <div class="flex items-center gap-3" style="margin-bottom: var(--space-6);">
                <div style="width: 32px; height: 32px; background: var(--primary-light); color: var(--primary); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1rem;">💰</div>
                <div>
                  <h3 style="margin:0; font-size: 1rem;">Preços e Condições</h3>
                </div>
              </div>

              <div class="grid grid-cols-2" style="gap: 20px; margin-bottom: 20px;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label">A partir de (R$)</label>
                  <input v-model="pubInfoForm.startingPrice" type="number" step="0.01" class="form-input" placeholder="144000" :disabled="!authStore.canEdit" />
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label">Parcelamento (Vezes)</label>
                  <input v-model="pubInfoForm.maxInstallments" type="number" class="form-input" placeholder="120" :disabled="!authStore.canEdit" />
                </div>
              </div>

              <div class="form-group" style="margin:0;">
                <label class="form-label">Resumo das Condições</label>
                <input v-model="pubInfoForm.paymentConditionsSummary" class="form-input" placeholder="Entrada facilitada em 6x e saldo em 120 meses." :disabled="!authStore.canEdit" />
              </div>
            </section>

            <!-- Section: Construction Status -->
            <section class="card" style="padding: var(--space-6); margin: 0;">
              <div class="flex items-center gap-3" style="margin-bottom: var(--space-4);">
                <div style="width: 32px; height: 32px; background: #fef3c7; color: #92400e; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1rem;">🏗️</div>
                <div>
                  <h3 style="margin:0; font-size: 1rem;">Acompanhamento de Obras</h3>
                </div>
              </div>

              <div v-if="pubInfoForm.constructionStatus.length === 0" class="empty-state" style="padding: var(--space-4); background: var(--gray-50); border-radius: var(--radius-lg); margin-bottom: 16px;">
                <p style="font-size: 0.8rem;">Nenhum status configurado.</p>
              </div>

              <div v-else style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px;">
                <div v-for="(item, i) in pubInfoForm.constructionStatus" :key="i" style="background: white; border: 1px solid var(--gray-200); padding: 16px; border-radius: 8px; position: relative;">
                  <div class="flex justify-between items-center" style="margin-bottom: 10px;">
                    <span style="font-weight: 600; font-size: 0.875rem;">{{ item.label }}</span>
                    <span style="font-weight: 700; color: var(--success); font-size: 0.875rem;">{{ item.percentage }}%</span>
                  </div>
                  <div style="width: 100%; height: 8px; background: var(--gray-100); border-radius: 4px; overflow: hidden;">
                    <div :style="{ width: item.percentage + '%', background: 'var(--success)' }" style="height: 100%; transition: width 0.3s ease;"></div>
                  </div>
                  <button v-if="authStore.canEdit" class="btn-remove-v4" title="Remover Etapa" @click="removeWorkStage(i)">✕</button>
                </div>
              </div>

              <!-- New Work Stage Form -->
              <div v-if="authStore.canEdit" style="background: var(--gray-50); padding: 20px; border-radius: 8px; border: 1px solid var(--gray-200);">
                <div style="display: grid; grid-template-columns: 1fr 80px; gap: 16px; align-items: end;">
                  <div class="form-group" style="margin:0;">
                    <label class="form-label" style="font-size: 0.75rem;">Nova Etapa (ex: Terraplanagem)</label>
                    <input v-model="newWorkStage.label" class="form-input btn-sm" placeholder="Nome da etapa..." />
                  </div>
                  <div class="form-group" style="margin:0;">
                    <label class="form-label" style="font-size: 0.75rem;">%</label>
                    <input v-model.number="newWorkStage.percentage" type="number" min="0" max="100" class="form-input btn-sm" />
                  </div>
                </div>
                <button class="btn btn-secondary btn-sm" style="width: 100%; margin-top: 16px;" @click="addWorkStage">Adicionar Etapa</button>
              </div>
            </section>

            <!-- Section: Location -->
            <section class="card" style="padding: var(--space-6); margin: 0;">
              <div class="flex items-center gap-3" style="margin-bottom: var(--space-4);">
                <div style="width: 32px; height: 32px; background: #e0f2fe; color: #0369a1; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1rem;">📍</div>
                <div>
                  <h3 style="margin:0; font-size: 1rem;">Localização</h3>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 24px;">
                <label class="form-label" style="font-size: 0.75rem;">Endereço</label>
                <input v-model="pubInfoForm.address" class="form-input btn-sm" placeholder="Av. Brasil, 1000 - Centro" :disabled="!authStore.canEdit" />
              </div>

              <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size: 0.75rem;">Link Google Maps</label>
                <input v-model="pubInfoForm.googleMapsUrl" class="form-input btn-sm" placeholder="Link ou Embed URL" :disabled="!authStore.canEdit" />
              </div>
            </section>
          </div>

          <!-- Column 2 -->
          <div class="flex flex-col" style="gap: 40px;">
            <!-- Section: Video & Multimedia -->
            <section class="card" style="padding: var(--space-6); margin: 0;">
              <div class="flex items-center gap-3" style="margin-bottom: var(--space-4);">
                <div style="width: 32px; height: 32px; background: #fee2e2; color: #b91c1c; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1rem;">🎬</div>
                <div>
                  <h3 style="margin:0; font-size: 1rem;">Vídeo de Apresentação</h3>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 20px;">
                <label class="form-label">Link do YouTube</label>
                <div class="flex gap-2">
                  <input v-model="pubInfoForm.youtubeVideoUrl" class="form-input" placeholder="https://www.youtube.com/watch?v=..." :disabled="!authStore.canEdit" />
                </div>
                <small style="color:var(--gray-400); font-size:0.75rem;">O vídeo será incorporado na página do empreendimento.</small>
              </div>

              <div v-if="pubInfoForm.youtubeVideoUrl" style="margin-top: 12px; border-radius: 8px; overflow: hidden; border: 1px solid var(--gray-200); aspect-ratio: 16/9;">
                 <iframe 
                    v-if="pubInfoForm.youtubeVideoUrl.includes('embed/')"
                    :src="pubInfoForm.youtubeVideoUrl" 
                    width="100%" height="100%" frameborder="0" allowfullscreen
                 ></iframe>
                 <div v-else style="padding: 20px; text-align: center; background: var(--gray-50); color: var(--gray-500); height: 100%; display: flex; align-items: center; justify-content: center;">
                    <p style="font-size: 0.8rem;">Preview disponível após salvar o link.</p>
                 </div>
              </div>
            </section>

            <!-- Section: Infraestrutura -->
            <section class="card" style="padding: var(--space-6); margin: 0;">
              <div class="flex items-center gap-3" style="margin-bottom: var(--space-6);">
                <div style="width: 32px; height: 32px; background: #fdf2f8; color: #db2777; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1rem;">🏗️</div>
                <div>
                  <h3 style="margin:0; font-size: 1rem;">Infraestrutura</h3>
                </div>
              </div>

              <!-- Infrastructure Titles -->
              <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid var(--gray-200); margin-bottom: 32px;">
                <h4 style="font-size: 0.75rem; color: var(--gray-400); text-transform: uppercase; margin-bottom: 16px;">Títulos da Seção</h4>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.7rem;">Título Principal (Ex: Sua família merece o melhor)</label>
                  <input v-model="pubInfoForm.highlightsTitle" class="form-input" placeholder="Sua família merece o melhor." />
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-size: 0.7rem;">Subtítulo (Abaixo do título)</label>
                  <input v-model="pubInfoForm.highlightsSubtitle" class="form-input" placeholder="Qualidade de vida, segurança..." />
                </div>
              </div>

              <!-- Infrastructure Categories -->
              <div v-if="pubInfoForm.highlightsJson.filter(h => h.type === 'category').length" style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px;">
                <h4 style="font-size: 0.75rem; color: var(--gray-400); text-transform: uppercase;">Categorias de Infraestrutura</h4>
                <div v-for="(cat, idx) in pubInfoForm.highlightsJson" :key="idx" v-show="cat.type === 'category'" style="background: white; border: 1px solid var(--gray-200); padding: 20px; border-radius: 12px; position: relative;">
                  <div class="flex justify-between items-center" style="margin-bottom: 16px;">
                    <strong style="font-size: 0.95rem; color: var(--gray-800); font-weight: 700;">{{ cat.title }}</strong>
                    <button v-if="authStore.canEdit" class="btn-remove-v4" title="Remover Categoria" @click="removeHighlight(idx)">✕</button>
                  </div>
                  
                  <!-- Items list -->
                  <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
                    <div v-for="(it, itIdx) in cat.items" :key="itIdx" class="infra-badge-v4">
                      {{ it }}
                      <span v-if="authStore.canEdit" class="infra-badge-remove" @click="removeInfraItem(idx, itIdx)">✕</span>
                    </div>
                  </div>

                  <!-- Add item to category -->
                  <div v-if="authStore.canEdit" style="display: flex; gap: 10px;">
                    <input 
                      v-model="infraItemInputs[idx]"
                      @keyup.enter="addInfraItem(idx)"
                      class="form-input" 
                      placeholder="Adicionar item..." 
                      style="flex: 1; font-size: 0.8125rem; height: 42px; border-radius: 8px;" 
                    />
                    <button class="btn btn-dark" style="width: 42px; height: 42px; padding: 0; border-radius: 8px; background: #222; color: white;" @click="addInfraItem(idx)">+</button>
                  </div>
                </div>
              </div>

              <div v-if="authStore.canEdit" style="background: var(--gray-50); padding: 24px; border-radius: 12px; border: 1px solid var(--gray-200);">
                <p style="font-size: 0.7rem; color: var(--gray-500); margin-bottom: 12px; font-weight: 700; text-transform: uppercase;">Nova Categoria de Infraestrutura</p>
                <input v-model="newInfraCategory" class="form-input" placeholder="Título da Categoria (ex: Equipamentos)" style="height: 48px; border-radius: 8px;" />
                <button class="btn btn-primary" style="width: 100%; margin-top: 16px; height: 48px; border-radius: 12px; font-weight: 600; background: #3b82f6;" @click="addInfraCategory">Criar Categoria</button>
              </div>
            </section>

            <!-- Section: Destaques -->
            <section class="card" style="padding: var(--space-6); margin: 0;">
              <div class="flex items-center gap-3" style="margin-bottom: var(--space-6);">
                <div style="width: 32px; height: 32px; background: #fff7ed; color: #f97316; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1rem;">✨</div>
                <div>
                  <h3 style="margin:0; font-size: 1rem;">Destaques</h3>
                </div>
              </div>

              <!-- Highlights Titles -->
              <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid var(--gray-200); margin-bottom: 32px;">
                <h4 style="font-size: 0.75rem; color: var(--gray-400); text-transform: uppercase; margin-bottom: 16px;">Títulos da Seção</h4>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.7rem;">Título da Seção (Ex: Destaques)</label>
                  <input v-model="pubInfoForm.traditionalHighlightsTitle" class="form-input" placeholder="Destaques" />
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-size: 0.7rem;">Subtítulo (Abaixo do título)</label>
                  <input v-model="pubInfoForm.traditionalHighlightsSubtitle" class="form-input" placeholder="Diferenciais pensados para..." />
                </div>
              </div>

              <!-- General Highlights -->
              <div v-if="pubInfoForm.highlightsJson.filter(h => h.type === 'highlight' || !h.type).length" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
                <h4 style="font-size: 0.75rem; color: var(--gray-400); text-transform: uppercase;">Diferenciais Individuais</h4>
                <div v-for="(h, idx) in pubInfoForm.highlightsJson" :key="idx" v-show="h.type === 'highlight' || !h.type" style="padding: 12px 16px; border: 1px solid var(--gray-200); border-radius: 8px; position: relative; background: white; display: flex; align-items: center; gap: 10px;">
                  <div style="font-size: 1rem; color: #059669;">{{ h.icon || '✅' }}</div>
                  <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <strong style="font-size: 0.8125rem;">{{ h.label }}</strong>
                    <span style="font-size: 0.75rem; color: var(--gray-500); margin-left: 4px;">{{ h.value }}</span>
                  </div>
                  <button v-if="authStore.canEdit" class="btn-remove-v4" title="Remover" @click="removeHighlight(idx)">✕</button>
                </div>
              </div>

              <div v-if="authStore.canEdit" style="background: var(--gray-50); padding: 24px; border-radius: 12px; border: 1px solid var(--gray-200);">
                <p style="font-size: 0.7rem; color: var(--gray-500); margin-bottom: 12px; font-weight: 700; text-transform: uppercase;">Novo Diferencial Simples</p>
                <div class="grid grid-cols-2 gap-4">
                  <input v-model="newHighlight.label" class="form-input" placeholder="Rótulo (ex: Segurança)" style="height: 48px; border-radius: 8px;" />
                  <input v-model="newHighlight.value" class="form-input" placeholder="Detalhe (ex: 24h)" style="height: 48px; border-radius: 8px;" />
                </div>
                <button class="btn btn-dark" style="width: 100%; margin-top: 16px; height: 48px; background: #222; color: white; border-radius: 12px; font-weight: 600;" @click="addHighlight">Adicionar Diferencial</button>
              </div>
            </section>
          </div>

          <!-- Section: Details Text (Full Width) -->
          <section class="card" style="padding: var(--space-6); grid-column: span 2; margin-top: 12px;">
            <div class="flex items-center gap-3" style="margin-bottom: var(--space-4);">
              <div style="width: 32px; height: 32px; background: var(--primary-light); color: var(--primary); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1rem;">📝</div>
              <div>
                <h3 style="margin:0; font-size: 1rem;">Texto Descritivo</h3>
              </div>
            </div>
            
            <div class="form-group" style="margin:0;">
              <div v-if="authStore.canEdit" class="flex gap-2" style="margin-bottom: 12px;">
                <button class="btn btn-xs btn-outline" @click.prevent="execCommand('bold')"><b>B</b></button>
                <button class="btn btn-xs btn-outline" @click.prevent="execCommand('italic')"><i>I</i></button>
                <button class="btn btn-xs btn-outline" @click.prevent="execCommand('insertUnorderedList')">• Lista</button>
              </div>
              <div 
                ref="richEditor"
                contenteditable="true"
                class="form-textarea rich-editor-v4"
                :class="{ 'disabled': !authStore.canEdit }"
                @input="updateFromEditor"
                @blur="updateFromEditor"
                v-html="initialEditorContent"
                style="min-height: 250px; padding: 20px; line-height: 1.6; border-radius: 8px; font-size: 0.875rem; background: white; border: 1px solid var(--gray-300); overflow-y: auto;"
              ></div>
            </div>
          </section>

          <!-- Section: Media Gallery (Full Width) -->
          <section class="card" style="padding: var(--space-6); grid-column: span 2; margin-top: 12px;">
            <div class="flex items-center gap-3" style="margin-bottom: var(--space-4);">
              <div style="width: 32px; height: 32px; background: #dcfce7; color: #166534; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1rem;">📸</div>
              <div style="flex: 1;">
                <h3 style="margin:0; font-size: 1rem;">Galeria de Mídia</h3>
              </div>
              <div v-if="authStore.canEdit" class="flex gap-3">
                <label class="btn btn-primary btn-sm" style="cursor:pointer;">
                  {{ uploadingMedia ? 'Enviando...' : '+ Adicionar Fotos/Vídeos' }}
                  <input type="file" accept="image/*,video/*" style="display:none" @change="uploadMediaFile" :disabled="uploadingMedia" />
                </label>
              </div>
            </div>

            <div v-if="media.length === 0" class="empty-state" style="padding: 40px; background: var(--gray-50); border-radius: 12px;">
              <p style="font-size: 0.875rem; color: var(--gray-400);">Nenhuma foto ou vídeo na galeria.</p>
            </div>
            <div v-else style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 16px;">
              <div v-for="m in media" :key="m.id" class="media-card-v4" style="aspect-ratio: 1/1; width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid var(--gray-100);">
                <img v-if="m.type === 'PHOTO'" :src="m.url" class="media-thumb-v4" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                <video v-else :src="m.url" class="media-thumb-v4" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                <div class="media-overlay-v4">
                   <button v-if="authStore.canEdit" class="delete-btn-circ" title="Remover" @click="deleteMedia(m.id)">✕</button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Footer-ish Action Bar -->
        <div v-if="authStore.canEdit" class="flex justify-end items-center gap-4" style="margin-top: 48px;">
          <div v-if="pubInfoSaved" style="color: var(--success); font-weight: 600; font-size: 0.875rem;">✅ Alterações salvas!</div>
          <button class="btn btn-primary" style="min-width: 180px; padding: 12px 24px;" :disabled="savingPubInfo" @click="savePubInfo">
            {{ savingPubInfo ? 'Salvando...' : '💾 Salvar Alterações' }}
          </button>
        </div>
      </div>

      <!-- Tab: Corretores -->
      <div v-if="activeTab === 'corretores'">
        <div class="card" style="margin-bottom: var(--space-5);">
          <h3 style="margin-bottom: var(--space-2);">Links de Corretor</h3>
          <p style="color: var(--gray-500); font-size:0.875rem;">Cada corretor tem um link personalizado. Quando acessado, a página exibe os dados do corretor para contato. Leads capturados por esse link são vinculados ao corretor.</p>
        </div>

        <div v-if="authStore.canEdit" style="margin-bottom: var(--space-5);">
          <button class="btn btn-primary" @click="showNewCorretor = !showNewCorretor">
            {{ showNewCorretor ? '✕ Cancelar' : '+ Novo Corretor' }}
          </button>

          <div v-if="showNewCorretor" class="card" style="margin-top: var(--space-4); max-width: 800px;">
            <h4 style="margin-bottom: var(--space-4);">Novo Link de Corretor</h4>
            <div class="grid grid-cols-2" style="gap: var(--space-4);">
              <div class="form-group col-span-2">
                <label class="form-label">Nome do Corretor <span class="required" style="color:#ef4444;">*</span></label>
                <input v-model="corretorForm.name" class="form-input" placeholder="Nome completo" required @input="onNameInput" />
              </div>
              <div class="form-group">
                <label class="form-label">Código (URL) <span class="required" style="color:#ef4444;">*</span></label>
                <div class="input-wrapper" style="position: relative; display: flex; align-items: center;">
                  <input v-model="corretorForm.code" class="form-input" :class="{ 'is-invalid': codeError, 'is-valid': codeAvailable }" placeholder="joao-corretor" required style="width: 100%;" />
                  <span v-if="codeAvailable" style="position: absolute; right: 10px; color: #10b981; font-weight: bold;">✓</span>
                </div>
                <span v-if="codeError" class="error-text" style="color:#ef4444; font-size:0.75rem;">{{ codeError }}</span>
                <span v-else-if="codeLoading" class="help-text" style="color:var(--gray-500); font-size:0.75rem;">Verificando...</span>
                <small v-else style="color:var(--gray-500); font-size:0.75rem;">Usado como ?c={{ corretorForm.code || '...' }}</small>
              </div>
              <div class="form-group">
                <label class="form-label">CRECI</label>
                <input v-model="corretorForm.creci" class="form-input" placeholder="Ex: 12345-F" />
              </div>
              <div class="form-group">
                <label class="form-label">Telefone (WhatsApp) <span class="required" style="color:#ef4444;">*</span></label>
                <input v-model="corretorForm.phone" class="form-input" placeholder="(DD) 9XXXX-XXXX" required />
              </div>
              <div class="form-group">
                <label class="form-label">URL da Foto</label>
                <input v-model="corretorForm.photoUrl" class="form-input" placeholder="URL da foto/avatar" />
              </div>
              <div class="form-group col-span-2">
                <label class="form-label">E-mail</label>
                <div class="input-wrapper" style="position: relative; display: flex; align-items: center;">
                  <input v-model="corretorForm.email" type="email" class="form-input" :class="{ 'is-invalid': emailError, 'is-valid': emailAvailable }" placeholder="corretor@email.com" style="width: 100%;" />
                  <span v-if="emailAvailable" style="position: absolute; right: 10px; color: #10b981; font-weight: bold;">✓</span>
                </div>
                <span v-if="emailError" class="error-text" style="color:#ef4444; font-size:0.75rem;">{{ emailError }}</span>
                <span v-else-if="emailLoading" class="help-text" style="color:var(--gray-500); font-size:0.75rem;">Verificando...</span>
              </div>
            </div>
            <div v-if="corretorError" class="alert alert-error" style="margin-top: var(--space-3);">{{ corretorError }}</div>
            <div class="modal-actions" style="margin-top: var(--space-4);">
              <button class="btn btn-secondary" @click="showNewCorretor = false">Cancelar</button>
              <button class="btn btn-primary" :disabled="creatingCorretor || !corretorForm.name || !corretorForm.code" @click="createCorretor">
                {{ creatingCorretor ? 'Criando...' : 'Criar Corretor' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="loadingCorretores" class="loading-state"><div class="loading-spinner"></div></div>

        <div v-else-if="corretores.length === 0" class="empty-state">
          <div class="empty-state-icon">🤝</div>
          <h3>Nenhum corretor cadastrado</h3>
          <p>Crie links personalizados para corretores divulgarem o loteamento.</p>
        </div>

        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Código</th>
                <th>Telefone</th>
                <th>Leads</th>
                <th>Status</th>
                <th>Link do Loteamento</th>
                <th v-if="authStore.canEdit">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in corretores" :key="c.id">
                <td><strong>{{ c.name }}</strong></td>
                <td><code>{{ c.code }}</code></td>
                <td>{{ c.phone || '—' }}</td>
                <td>{{ c._count?.leads ?? 0 }}</td>
                <td>
                  <span class="badge" :class="c.enabled ? 'badge-success' : 'badge-neutral'">{{ c.enabled ? 'Ativo' : 'Inativo' }}</span>
                </td>
                <td>
                  <div v-if="publicUrl" class="flex gap-2 items-center">
                    <code style="font-size:0.75rem; color: var(--gray-600);">?c={{ c.code }}</code>
                    <button class="btn btn-sm btn-outline" @click="copyLink(`${locationOrigin}${publicUrl}?c=${c.code}`)">📋 Copiar</button>
                  </div>
                  <span v-else style="color:var(--gray-400); font-size:0.8rem;">Publique o projeto</span>
                </td>
                <td v-if="authStore.canEdit">
                  <div class="flex gap-2">
                    <button class="btn btn-sm btn-secondary" @click="toggleCorretor(c)">{{ c.enabled ? 'Desativar' : 'Ativar' }}</button>
                    <button class="btn btn-sm btn-danger" @click="deleteCorretor(c)">Excluir</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-else class="error-state">Projeto não encontrado.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

interface Media {
  id: string;
  url: string;
  type: 'PHOTO' | 'VIDEO';
}

interface Highlight {
  type?: 'category' | 'highlight';
  title?: string;
  items?: string[];
  label?: string;
  value?: string;
  icon?: string;
}

interface Corretor {
  id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  creci?: string;
  photoUrl?: string;
  enabled: boolean;
  notes?: string;
  _count?: { leads: number };
}

interface PaymentConfig {
  id: string;
  name: string;
  provider: string;
  isEnabledForProject: boolean;
}

interface AiConfig {
  id: string;
  name: string;
  model: string;
}

const route = useRoute()
const router = useRouter()
const { fetchApi, uploadApi } = useApi()
const authStore = useAuthStore()
const { success: toastSuccess, fromError: toastFromError } = useToast()

const projectId = route.params.id as string
const loading = ref(true)
const error = ref('')
const project = ref<any>(null)
const mapElements = ref<any[]>([])
const lots = ref<any[]>([])
const lotsMeta = ref({ totalItems: 0, itemCount: 0, itemsPerPage: 50, totalPages: 0, currentPage: 1 })
const media = ref<Media[]>([])
const activeTab = ref('lots')
const uploadingBanner = ref(false)
const uploadingMedia = ref(false)
const savingSettings = ref(false)
const settingsError = ref('')
const settingsSaved = ref(false)

const editingLot = ref<any>(null)
const newTag = ref('')
const lotForm = ref({
  status: 'AVAILABLE',
  block: '',
  lotNumber: '',
  price: null as number | null,
  pricePerM2: null as number | null,
  areaM2: null as number | null,
  frontage: null as number | null,
  depth: null as number | null,
  sideLeft: null as number | null,
  sideRight: null as number | null,
  slope: 'FLAT',
  panoramaUrl: null as string | null,
  notes: '',
  tags: [] as string[],
  conditionsText: '',
  paymentConditions: null as any
})

const addTag = () => {
  if (!newTag.value) return
  if (!lotForm.value.tags) lotForm.value.tags = []
  if (!lotForm.value.tags.includes(newTag.value.trim().toLowerCase())) {
    lotForm.value.tags.push(newTag.value.trim().toLowerCase())
  }
  newTag.value = ''
}

const addSuggestedTag = (tag: string) => {
  if (!lotForm.value.tags) lotForm.value.tags = []
  if (!lotForm.value.tags.includes(tag.toLowerCase())) {
    lotForm.value.tags.push(tag.toLowerCase())
  }
}

const savingLot = ref(false)
const uploadingLotMedia = ref(false)
const uploadingPanorama = ref(false)

const editingLotSideMetrics = computed(() => {
  const raw = editingLot.value?.sideMetricsJson
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw
})

const lotContractArea = computed(() => {
  const f = lotForm.value.frontage
  if (!f) return null
  const back = lotForm.value.depth ?? f   // fundo (back width) defaults to frente
  const sideL = lotForm.value.sideLeft
  if (!sideL) return null
  const sideR = lotForm.value.sideRight ?? sideL
  return ((f + back) / 2) * ((sideL + sideR) / 2)
})

const lotMedias = computed(() => {
  if (!editingLot.value) return []
  return editingLot.value.medias || []
})

const calculatePriceFromM2 = () => {
  const area = lotForm.value.areaM2 || lotContractArea.value
  if (area && lotForm.value.pricePerM2) {
    lotForm.value.price = Math.round(area * lotForm.value.pricePerM2 * 100) / 100
  }
}

const calculateM2FromPrice = () => {
  const area = lotForm.value.areaM2 || lotContractArea.value
  if (area && lotForm.value.price) {
    lotForm.value.pricePerM2 = Math.round((lotForm.value.price / area) * 100) / 100
  }
}

watch(() => lotContractArea.value, (newArea) => {
  if (newArea && lotForm.value.pricePerM2) {
    lotForm.value.price = Math.round(newArea * lotForm.value.pricePerM2 * 100) / 100
  } else if (newArea && lotForm.value.price) {
    lotForm.value.pricePerM2 = Math.round((lotForm.value.price / newArea) * 100) / 100
  }
})

const openEditLot = (lot: any) => {
  editingLot.value = lot
  lotForm.value = { 
    status: lot.status, 
    block: lot.block || '',
    lotNumber: lot.lotNumber || '',
    price: lot.price ? Number(lot.price) : null, 
    pricePerM2: lot.pricePerM2 ? Number(lot.pricePerM2) : null,
    areaM2: lot.areaM2, 
    frontage: lot.frontage, 
    depth: lot.depth,
    sideLeft: lot.sideLeft ?? null,
    sideRight: lot.sideRight ?? null,
    slope: lot.slope, 
    panoramaUrl: lot.panoramaUrl || null,
    notes: lot.notes || '',
    tags: Array.isArray(lot.tags) ? [...lot.tags] : [],
    conditionsText: Array.isArray(lot.conditionsJson) ? lot.conditionsJson.join('\n') : '',
    paymentConditions: lot.paymentConditions ? JSON.parse(JSON.stringify(lot.paymentConditions)) : null
  }
}

const saveLotDetails = async () => {
  if (!editingLot.value) return
  savingLot.value = true
  try {
    const calc = lotContractArea.value
    const payload: Record<string, any> = {
      status: lotForm.value.status,
      block: lotForm.value.block || undefined,
      lotNumber: lotForm.value.lotNumber || undefined,
      price: lotForm.value.price ?? undefined,
      pricePerM2: lotForm.value.pricePerM2 ?? undefined,
      frontage: lotForm.value.frontage ?? undefined,
      depth: lotForm.value.depth ?? undefined,
      sideLeft: lotForm.value.sideLeft ?? undefined,
      sideRight: lotForm.value.sideRight ?? undefined,
      slope: lotForm.value.slope,
      panoramaUrl: lotForm.value.panoramaUrl || null,
      notes: lotForm.value.notes || undefined,
      tags: lotForm.value.tags,
      paymentConditions: lotForm.value.paymentConditions || undefined,
    }
    // Only override areaM2 when the panel's trapezoid formula produces a result;
    // otherwise let the map editor's last computed value in the DB stand.
    if (calc !== null) {
      payload.areaM2 = Math.round(calc * 100) / 100
    }

    const updated = await fetchApi(`/projects/${projectId}/lots/${editingLot.value.mapElementId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    
    // Update local lots array
    const idx = lots.value.findIndex((l: any) => l.id === editingLot.value.id)
    if (idx !== -1) {
      lots.value[idx] = { ...lots.value[idx], ...updated }
    }
    
    toastSuccess('Detalhes do lote salvos!')
    editingLot.value = null
  } catch (e: any) {
    toastFromError(e, 'Erro ao salvar detalhes do lote')
  }
  savingLot.value = false
}

// ─── Payment Condition Helpers ──────────────────────────
const initPaymentConditionsInForm = () => {
  lotForm.value.paymentConditions = {
    setor: 'Setor 6',
    ato: 0,
    entrada: { count: 6, total: 0 },
    saldo: 0,
    parcelas: [
      { months: 12, amount: 0 },
      { months: 24, amount: 0 },
      { months: 36, amount: 0 },
      { months: 48, amount: 0 },
      { months: 60, amount: 0 },
      { months: 84, amount: 0 },
      { months: 96, amount: 0 },
      { months: 120, amount: 0 },
      { months: 180, amount: 0 },
      { months: 204, amount: 0 },
      { months: 240, amount: 0 }
    ],
    observacoes: [
      'O valor do ato refere-se a intermediação imobiliária.',
      'A 1ª parcela da entrada terá seu vencimento em até 30 dias.',
      'Pagamento das parcelas mensais inicia-se após pagamento da entrada.',
      'Planos com juros de 12.6825% a.a. sob o regime de amortização da tabela PRICE.',
      'As parcelas do saldo devedor serão reajustadas monetariamente pelo IGP-M FGV anual.',
      'Ao final do financiamento, será apurado eventual valor residual (IGP-M FGV) sobre o último período.',
      'Tabela sujeita à alteração de preço sem aviso prévio.'
    ]
  }
}

const addParcelaInForm = () => {
  if (!lotForm.value.paymentConditions) return
  if (!lotForm.value.paymentConditions.parcelas) lotForm.value.paymentConditions.parcelas = []
  const last = lotForm.value.paymentConditions.parcelas[lotForm.value.paymentConditions.parcelas.length - 1]
  lotForm.value.paymentConditions.parcelas.push({ months: (last?.months || 0) + 12, amount: 0 })
}

const removeParcelaInForm = (idx: number) => {
  lotForm.value.paymentConditions.parcelas.splice(idx, 1)
}

const uploadLotMediaFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !editingLot.value) return
  uploadingLotMedia.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const m = await uploadApi(`/projects/${projectId}/media?lotDetailsId=${editingLot.value.id}`, fd)
    
    // Update locally
    if (!editingLot.value.medias) editingLot.value.medias = []
    editingLot.value.medias.unshift(m)
    
    toastSuccess('Foto do lote enviada!')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar foto')
  }
  (e.target as HTMLInputElement).value = ''
  uploadingLotMedia.value = false
}

const uploadLotPanoramaFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !editingLot.value) return
  uploadingPanorama.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    // Upload it as media for this lot
    const m = await uploadApi(`/projects/${projectId}/media?lotDetailsId=${editingLot.value.id}`, fd)
    // Set the panoramaUrl to this media's URL
    lotForm.value.panoramaUrl = m.url
    toastSuccess('Imagem 360° enviada! Salve para concluir.')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar imagem')
  }
  (e.target as HTMLInputElement).value = ''
  uploadingPanorama.value = false
}

const removeLotMedia = async (id: string) => {
  if (!confirm('Excluir foto do lote?')) return
  try {
    await fetchApi(`/projects/${projectId}/media/${id}`, { method: 'DELETE' })
    if (editingLot.value.medias) {
      editingLot.value.medias = editingLot.value.medias.filter((m: any) => m.id !== id)
    }
    toastSuccess('Foto excluída')
  } catch (e) {
    toastFromError(e, 'Erro ao excluir foto')
  }
}

const locationOrigin = computed(() => {
  if (typeof window !== 'undefined') return window.location.origin
  return ''
})

const publicUrl = computed(() => project.value ? `/${project.value.slug}` : null)

const editForm = ref({
  name: '',
  slug: '',
  description: '',
  showPaymentConditions: false,
  customDomain: '',
  reservationFeeType: 'FIXED',
  reservationFeeValue: 500,
  reservationExpiryHours: 24,
  minDownPaymentPercent: 10,
  minDownPaymentValue: 0,
  maxInstallments: 180,
  monthlyInterestRate: 0.9,
  indexer: 'IGP-M',
  allowIntermediary: false,
  financingDisclaimer: 'Simulação baseada nas regras vigentes. Sujeito à aprovação de crédito e alteração de taxas.',
  aiEnabled: false,
  aiConfigId: '',
  paymentConditions: [] as any[]
})

// ── Live Preview Logic ──────────────────────────────────
const previewDownPayment = ref(0)
const previewMonths = ref(120)
const previewLotPrice = ref(200000)

const minDownPaymentValueForPreview = computed(() => {
  const percentVal = (previewLotPrice.value * (editForm.value.minDownPaymentPercent || 0)) / 100
  const fixedVal = editForm.value.minDownPaymentValue || 0
  return Math.max(percentVal, fixedVal)
})

watch(() => editForm.value.minDownPaymentPercent, () => {
  if (previewDownPayment.value < minDownPaymentValueForPreview.value) {
    previewDownPayment.value = minDownPaymentValueForPreview.value
  }
}, { immediate: true })

watch(previewLotPrice, () => {
  if (previewDownPayment.value < minDownPaymentValueForPreview.value) {
    previewDownPayment.value = minDownPaymentValueForPreview.value
  }
})

const previewResult = computed(() => {
  const price = previewLotPrice.value
  const down = previewDownPayment.value
  const months = previewMonths.value
  const rate = (editForm.value.monthlyInterestRate || 0) / 100
  
  const amount = price - down
  if (amount <= 0) return 0
  
  if (rate === 0) return amount / months
  
  // Amortização PRICE formula: PMT = P * (i * (1 + i)^n) / ((1 + i)^n - 1)
  const pmt = amount * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1)
  return pmt
})

const previewTotalInvested = computed(() => {
  const down = previewDownPayment.value || 0
  return down + (previewResult.value * previewMonths.value)
})

const previewTotalInterest = computed(() => {
  return previewTotalInvested.value - previewLotPrice.value
})

const annualInterestRateEffective = computed(() => {
  const i = (editForm.value.monthlyInterestRate || 0) / 100
  if (i === 0) return 0
  return (Math.pow(1 + i, 12) - 1) * 100
})

const updatePercentFromDownPaymentPreview = () => {
  if (previewDownPayment.value < minDownPaymentValueForPreview.value) {
    previewDownPayment.value = minDownPaymentValueForPreview.value
  }
}

const previewDownPaymentPercent = computed({
  get: () => {
    if (!previewLotPrice.value) return 0
    return Math.round((previewDownPayment.value / previewLotPrice.value * 100) * 10) / 10
  },
  set: (val) => {
    previewDownPayment.value = (previewLotPrice.value * val) / 100
    if (previewDownPayment.value < minDownPaymentValueForPreview.value) {
      previewDownPayment.value = minDownPaymentValueForPreview.value
    }
  }
})
// ─────────────────────────────────────────────────────────

// ── Public info (highlights + location) ──────────────────
const richEditor = ref<HTMLElement | null>(null);
const initialEditorContent = ref('');

const execCommand = (cmd: string, val = '') => {
  document.execCommand(cmd, false, val);
  updateFromEditor();
};

const updateFromEditor = () => {
  if (richEditor.value) {
    pubInfoForm.value.locationText = richEditor.value.innerHTML;
  }
};

const pubInfoForm = ref({
  highlightsJson: [] as Highlight[],
  highlightsTitle: '',
  highlightsSubtitle: '',
  traditionalHighlightsTitle: '',
  traditionalHighlightsSubtitle: '',
  locationText: '',
  startingPrice: null as number | null,
  maxInstallments: null as number | null,
  paymentConditionsSummary: '',
  address: '',
  googleMapsUrl: '',
  youtubeVideoUrl: '',
  constructionStatus: [] as { label: string, percentage: number }[]
})
const savingPubInfo = ref(false)
const pubInfoSaved = ref(false)
const newHighlight = ref({ label: '', value: '' })
const newWorkStage = ref({ label: '', percentage: 0 })

// Infraestrutura Categorizada
const newInfraCategory = ref('')
const infraItemInputs = ref<Record<number, string>>({}) // Unique input for each category
const addingItemsToCategory = ref<number | null>(null)

const addInfraCategory = () => {
  if (!newInfraCategory.value) return
  pubInfoForm.value.highlightsJson = [...pubInfoForm.value.highlightsJson, { 
    type: 'category', 
    title: newInfraCategory.value, 
    items: [] 
  }]
  newInfraCategory.value = ''
}

const addInfraItem = (catIdx: number) => {
  const value = infraItemInputs.value[catIdx]
  if (!value) return
  
  const cat = pubInfoForm.value.highlightsJson[catIdx]
  if (cat && cat.type === 'category') {
    if (!cat.items) cat.items = []
    cat.items.push(value)
    infraItemInputs.value[catIdx] = '' // Clear only this specific input
  }
}

const removeInfraItem = (catIdx: number, itemIdx: number) => {
  const cat = pubInfoForm.value.highlightsJson[catIdx]
  if (cat && cat.type === 'category' && cat.items) {
    cat.items.splice(itemIdx, 1)
  }
}

const addHighlight = () => {
  if (!newHighlight.value.label) return
  pubInfoForm.value.highlightsJson = [...pubInfoForm.value.highlightsJson, { type: 'highlight' as const, icon: '✅', ...newHighlight.value }]
  newHighlight.value = { label: '', value: '' }
}
const removeHighlight = (i: number) => {
  pubInfoForm.value.highlightsJson = pubInfoForm.value.highlightsJson.filter((_, idx) => idx !== i)
}

const addWorkStage = () => {
  if (!newWorkStage.value.label) return
  pubInfoForm.value.constructionStatus = [...pubInfoForm.value.constructionStatus, { ...newWorkStage.value }]
  newWorkStage.value = { label: '', percentage: 0 }
}
const removeWorkStage = (i: number) => {
  pubInfoForm.value.constructionStatus = pubInfoForm.value.constructionStatus.filter((_, idx) => idx !== i)
}

const savePubInfo = async () => {
  savingPubInfo.value = true; pubInfoSaved.value = false
  try {
    let mapUrl = pubInfoForm.value.googleMapsUrl || '';
    if (mapUrl.includes('<iframe')) {
      const match = mapUrl.match(/src=["'](.+?)["']/);
      if (match && match[1]) mapUrl = match[1];
    }

    let ytUrl = pubInfoForm.value.youtubeVideoUrl || '';
    if (ytUrl.includes('youtube.com/watch?v=')) {
      ytUrl = ytUrl.replace('watch?v=', 'embed/');
    } else if (ytUrl.includes('youtu.be/')) {
      ytUrl = ytUrl.replace('youtu.be/', 'www.youtube.com/embed/');
    }

    project.value = await fetchApi(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ 
        highlightsJson: pubInfoForm.value.highlightsJson, 
        highlightsTitle: pubInfoForm.value.highlightsTitle,
        highlightsSubtitle: pubInfoForm.value.highlightsSubtitle,
        traditionalHighlightsTitle: pubInfoForm.value.traditionalHighlightsTitle,
        traditionalHighlightsSubtitle: pubInfoForm.value.traditionalHighlightsSubtitle,
        locationText: pubInfoForm.value.locationText,
        startingPrice: pubInfoForm.value.startingPrice ? Number(pubInfoForm.value.startingPrice) : null,
        maxInstallments: pubInfoForm.value.maxInstallments ? Number(pubInfoForm.value.maxInstallments) : null,
        paymentConditionsSummary: pubInfoForm.value.paymentConditionsSummary || null,
        address: pubInfoForm.value.address || null,
        googleMapsUrl: mapUrl || null,
        youtubeVideoUrl: ytUrl || null,
        constructionStatus: pubInfoForm.value.constructionStatus
      }),
    })
    pubInfoSaved.value = true
    toastSuccess('Informações públicas salvas!')
    setTimeout(() => pubInfoSaved.value = false, 2000)
  } catch (e) { toastFromError(e, 'Erro ao salvar') }
  savingPubInfo.value = false
}

// ── Corretores ────────────────────────────────────────────
const corretores = ref<Corretor[]>([])
const loadingCorretores = ref(false)
const showNewCorretor = ref(false)
const creatingCorretor = ref(false)
const corretorForm = ref({ name: '', phone: '', email: '', code: '', creci: '', photoUrl: '', enabled: true, notes: '' })
const corretorError = ref('')
const emailError = ref('')
const codeError = ref('')
const emailAvailable = ref(false)
const codeAvailable = ref(false)
const emailLoading = ref(false)
const codeLoading = ref(false)
const slugManuallyEdited = ref(false)

let emailDebounceTimer: any = null
let codeDebounceTimer: any = null

watch(() => corretorForm.value.email, (email) => {
  emailError.value = ''
  emailAvailable.value = false
  if (!email || !email.includes('@')) return
  
  clearTimeout(emailDebounceTimer)
  emailDebounceTimer = setTimeout(async () => {
    emailLoading.value = true
    try {
      const res = await fetchApi(`/realtor-links/check-email?email=${email}`)
      if (!res.available) {
        emailError.value = 'Já existe um usuário com este email.'
      } else {
        emailAvailable.value = true
      }
    } catch {
      // Ignora erro na verificação
    } finally {
      emailLoading.value = false
    }
  }, 600)
})

watch(() => corretorForm.value.code, (code) => {
  codeError.value = ''
  codeAvailable.value = false
  if (!code) return
  
  clearTimeout(codeDebounceTimer)
  codeDebounceTimer = setTimeout(async () => {
    codeLoading.value = true
    try {
      const res = await fetchApi(`/realtor-links/check-code?code=${code}`)
      if (!res.available) {
        codeError.value = 'Este código já está sendo usado por outro corretor.'
      } else {
        codeAvailable.value = true
      }
    } catch {
      // Ignora erro na verificação
    } finally {
      codeLoading.value = false
    }
  }, 600)
})

function onNameInput() {
  if (!slugManuallyEdited.value) {
    corretorForm.value.code = corretorForm.value.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}

const loadCorretores = async () => {
  loadingCorretores.value = true
  try {
    corretores.value = await fetchApi(`/realtor-links?projectId=${projectId}`)
  } catch (e) { toastFromError(e, 'Erro ao carregar corretores') }
  loadingCorretores.value = false
}

const createCorretor = async () => {
  if (emailError.value || codeError.value) {
    toastFromError(new Error('Corrija os erros no formulário antes de salvar'))
    return
  }

  creatingCorretor.value = true; corretorError.value = ''
  try {
    const c = await fetchApi('/realtor-links', {
      method: 'POST',
      body: JSON.stringify({ ...corretorForm.value, projectIds: [projectId] }),
    })
    corretores.value.unshift(c)
    showNewCorretor.value = false
    corretorForm.value = { name: '', phone: '', email: '', code: '', creci: '', photoUrl: '', enabled: true, notes: '' }
    slugManuallyEdited.value = false
    emailError.value = ''
    codeError.value = ''
    emailAvailable.value = false
    codeAvailable.value = false
    toastSuccess('Corretor criado!')
  } catch (e: any) {
    corretorError.value = e.message || 'Erro ao criar'
    toastFromError(e, 'Erro ao criar corretor')
  }
  creatingCorretor.value = false
}

const toggleCorretor = async (c: Corretor) => {
  try {
    const updated = await fetchApi(`/realtor-links/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !c.enabled }),
    })
    Object.assign(c, updated)
  } catch (e: any) { toastFromError(e, 'Erro ao atualizar corretor') }
}

const deleteCorretor = async (c: Corretor) => {
  if (!confirm(`Excluir corretor "${c.name}"?`)) return
  try {
    await fetchApi(`/realtor-links/${c.id}`, { method: 'DELETE' })
    corretores.value = corretores.value.filter(x => x.id !== c.id)
    toastSuccess('Corretor excluído')
  } catch (e: any) { toastFromError(e, 'Erro ao excluir corretor') }
}

const corretorLotLink = (c: Corretor, lotCode?: string) => {
  if (!publicUrl.value) return ''
  return `${window?.location?.origin || ''}${publicUrl.value}?c=${c.code}${lotCode ? `#lote-${lotCode}` : ''}`
}

const copyLink = (text: string) => {
  navigator.clipboard.writeText(text)
  toastSuccess('Link copiado!')
}

// ── Payment Configuration ────────────────────────────────
const allConfigs = ref<PaymentConfig[]>([])
const activeConfigs = ref<PaymentConfig[]>([])
const loadingPaymentOptions = ref(false)

const loadPaymentConfig = async () => {
  loadingPaymentOptions.value = true
  try {
    // We get the list of all gateways with their enablement status for this project
    const configs = await fetchApi(`/admin/payment-config/project/${projectId}`)
    allConfigs.value = configs || []

    // activeConfigs is used for the UI to know which ones are toggled on
    activeConfigs.value = (allConfigs.value || []).filter(c => c.isEnabledForProject)
  } catch (e) {
    console.error('Error loading payment configs', e)
  } finally {
    loadingPaymentOptions.value = false
  }
}

const isConfigActive = (configId: string) => {
  return activeConfigs.value.some(c => c.id === configId)
}

const toggleGateway = async (configId: string, active: boolean) => {
  try {
    await fetchApi(`/admin/payment-config/project/${projectId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ gatewayId: configId, enabled: active })
    })
    
    if (active) {
      const config = allConfigs.value.find(c => (c as any).id === configId)
      if (config) activeConfigs.value.push(config)
    } else {
      activeConfigs.value = activeConfigs.value.filter(c => (c as any).id !== configId)
    }
    
    toastSuccess('Gateway alterado para o projeto')
  } catch (e) {
    toastFromError(e, 'Erro ao alternar gateway')
  }
}
// ─────────────────────────────────────────────────────────

// ── AI Configuration ─────────────────────────────────────
const aiConfigs = ref<AiConfig[]>([])
const loadAiConfigs = async () => {
  try {
    const res = await fetchApi('/ai/configs')
    aiConfigs.value = res || []
  } catch (e) {
    console.error('Error loading AI configs', e)
  }
}
// ─────────────────────────────────────────────────────────

// ── Tabs ─────────────────────────────────────────────────
const tabs = [
  { key: 'lots', label: '📍 Lotes' },
  { key: 'public', label: '📄 Pág. Pública' },
  { key: 'financing', label: '🧮 Simulação' },
  { key: 'payment', label: '💳 Pagamentos' },
  { key: 'ai', label: '🤖 Assistente IA' },
  { key: 'settings', label: '⚙️ Config' },
]

const lotBadge = (s: string) => ({ AVAILABLE: 'badge-success', RESERVED: 'badge-warning', SOLD: 'badge-danger' }[s] || 'badge-neutral')
const lotLabel = (s: string) => ({ AVAILABLE: 'Disponível', RESERVED: 'Reservado', SOLD: 'Vendido' }[s] || s)
const slopeLabel = (s: string) => ({ FLAT: 'Plano', UPHILL: 'Aclive', DOWNHILL: 'Declive' }[s] || s)

const formatCurrencyToBrasilia = (val: number | string) => {
  if (!val) return '---'
  const num = typeof val === 'string' ? parseFloat(val) : val
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

const loadLotsPaginated = async (page = 1) => {
  try {
    const res = await fetchApi(`/projects/${projectId}/lots?page=${page}&limit=50`)
    lots.value = res.data
    lotsMeta.value = res.meta
  } catch (e) {
    toastFromError(e, 'Erro ao carregar lotes')
  }
}

const loadProject = async () => {
  loading.value = true
  error.value = ''
  try {
    const [p, els, resLots, md] = await Promise.all([
      fetchApi(`/projects/${projectId}`),
      fetchApi(`/projects/${projectId}/map-elements`),
      fetchApi(`/projects/${projectId}/lots?page=1&limit=50`),
      fetchApi(`/projects/${projectId}/media`),
    ])
    project.value = p
    mapElements.value = els
    lots.value = resLots.data
    lotsMeta.value = resLots.meta
    media.value = md
    loadPaymentConfig()
    editForm.value = {
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      showPaymentConditions: p.showPaymentConditions ?? false,
      customDomain: p.customDomain || '',
      reservationFeeType: p.reservationFeeType || 'FIXED',
      reservationFeeValue: p.reservationFeeValue ?? 500,
      reservationExpiryHours: p.reservationExpiryHours ?? 24,
      minDownPaymentPercent: p.minDownPaymentPercent ?? 10,
      minDownPaymentValue: p.minDownPaymentValue ?? 0,
      monthlyInterestRate: p.monthlyInterestRate ?? 0.9,
      indexer: p.indexer || 'IGP-M',
      allowIntermediary: p.allowIntermediary ?? false,
      financingDisclaimer: p.financingDisclaimer || 'Simulação baseada nas regras vigentes. Sujeito à aprovação de crédito e alteração de taxas.',
      aiEnabled: p.aiEnabled ?? false,
      aiConfigId: p.aiConfigId || '',
      maxInstallments: p.maxInstallments ?? 180,
      paymentConditions: Array.isArray(p.paymentConditions) ? [...p.paymentConditions] : []
    }
    loadAiConfigs()
    pubInfoForm.value = {
      highlightsJson: Array.isArray(p.highlightsJson) ? p.highlightsJson : [],
      highlightsTitle: p.highlightsTitle || 'Sua família merece o melhor.',
      highlightsSubtitle: p.highlightsSubtitle || 'Qualidade de vida, segurança e infraestrutura completa em um só lugar.',
      traditionalHighlightsTitle: p.traditionalHighlightsTitle || 'Destaques',
      traditionalHighlightsSubtitle: p.traditionalHighlightsSubtitle || 'Diferenciais pensados para o seu bem-estar.',
      locationText: p.locationText || '',
      startingPrice: p.startingPrice,
      maxInstallments: p.maxInstallments,
      paymentConditionsSummary: p.paymentConditionsSummary || '',
      address: p.address || '',
      googleMapsUrl: p.googleMapsUrl || '',
      youtubeVideoUrl: p.youtubeVideoUrl || '',
      constructionStatus: Array.isArray(p.constructionStatus) ? p.constructionStatus : []
    }
    initialEditorContent.value = p.locationText || '<p></p>'
  } catch (e) {
    error.value = 'Não foi possível carregar o projeto.'
    toastFromError(e, 'Erro ao carregar projeto')
  }
  loading.value = false
}

const togglePublish = async () => {
  const action = project.value.status === 'PUBLISHED' ? 'unpublish' : 'publish'
  try {
    project.value = await fetchApi(`/projects/${projectId}/${action}`, { method: 'PATCH' })
    toastSuccess(action === 'publish' ? 'Projeto publicado!' : 'Projeto despublicado')
  } catch (e) {
    toastFromError(e, 'Erro ao alterar publicação')
  }
}

const saveSettings = async () => {
  savingSettings.value = true; settingsError.value = ''; settingsSaved.value = false
  try {
    project.value = await fetchApi(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(editForm.value) })
    settingsSaved.value = true
    toastSuccess('Configurações salvas!')
    setTimeout(() => settingsSaved.value = false, 2000)
  } catch (e: any) {
    settingsError.value = e.message
    toastFromError(e, 'Erro ao salvar configurações')
  }
  savingSettings.value = false
}

const confirmDelete = async () => {
  if (!confirm('Tem certeza que deseja excluir este projeto?')) return
  try {
    await fetchApi(`/projects/${projectId}`, { method: 'DELETE' })
    toastSuccess('Projeto excluído!')
    router.push('/painel/projetos')
  } catch (e) {
    toastFromError(e, 'Erro ao excluir projeto')
  }
}

const uploadBannerImage = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingBanner.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    project.value = await uploadApi(`/projects/${projectId}/banner-image`, fd)
    toastSuccess('Banner do projeto enviado!')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar banner')
  }
  (e.target as HTMLInputElement).value = ''
  uploadingBanner.value = false
}

const removeBannerImage = async () => {
  try {
    project.value = await fetchApi(`/projects/${projectId}/banner-image`, { method: 'DELETE' })
    toastSuccess('Banner removido')
  } catch (e: any) {
    toastFromError(e, 'Erro ao remover banner')
  }
}

const uploadMediaFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingMedia.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const m = await uploadApi(`/projects/${projectId}/media`, fd)
    media.value.unshift(m)
    toastSuccess('Mídia enviada!')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar mídia')
  }
  (e.target as HTMLInputElement).value = ''
  uploadingMedia.value = false
}

const deleteMedia = async (id: string) => {
  if (!confirm('Excluir esta mídia?')) return
  try {
    await fetchApi(`/projects/${projectId}/media/${id}`, { method: 'DELETE' })
    media.value = media.value.filter(m => m.id !== id)
    toastSuccess('Mídia excluída')
  } catch (e: any) {
    toastFromError(e, 'Erro ao excluir mídia')
  }
}

onMounted(async () => {
  await loadProject()
  await loadCorretores()
  if (typeof document !== 'undefined') {
    document.execCommand('defaultParagraphSeparator', false, 'p');
  }
})
</script>

<style scoped>
.media-card-v4 {
  position: relative; border-radius: 12px; overflow: hidden; border: 1px solid var(--gray-200); background: #f9f9fb; transition: all 0.2s; aspect-ratio: 16/10;
}
.media-card-v4:hover { border-color: var(--primary); transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.media-thumb-v4 { width: 100%; height: 100%; object-fit: cover; display: block; }

.media-delete-btn-v4 { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border-radius: 50%; border: none; background: rgba(255, 30, 0, 0.1); color: #ff3b30; font-size: 14px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.media-delete-btn-v4:hover { background: #ff3b30; color: white; transform: scale(1.1); }

/* Overlays para a Galeria */
.media-overlay-v4 { position: absolute; inset: 0; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; opacity: 0; transition: opacity 0.2s; background: linear-gradient(to top, rgba(0,0,0,0.4), transparent); }
.media-card-v4:hover .media-overlay-v4 { opacity: 1; }
.media-type-pill { background: rgba(255,255,255,0.9); color: #1d1d1f; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; width: fit-content; }
.delete-btn-circ { width: 32px; height: 32px; border-radius: 50%; border: none; background: white; color: #ff3b30; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-left: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.delete-btn-circ:hover { background: #ff3b30; color: white; transform: rotate(90deg); }

.media-card {
  border: 1px solid var(--gray-200); border-radius: var(--radius-md); overflow: hidden; background: white;
}
.media-thumb { width: 100%; height: 160px; object-fit: cover; display: block; }
.media-info { padding: var(--space-3); display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; color: var(--gray-600); }

.rich-editor-v4 {
  background: white !important;
  color: var(--gray-800);
  border: 1px solid var(--gray-300) !important;
  transition: all 0.2s;
  outline: none;
}
.rich-editor-v4:focus {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 4px var(--primary-light) !important;
}
.rich-editor-v4.disabled {
  background: var(--gray-50) !important;
  pointer-events: none;
  opacity: 0.7;
}
.rich-editor-v4 :deep(p), .rich-editor-v4 p, .rich-editor-v4 :deep(div), .rich-editor-v4 div { margin-bottom: 0.75rem; }
.rich-editor-v4 :deep(ul), .rich-editor-v4 ul { padding-left: 1.5rem; margin-bottom: 1rem; list-style-type: disc; }
.rich-editor-v4 :deep(li), .rich-editor-v4 li { margin-bottom: 0.25rem; }
.rich-editor-v4 :deep(b), .rich-editor-v4 b, .rich-editor-v4 :deep(strong), .rich-editor-v4 strong { font-weight: 700; color: #000; }

.provider-badge-sm {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 800;
  color: white;
  text-transform: uppercase;
}
.provider-badge-sm.stripe { background: #635bff; }
.provider-badge-sm.asaas { background: #0062ff; }
.provider-badge-sm.mercado_pago { background: #009ee3; }
.provider-badge-sm.pagar_me { background: #3c5af4; }
.provider-badge-sm.pagseguro { background: #3fb43f; }

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--gray-300);
  transition: .4s;
  border-radius: 24px;
}
.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}
.toggle-switch input:checked + label {
  background-color: var(--primary);
}
.toggle-switch input:checked + label:before {
  transform: translateX(20px);
}

.form-input.is-valid {
  border-color: #10b981 !important;
  padding-right: 32px;
}
.form-input.is-valid:focus {
  border-color: #10b981 !important;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1) !important;
}
.form-input.is-invalid {
  border-color: #ef4444 !important;
}

/* Financing Layout */
.financing-layout-v4 {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}
@media (max-width: 1200px) {
  .financing-layout-v4 { flex-direction: column; }
  .financing-preview-sidebar { width: 100% !important; flex: none !important; position: static !important; }
}
.financing-preview-sidebar {
  flex: 0 0 380px;
  position: sticky;
  top: 20px;
}
.preview-header {
  margin-bottom: 20px;
}
.preview-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--gray-800);
}
.preview-header p {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: var(--gray-500);
}

/* Simulator V4 Styles (Copied from LotDetailsView) */
:root {
  --v4-primary: #0071e3;
  --v4-primary-light: rgba(0, 113, 227, 0.05);
  --v4-border: #d2d2d7;
  --v4-text: #1d1d1f;
  --v4-text-muted: #86868b;
}

.simulator-card-v4 {
  background: white;
  border-radius: 24px;
  border: 1px solid var(--v4-border);
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
}
.sim-header {
  padding: 24px;
  background: #f8fafc;
  border-bottom: 1px solid var(--v4-border);
}
.sim-header .h-item { display: flex; flex-direction: column; gap: 4px; padding: 0; }
.sim-header .l { font-size: 12px; color: var(--v4-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
.sim-header .v { font-weight: 700; color: var(--v4-primary); }

.sim-body { padding: 24px; }

.input-group-v4 { display: flex; flex-direction: column; gap: 8px; }
.ig-label { font-size: 14px; font-weight: 600; color: var(--v4-text); }
.ig-flex { display: flex; gap: 8px; }
.ig-field { 
  display: flex; 
  align-items: center; 
  background: #f1f5f9; 
  border: 1px solid #e2e8f0; 
  border-radius: 10px; 
  padding: 0 12px;
  flex: 1;
}
.ig-curr { font-size: 12px; font-weight: 700; color: #64748b; }
.ig-input { 
  border: none !important; 
  background: transparent !important; 
  width: 100% !important; 
  padding: 10px 6px !important; 
  font-size: 16px !important; 
  font-weight: 700 !important; 
  color: var(--v4-text) !important; 
  outline: none !important;
  box-shadow: none !important;
  height: auto !important;
}
.ig-hint { font-size: 12px; color: #64748b; margin-top: 2px; }

.range-slider-v4 {
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e2e8f0;
  outline: none;
  margin: 15px 0;
}
.range-slider-v4::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--v4-primary);
  cursor: pointer;
  border: 3px solid white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.slider-labels { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; font-weight: 600; }

.sim-result-v4 {
  margin-top: 30px;
  background: var(--v4-primary-light);
  padding: 24px;
  border-radius: 16px;
  text-align: center;
  border: 1px solid rgba(0, 112, 227, 0.1);
}
.r-label { font-size: 13px; font-weight: 600; color: var(--v4-primary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
.r-value { font-weight: 800; color: var(--v4-primary); letter-spacing: -1px; }
.r-detail { font-size: 12px; color: var(--v4-primary); opacity: 0.8; font-weight: 600; margin-top: 4px; }

.sim-disclaimer-v4 {
  margin-top: 20px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  text-align: center;
}

/* Standardized Remove Buttons */
.btn-remove-v4 {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ff3b30; /* Apple Red */
  border: 2px solid white;
  color: white;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  font-size: 12px;
  transition: all 0.2s;
  z-index: 10;
}
.btn-remove-v4:hover {
  transform: scale(1.1);
  background: #d70015;
}

/* Infrastructure Badges */
.infra-badge-v4 {
  background: #f5f5f7;
  color: #1d1d1f;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #d2d2d7;
}

.infra-badge-remove {
  cursor: pointer;
  width: 18px;
  height: 18px;
  background: #d2d2d7;
  color: #1d1d1f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s;
}
.infra-badge-remove:hover {
  background: #ff3b30;
  color: white;
}
</style>
