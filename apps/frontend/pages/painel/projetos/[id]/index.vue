<template>
  <div>
    <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" style="margin-top: var(--space-4);" @click="loadProject">Tentar novamente</button>
    </div>

    <template v-else-if="project">
      <div class="page-header" style="align-items: center; border-bottom: 1px solid var(--gray-100); padding-bottom: var(--space-6); margin-bottom: var(--space-8);">
        <div style="flex: 1;">
          <div class="flex items-center gap-2" style="margin-bottom: var(--space-2);">
            <NuxtLink to="/painel/projetos" class="btn btn-ghost btn-sm" style="padding-left: 0;">&larr; Projetos</NuxtLink>
            <div style="width: 1px; height: 12px; background: var(--gray-300);"></div>
            <span class="badge" :class="project.status === 'PUBLISHED' ? 'badge-success' : 'badge-neutral'" style="font-size: 0.65rem; padding: 2px 8px; text-transform: uppercase;">
              {{ project.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho' }}
            </span>
          </div>
          <h1 style="margin: 0; font-size: 1.5rem;">{{ project.name }}</h1>
          <p style="margin: 0; color: var(--gray-500);">{{ project.description || 'Sem descrição' }}</p>
        </div>

        <div class="flex items-center gap-3">
          <a
            v-if="project.status === 'PUBLISHED'"
            :href="`/${project.slug}`"
            target="_blank"
            class="btn btn-sm btn-outline"
            style="display: flex; align-items: center; gap: 8px; border-radius: 64px; padding-left: 16px; padding-right: 16px; border-color: var(--primary-50); background: var(--primary-light); color: var(--primary);"
          >
            <span style="font-size: 1rem;">🌐</span>
            <span style="font-weight: 600;">Ver Página Pública</span>
          </a>

          <div style="width: 1px; height: 32px; background: var(--gray-200); margin: 0 var(--space-1);"></div>

          <div class="flex items-center gap-2">
            <button 
              v-if="authStore.canEdit" 
              class="btn btn-sm" 
              :class="project.status === 'PUBLISHED' ? 'btn-secondary' : 'btn-success'" 
              style="font-weight: 600; border-radius: 64px; padding-left: 20px; padding-right: 20px; height: 38px;"
              @click="togglePublish"
            >
              {{ project.status === 'PUBLISHED' ? '⏸️ Parar Publicação' : '📡 Publicar Agora' }}
            </button>
            
            <button 
              v-if="authStore.canEdit" 
              class="btn btn-sm" 
              style="color: var(--danger); background: var(--danger-light); font-weight: 600; border-radius: 64px; padding-left: 16px; padding-right: 16px; border: 1px solid transparent;"
              @mouseenter="($event.target as any).style.borderColor = 'var(--danger)'"
              @mouseleave="($event.target as any).style.borderColor = 'transparent'"
              @click="confirmDelete"
            >
              🗑️ Excluir
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="filter-bar" style="display: flex; align-items: center; gap: 4px;">
        <button v-for="t in tabs" :key="t.key" class="filter-btn" :class="{ active: activeTab === t.key }" @click="activeTab = t.key">
          {{ t.label }}
        </button>
        <!-- Planta Interativa — main visual tool -->
        <NuxtLink :to="`/painel/projetos/${projectId}/planta`" class="filter-btn active" style="text-decoration: none; background: var(--primary); color: white;">
          🗺️ Planta Interativa
        </NuxtLink>
        <!-- Panorama 360° -->
        <NuxtLink :to="`/painel/projetos/${projectId}/panorama`" class="filter-btn" style="text-decoration: none; background: var(--gray-700); color: white;">
          🌄 Panorama 360°
        </NuxtLink>
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
            
            <div class="flex justify-end" style="margin-top: 20px;">
              <button class="btn btn-primary" @click="saveSettings" :disabled="savingSettings" style="min-width: 200px;">
                {{ savingSettings ? 'Salvando...' : '💾 Salvar Configuração de Taxa' }}
              </button>
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
              <tr><th>Código</th><th>Nome</th><th>Tipo</th><th>Status</th><th>Preço</th><th>Área</th><th>Inclinação</th><th v-if="authStore.canEdit">Ações</th></tr>
            </thead>
            <tbody>
              <tr v-for="l in lots" :key="l.id">
                <td><code>{{ l.mapElement?.code || '—' }}</code></td>
                <td>{{ l.mapElement?.name || '—' }}</td>
                <td>
                  <span class="badge badge-neutral" style="font-size: 10px;">{{ l.mapElement?.type === 'LOT' ? 'Lote' : 'Ponto' }}</span>
                </td>
                <td>
                  <span class="badge" :class="lotBadge(l.status)">{{ lotLabel(l.status) }}</span>
                </td>
                <td>{{ l.price ? formatCurrencyToBrasilia(l.price) : '—' }}</td>
                <td>{{ l.areaM2 ? `${l.areaM2} m²` : '—' }}</td>
                <td>{{ slopeLabel(l.slope) }}</td>
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
              <label class="form-label">Status</label>
              <select v-model="lotForm.status" class="form-input">
                <option value="AVAILABLE">Disponível</option>
                <option value="RESERVED">Reservado</option>
                <option value="SOLD">Vendido</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Preço (R$)</label>
              <input v-model.number="lotForm.price" type="number" step="0.01" class="form-input" placeholder="0.00" />
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
                  <button class="btn btn-sm" style="padding: 4px;" @click="removeParcelaInForm(i)">✕</button>
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
        <div class="flex justify-between items-center" style="margin-bottom: var(--space-6);">
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

        <div class="card-grid" style="display: grid; grid-template-columns: 1fr; gap: var(--space-6);">
          
          <!-- Section: Hero Banner -->
          <section class="card" style="padding: var(--space-6);">
            <div class="flex items-center gap-3" style="margin-bottom: var(--space-4);">
              <div style="width: 40px; height: 40px; background: var(--primary-light); color: var(--primary); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">🖼️</div>
              <div>
                <h3 style="margin:0;">Banner do Loteamento</h3>
                <p style="font-size: 0.8125rem; margin:0; color: var(--gray-500);">A primeira impressão da sua página pública.</p>
              </div>
            </div>

            <div v-if="project.bannerImageUrl" class="banner-preview" style="position: relative; margin-bottom: var(--space-4); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm); aspect-ratio: 16/5;">
              <img :src="project.bannerImageUrl" alt="Banner" style="width: 100%; height: 100%; object-fit: cover;" />
              <div v-if="authStore.canEdit" style="position: absolute; bottom: 12px; right: 12px;">
                <button class="btn btn-danger btn-sm" @click="removeBannerImage">🗑️ Remover Banner</button>
              </div>
            </div>
            
            <div v-else class="banner-placeholder" style="margin-bottom: var(--space-4); border: 2px dashed var(--gray-200); background: var(--gray-50); border-radius: var(--radius-lg); padding: var(--space-8); text-align: center;">
              <div style="font-size: 2.5rem; margin-bottom: var(--space-2); opacity: 0.3;">🌅</div>
              <p style="color: var(--gray-500); font-size: 0.875rem;">Nenhum banner configurado. O topo da página será azul padrão.</p>
            </div>

            <div v-if="authStore.canEdit" class="flex justify-start">
              <label class="btn btn-secondary" style="cursor:pointer; display: flex; align-items: center; gap: 8px;">
                <span>{{ uploadingBanner ? '⌛ Enviando...' : (project.bannerImageUrl ? '🔄 Trocar Imagem' : '📤 Upload do Banner') }}</span>
                <input type="file" accept="image/*" style="display:none" @change="uploadBannerImage" :disabled="uploadingBanner" />
              </label>
            </div>
          </section>

          <!-- Section: Media Gallery -->
          <section class="card" style="padding: var(--space-6);">
            <div class="flex items-center gap-3" style="margin-bottom: var(--space-4);">
              <div style="width: 40px; height: 40px; background: #dcfce7; color: #166534; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">📸</div>
              <div style="flex: 1;">
                <h3 style="margin:0;">Galeria de Mídia</h3>
                <p style="font-size: 0.8125rem; margin:0; color: var(--gray-500);">Fotos e vídeos que serão exibidos na galeria pública do loteamento.</p>
              </div>
              <div v-if="authStore.canEdit">
                <label class="btn btn-primary btn-sm" style="cursor:pointer;">
                  {{ uploadingMedia ? 'Enviando...' : '+ Upload Mídia' }}
                  <input type="file" accept="image/*,video/*" style="display:none" @change="uploadMediaFile" :disabled="uploadingMedia" />
                </label>
              </div>
            </div>

            <div v-if="media.length === 0" class="empty-state" style="padding: var(--space-8); background: var(--gray-50); border-radius: var(--radius-lg);">
              <p>Nenhuma mídia de loteamento enviada.</p>
            </div>
            <div v-else class="grid grid-cols-4" style="gap: var(--space-5);">
              <div v-for="m in media" :key="m.id" class="media-card-v4" style="aspect-ratio: 16/10;">
                <img v-if="m.type === 'PHOTO'" :src="m.url" :alt="m.caption" class="media-thumb-v4" />
                <video v-else :src="m.url" class="media-thumb-v4" />
                <div class="media-overlay-v4">
                   <div class="media-type-pill">{{ m.type === 'PHOTO' ? '🖼️ Foto' : '🎬 Vídeo' }}</div>
                   <button v-if="authStore.canEdit" class="delete-btn-circ" title="Remover" @click="deleteMedia(m.id)">✕</button>
                </div>
              </div>
            </div>
          </section>

          <!-- Section: Highlights -->
          <section class="card" style="padding: var(--space-6);">
            <div class="flex items-center gap-3" style="margin-bottom: var(--space-6);">
              <div style="width: 40px; height: 40px; background: var(--primary-light); color: var(--primary); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">⭐</div>
              <div>
                <h3 style="margin:0;">Cards de Destaque</h3>
                <p style="font-size: 0.8125rem; margin:0; color: var(--gray-500);">Destaque os principais diferenciais do loteamento.</p>
              </div>
            </div>

            <!-- List highlights as cards -->
            <div v-if="pubInfoForm.highlightsJson.length" class="highlights-preview-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
              <div v-for="(h, i) in pubInfoForm.highlightsJson" :key="i" class="highlight-item-card" style="padding: var(--space-4); border: 1px solid var(--gray-200); border-radius: var(--radius-lg); position: relative; background: white; display: flex; items-start; gap: 12px;">
                <div style="font-size: 1.5rem; flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: #ecfdf5; color: #059669; border-radius: var(--radius-md);">✅</div>
                <div style="flex: 1;">
                  <strong style="display: block; font-size: 0.9375rem; color: var(--gray-800);">{{ h.label }}</strong>
                  <span style="font-size: 0.8125rem; color: var(--gray-500);">{{ h.value }}</span>
                </div>
                <button v-if="authStore.canEdit" class="btn btn-xs" style="padding: 4px; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; position: absolute; top: -8px; right: -8px; background: var(--danger); border: none; color: white; cursor: pointer; box-shadow: var(--shadow-sm);" title="Remover" @click="removeHighlight(i)">✕</button>
              </div>
            </div>

            <!-- New highlight form -->
            <div v-if="authStore.canEdit" style="background: var(--gray-50); padding: var(--space-5); border-radius: var(--radius-xl); border: 1px solid var(--gray-200);">
              <h4 style="margin-bottom: var(--space-4); display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 0.875rem;">➕ Adicionar novo Diferencial</span>
              </h4>
              <div class="highlights-form" style="display: grid; grid-template-columns: 1fr 1fr auto; gap: var(--space-4); align-items: end;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label">Rótulo / Título</label>
                  <input v-model="newHighlight.label" class="form-input" placeholder="Ex: Infraestrutura completa" />
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label">Valor / Detalhe</label>
                  <input v-model="newHighlight.value" class="form-input" placeholder="Ex: Água, luz, asfalto" />
                </div>
                <button class="btn btn-secondary" style="height: 42px;" @click="addHighlight">Adicionar</button>
              </div>
            </div>
          </section>

          <!-- Section: Price & Conditions -->
          <section class="card" style="padding: var(--space-6);">
            <div class="flex items-center gap-3" style="margin-bottom: var(--space-6);">
              <div style="width: 40px; height: 40px; background: var(--primary-light); color: var(--primary); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">💰</div>
              <div>
                <h3 style="margin:0;">Preços e Condições</h3>
                <p style="font-size: 0.8125rem; margin:0; color: var(--gray-500);">Defina os valores de destaque para a página pública.</p>
              </div>
            </div>

            <div class="grid grid-cols-2" style="gap: var(--space-5); margin-bottom: var(--space-6);">
              <div class="form-group" style="margin:0;">
                <label class="form-label">Investimento a partir de (R$)</label>
                <input v-model="pubInfoForm.startingPrice" type="number" step="0.01" class="form-input" placeholder="Ex: 144000" :disabled="!authStore.canEdit" />
                <small style="color:var(--gray-400); font-size:0.75rem;">Deixe em branco para calcular automaticamente dos lotes.</small>
              </div>
              <div class="form-group" style="margin:0;">
                <label class="form-label">Parcelamento Máximo (Vezes)</label>
                <input v-model="pubInfoForm.maxInstallments" type="number" class="form-input" placeholder="Ex: 120" :disabled="!authStore.canEdit" />
              </div>
            </div>

            <div class="form-group" style="margin:0;">
              <label class="form-label">Resumo das Condições / Observações</label>
              <input v-model="pubInfoForm.paymentConditionsSummary" class="form-input" placeholder="Ex: Entrada facilitada em 6x e saldo em 120 meses direto com a loteadora." :disabled="!authStore.canEdit" />
              <small style="color:var(--gray-400); font-size:0.75rem;">Este texto aparecerá junto ao preço na página pública.</small>
            </div>
          </section>

          <!-- Section: Details Text -->
          <section class="card" style="padding: var(--space-6);">
            <div class="flex items-center gap-3" style="margin-bottom: var(--space-4);">
              <div style="width: 40px; height: 40px; background: var(--primary-light); color: var(--primary); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">📝</div>
              <div>
                <h3 style="margin:0;">Texto de Diferenciais e Infra</h3>
                <p style="font-size: 0.8125rem; margin:0; color: var(--gray-500);">Descreva as facilidades do entorno e destaques do loteamento.</p>
              </div>
            </div>
            
            <div class="form-group" style="margin:0;">
              <div v-if="authStore.canEdit" class="flex gap-2" style="margin-bottom: 8px;">
                <button class="btn btn-xs btn-outline" @click.prevent="execCommand('bold')" title="Negrito"><b>B</b></button>
                <button class="btn btn-xs btn-outline" @click.prevent="execCommand('italic')" title="Itálico"><i>I</i></button>
                <button class="btn btn-xs btn-outline" @click.prevent="execCommand('insertUnorderedList')" title="Lista">• Lista</button>
                <button class="btn btn-xs btn-outline" @click.prevent="execCommand('formatBlock', 'p')" title="Parágrafo">P</button>
              </div>
              <div 
                ref="richEditor"
                contenteditable="true"
                class="form-textarea rich-editor-v4"
                :class="{ 'disabled': !authStore.canEdit }"
                @input="updateFromEditor"
                @blur="updateFromEditor"
                v-html="initialEditorContent"
                style="min-height: 240px; padding: var(--space-4); line-height: 1.6; border-radius: var(--radius-lg); font-size: 0.9375rem; background: white; border: 1px solid var(--gray-300); overflow-y: auto; white-space: pre-wrap;"
              ></div>
              <p style="font-size: 0.75rem; color: var(--gray-400); margin-top: 8px;">
                Dica: Use <b>Shift + Enter</b> para quebra de linha simples e <b>Enter</b> para novo parágrafo.
              </p>
            </div>
          </section>

          <!-- Section: Location & Map -->
          <section class="card" style="padding: var(--space-6);">
            <div class="flex items-center gap-3" style="margin-bottom: var(--space-6);">
              <div style="width: 40px; height: 40px; background: #e0f2fe; color: #0369a1; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">📍</div>
              <div>
                <h3 style="margin:0;">Endereço e Localização</h3>
                <p style="font-size: 0.8125rem; margin:0; color: var(--gray-500);">Defina o endereço e o mapa do Google para a página pública.</p>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: var(--space-5);">
              <label class="form-label">Endereço Completo</label>
              <input v-model="pubInfoForm.address" class="form-input" placeholder="Ex: Av. Brasil, 1000 - Centro, São Paulo - SP" :disabled="!authStore.canEdit" />
            </div>

            <div class="form-group" style="margin:0;">
              <label class="form-label">Link ou Embed do Google Maps</label>
              <input v-model="pubInfoForm.googleMapsUrl" class="form-input" placeholder="Cole aqui o link do Google Maps ou o link de incorporação (embed)" :disabled="!authStore.canEdit" />
              <p style="font-size: 0.75rem; color: var(--gray-400); margin-top: 8px;">
                Dica: Vá no Google Maps, clique em "Compartilhar", depois "Incorporar um mapa" e copie apenas o link dentro de <code>src="..."</code> ou cole o código inteiro (nós extrairemos o link para você).
              </p>
            </div>
          </section>

          <!-- Footer-ish Action Bar -->
          <div v-if="authStore.canEdit" class="flex justify-end items-center gap-4" style="margin-top: var(--space-4);">
            <div v-if="pubInfoSaved" style="color: var(--success); font-weight: 600; font-size: 0.875rem;">✅ Alterações salvas!</div>
            <button class="btn btn-primary" style="min-width: 160px;" :disabled="savingPubInfo" @click="savePubInfo">
              {{ savingPubInfo ? 'Salvando...' : '💾 Salvar Alterações' }}
            </button>
          </div>
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

          <div v-if="showNewCorretor" class="card" style="margin-top: var(--space-4); max-width: 600px;">
            <h4 style="margin-bottom: var(--space-4);">Novo Link de Corretor</h4>
            <div class="grid grid-cols-2" style="gap: var(--space-3);">
              <div class="form-group">
                <label class="form-label">Nome *</label>
                <input v-model="corretorForm.name" class="form-input" placeholder="João Corretor" required />
              </div>
              <div class="form-group">
                <label class="form-label">Código (URL) *</label>
                <input v-model="corretorForm.code" class="form-input" placeholder="joao-c" required />
                <small style="color:var(--gray-500); font-size:0.75rem;">Usado como ?c={{ corretorForm.code || 'codigo' }}</small>
              </div>
              <div class="form-group">
                <label class="form-label">Telefone</label>
                <input v-model="corretorForm.phone" class="form-input" placeholder="(00) 00000-0000" />
              </div>
              <div class="form-group">
                <label class="form-label">E-mail</label>
                <input v-model="corretorForm.email" type="email" class="form-input" placeholder="corretor@email.com" />
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
                    <button class="btn btn-sm btn-outline" @click="copyLink(`${$config?.public?.siteUrl || (typeof window !== 'undefined' ? window.location.origin : '')}${publicUrl}?c=${c.code}`)">📋 Copiar</button>
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
import { ref, computed, onMounted } from 'vue'

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
const media = ref<any[]>([])
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
  price: null,
  areaM2: null,
  frontage: null,
  depth: null,
  sideLeft: null,
  sideRight: null,
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

const openEditLot = (lot: any) => {
  editingLot.value = lot
  lotForm.value = { 
    status: lot.status, 
    price: lot.price, 
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
      price: lotForm.value.price ?? undefined,
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

const uploadLotMediaFile = async (e) => {
  const file = e.target.files?.[0]
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
  e.target.value = ''
  uploadingLotMedia.value = false
}

const uploadLotPanoramaFile = async (e) => {
  const file = e.target.files?.[0]
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
  e.target.value = ''
  uploadingPanorama.value = false
}

const removeLotMedia = async (id) => {
  if (!confirm('Excluir foto do lote?')) return
  try {
    await fetchApi(`/projects/${projectId}/media/${id}`, { method: 'DELETE' })
    if (editingLot.value.medias) {
      editingLot.value.medias = editingLot.value.medias.filter(m => m.id !== id)
    }
    toastSuccess('Foto excluída')
  } catch (e) {
    toastFromError(e, 'Erro ao excluir foto')
  }
}

const publicUrl = computed(() => project.value ? `/${project.value.slug}` : null)

const editForm = ref({
  name: '',
  slug: '',
  description: '',
  showPaymentConditions: false,
  customDomain: '',
  reservationFeeType: 'FIXED',
  reservationFeeValue: 500
})

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
  highlightsJson: [],
  locationText: '',
  startingPrice: null,
  maxInstallments: null,
  paymentConditionsSummary: '',
  address: '',
  googleMapsUrl: ''
})
const savingPubInfo = ref(false)
const pubInfoSaved = ref(false)
const newHighlight = ref({ label: '', value: '' })

const addHighlight = () => {
  if (!newHighlight.value.label) return
  pubInfoForm.value.highlightsJson = [...pubInfoForm.value.highlightsJson, { icon: '✅', ...newHighlight.value }]
  newHighlight.value = { label: '', value: '' }
}
const removeHighlight = (i) => {
  pubInfoForm.value.highlightsJson = pubInfoForm.value.highlightsJson.filter((_, idx) => idx !== i)
}
const savePubInfo = async () => {
  savingPubInfo.value = true; pubInfoSaved.value = false
  try {
    let mapUrl = pubInfoForm.value.googleMapsUrl || '';
    if (mapUrl.includes('<iframe')) {
      const match = mapUrl.match(/src=["'](.+?)["']/);
      if (match && match[1]) mapUrl = match[1];
    }

    project.value = await fetchApi(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ 
        highlightsJson: pubInfoForm.value.highlightsJson, 
        locationText: pubInfoForm.value.locationText,
        startingPrice: pubInfoForm.value.startingPrice ? Number(pubInfoForm.value.startingPrice) : null,
        maxInstallments: pubInfoForm.value.maxInstallments ? Number(pubInfoForm.value.maxInstallments) : null,
        paymentConditionsSummary: pubInfoForm.value.paymentConditionsSummary || null,
        address: pubInfoForm.value.address || null,
        googleMapsUrl: mapUrl || null
      }),
    })
    pubInfoSaved.value = true
    toastSuccess('Informações públicas salvas!')
    setTimeout(() => pubInfoSaved.value = false, 2000)
  } catch (e) { toastFromError(e, 'Erro ao salvar') }
  savingPubInfo.value = false
}

// ── Corretores ────────────────────────────────────────────
const corretores = ref([])
const loadingCorretores = ref(false)
const showNewCorretor = ref(false)
const creatingCorretor = ref(false)
const corretorForm = ref({ name: '', phone: '', email: '', code: '', enabled: true, notes: '' })
const corretorError = ref('')

const loadCorretores = async () => {
  loadingCorretores.value = true
  try {
    corretores.value = await fetchApi(`/realtor-links?projectId=${projectId}`)
  } catch (e) { toastFromError(e, 'Erro ao carregar corretores') }
  loadingCorretores.value = false
}

const createCorretor = async () => {
  creatingCorretor.value = true; corretorError.value = ''
  try {
    const c = await fetchApi('/realtor-links', {
      method: 'POST',
      body: JSON.stringify({ ...corretorForm.value, projectId }),
    })
    corretores.value.unshift(c)
    showNewCorretor.value = false
    corretorForm.value = { name: '', phone: '', email: '', code: '', enabled: true, notes: '' }
    toastSuccess('Corretor criado!')
  } catch (e) {
    corretorError.value = e.message || 'Erro ao criar'
    toastFromError(e, 'Erro ao criar corretor')
  }
  creatingCorretor.value = false
}

const toggleCorretor = async (c) => {
  try {
    const updated = await fetchApi(`/realtor-links/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !c.enabled }),
    })
    Object.assign(c, updated)
  } catch (e) { toastFromError(e, 'Erro ao atualizar corretor') }
}

const deleteCorretor = async (c) => {
  if (!confirm(`Excluir corretor "${c.name}"?`)) return
  try {
    await fetchApi(`/realtor-links/${c.id}`, { method: 'DELETE' })
    corretores.value = corretores.value.filter(x => x.id !== c.id)
    toastSuccess('Corretor excluído')
  } catch (e) { toastFromError(e, 'Erro ao excluir corretor') }
}

const corretorLotLink = (c, lotCode) => {
  if (!publicUrl.value) return ''
  return `${window?.location?.origin || ''}${publicUrl.value}?c=${c.code}${lotCode ? `#lote-${lotCode}` : ''}`
}

const copyLink = (text) => {
  navigator.clipboard.writeText(text)
  toastSuccess('Link copiado!')
}

// ── Payment Configuration ────────────────────────────────
const allConfigs = ref([])
const activeConfigs = ref([])
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
      const config = allConfigs.value.find(c => c.id === configId)
      if (config) activeConfigs.value.push(config)
    } else {
      activeConfigs.value = activeConfigs.value.filter(c => c.id !== configId)
    }
    
    toastSuccess('Gateway alterado para o projeto')
  } catch (e) {
    toastFromError(e, 'Erro ao alternar gateway')
  }
}
// ─────────────────────────────────────────────────────────

// ── Tabs ─────────────────────────────────────────────────
const tabs = [
  { key: 'lots', label: 'Lotes' },
  { key: 'public', label: 'Pág. Pública' },
  { key: 'payment', label: '💳 Pagamentos' },
  { key: 'settings', label: 'Configurações' },
]

const lotBadge = (s) => ({ AVAILABLE: 'badge-success', RESERVED: 'badge-warning', SOLD: 'badge-danger' }[s] || 'badge-neutral')
const lotLabel = (s) => ({ AVAILABLE: 'Disponível', RESERVED: 'Reservado', SOLD: 'Vendido' }[s] || s)
const slopeLabel = (s) => ({ FLAT: 'Plano', UPHILL: 'Aclive', DOWNHILL: 'Declive' }[s] || s)

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
      reservationFeeValue: p.reservationFeeValue ?? 500
    }
    pubInfoForm.value = {
      highlightsJson: Array.isArray(p.highlightsJson) ? p.highlightsJson : [],
      locationText: p.locationText || '',
      startingPrice: p.startingPrice,
      maxInstallments: p.maxInstallments,
      paymentConditionsSummary: p.paymentConditionsSummary || '',
      address: p.address || '',
      googleMapsUrl: p.googleMapsUrl || ''
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
  } catch (e) {
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

const uploadBannerImage = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  uploadingBanner.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    project.value = await uploadApi(`/projects/${projectId}/banner-image`, fd)
    toastSuccess('Banner do projeto enviado!')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar banner')
  }
  e.target.value = ''
  uploadingBanner.value = false
}

const removeBannerImage = async () => {
  try {
    project.value = await fetchApi(`/projects/${projectId}/banner-image`, { method: 'DELETE' })
    toastSuccess('Banner removido')
  } catch (e) {
    toastFromError(e, 'Erro ao remover banner')
  }
}

const uploadMediaFile = async (e) => {
  const file = e.target.files?.[0]
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
  e.target.value = ''
  uploadingMedia.value = false
}

const deleteMedia = async (id) => {
  if (!confirm('Excluir esta mídia?')) return
  try {
    await fetchApi(`/projects/${projectId}/media/${id}`, { method: 'DELETE' })
    media.value = media.value.filter(m => m.id !== id)
    toastSuccess('Mídia excluída')
  } catch (e) {
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
</style>
