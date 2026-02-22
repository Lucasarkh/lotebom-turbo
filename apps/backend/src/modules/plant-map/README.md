# Módulo: Planta Interativa (PlantMap)

Módulo independente para gerenciamento de **plantas interativas** baseadas em imagem — sem Leaflet, Mapbox ou qualquer biblioteca GIS externa.

> **Independência**: este módulo é completamente separado do módulo `map-elements` (que usa tiles/GIS). Ele trabalha com imagens estáticas + coordenadas normalizadas.

---

## Conceito

Uma `PlantMap` é associada a um `Project` (relação 1:1) e armazena:
- A URL da imagem base (JPG/PNG/WebP, upload via S3)
- Dimensões opcionais da imagem original
- Configuração da linha de trajetória solar (ângulo, visibilidade, labels)
- Uma lista de `PlantHotspot` — pontos interativos sobre a imagem

### Sistema de Coordenadas

Os hotspots usam coordenadas **normalizadas** no intervalo `[0.0, 1.0]`:
- `x = 0.0` → borda esquerda da imagem; `x = 1.0` → borda direita
- `y = 0.0` → borda superior; `y = 1.0` → borda inferior

Isso garante responsividade: as coordenadas são independentes do tamanho de exibição da imagem.

---

## Configuração do Banco de Dados

Quando o banco estiver disponível, aplique a migração:

```bash
# Desenvolvimento
cd apps/backend
npx prisma migrate dev

# Produção
npx prisma migrate deploy
```

A migração `20260222200000_add_plant_map` foi criada manualmente e inclui:
- Enum `PlantHotspotType`: `LOTE | PORTARIA | QUADRA | AREA_COMUM | OUTRO`
- Enum `PlantHotspotLinkType`: `LOTE_PAGE | PROJECT_PAGE | CUSTOM_URL | NONE`
- Tabela `PlantMap` (1:1 com `Project`)
- Tabela `PlantHotspot` (N:1 com `PlantMap`)

---

## API Endpoints

### Autenticada (requer JWT + TenantGuard)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/projects/:projectId/plant-map` | Busca a planta do projeto |
| `POST` | `/api/projects/:projectId/plant-map` | Cria a planta (se não existir) |
| `POST` | `/api/projects/:projectId/plant-map/upload-image` | Upload da imagem base (multipart/form-data, campo `file`) |
| `PUT` | `/api/plant-maps/:plantMapId` | Atualiza configurações da planta |
| `DELETE` | `/api/plant-maps/:plantMapId` | Remove a planta e todos os hotspots |
| `POST` | `/api/plant-maps/:plantMapId/hotspots` | Cria um hotspot |
| `PUT` | `/api/plant-hotspots/:hotspotId` | Atualiza um hotspot |
| `DELETE` | `/api/plant-hotspots/:hotspotId` | Remove um hotspot |

### Pública (sem autenticação)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/p/projects/:projectId/plant-map` | Retorna a planta com todos os hotspots visíveis |

---

## Tipos de Hotspot

| Tipo | Descrição | Cor padrão |
|------|-----------|-----------|
| `LOTE` | Lote do loteamento — exibe status com cor dinâmica | Variável por status |
| `PORTARIA` | Entrada/portaria do empreendimento | Vermelho |
| `QUADRA` | Quadra esportiva | Verde |
| `AREA_COMUM` | Área comum (praça, parque, etc.) | Teal |
| `OUTRO` | Ponto genérico | Cinza |

### Status de Lote (apenas `type = LOTE`)

`DISPONIVEL` · `RESERVADO` · `VENDIDO` · `INDISPONIVEL`

---

## Link de Hotspot (`linkType`)

| Valor | Comportamento no frontend |
|-------|--------------------------|
| `LOTE_PAGE` | Navega para a página do lote (`linkId` = ID do lote) |
| `PROJECT_PAGE` | Navega para a página do projeto |
| `CUSTOM_URL` | Abre `linkUrl` em nova aba |
| `NONE` | Sem ação ao clicar |

---

## Upload de Imagem

```
POST /api/projects/:projectId/plant-map/upload-image
Content-Type: multipart/form-data
Authorization: Bearer <token>

Campo: file (jpg/png/webp, máx 20MB)
```

A imagem é armazenada no S3 com a chave:
```
tenants/{tenantId}/projects/{projectId}/plant-map/{uuid}.{ext}
```

O campo `imageUrl` da `PlantMap` é atualizado automaticamente. Se já existia uma imagem anterior, ela é removida do S3.

---

## Frontend

### Componentes

#### `<PlantMapViewer>` — Visualizador público

```vue
<PlantMapViewer
  :plant-map="plantMap"
  :show-controls="true"
  :show-legend="true"
/>
```

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `plantMap` | `PlantMap` | obrigatório | Dados da planta |
| `showControls` | `boolean` | `true` | Exibe botões de zoom +/- |
| `showLegend` | `boolean` | `true` | Exibe legenda de tipos |
| `hideLabels` | `boolean` | `false` | Oculta labels dos hotspots |

> **SSR-safe**: sempre envolva em `<ClientOnly>` em páginas Nuxt.

#### `<PlantMapEditor>` — Editor admin

```vue
<PlantMapEditor
  :project-id="projectId"
  :initial-plant-map="plantMap"
  @updated="plantMap = $event"
/>
```

| Prop | Tipo | Descrição |
|------|------|-----------|
| `projectId` | `string` | ID do projeto |
| `initialPlantMap` | `PlantMap \| null` | Estado inicial (null se nenhuma planta criada) |

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `@updated` | `PlantMap \| null` | Emitido após qualquer alteração |

### Composables

```ts
// Autenticado (painel admin)
const api = usePlantMapApi()
await api.getPlantMap(projectId)
await api.uploadPlantImage(projectId, file)
await api.createHotspot(plantMapId, payload)
await api.updateHotspot(hotspotId, payload)
await api.deleteHotspot(hotspotId)

// Público (páginas de projeto públicas)
const { getPublicPlantMap } = usePublicPlantMap()
const plantMap = await getPublicPlantMap(projectId)
```

Importação explícita (fora do auto-import do Nuxt):
```ts
import { usePlantMapApi, usePublicPlantMap } from '~/composables/plantMap/usePlantMapApi'
import type { PlantMap, PlantHotspot } from '~/composables/plantMap/types'
```

---

## Fluxo Admin

1. Acesse `/painel/projetos/:id/planta`
2. Faça upload da imagem base (arraste ou clique)
3. Selecione o modo **Adicionar** na barra de ferramentas
4. Clique na imagem para criar hotspots — o modal de edição abre automaticamente
5. Configure tipo, título, label, link e status do lote
6. Use o modo **Mover** para reposicionar hotspots arrastando
7. Configure a **Trajetória Solar**: ative o toggle, ajuste o ângulo (0–360°)
8. Clique em "Ver página pública" para visualizar o resultado

---

## Estrutura de Arquivos

```
apps/backend/src/modules/plant-map/
├── dto/
│   ├── create-plant-map.dto.ts
│   ├── update-plant-map.dto.ts
│   ├── create-hotspot.dto.ts
│   └── update-hotspot.dto.ts
├── plant-map.controller.ts      # 3 controllers: PlantMap, PlantMapItem, PlantHotspot
├── public-plant-map.controller.ts
├── plant-map.service.ts
├── plant-map.module.ts
└── README.md                    # este arquivo

apps/frontend/
├── composables/plantMap/
│   ├── types.ts                 # PlantMap, PlantHotspot, enums, helpers visuais
│   ├── usePlantMapApi.ts        # usePlantMapApi + usePublicPlantMap
│   └── useZoomPan.ts            # Zoom/pan via CSS transform
└── components/plantMap/
    ├── HotspotPin.vue           # Pin SVG (elemento <g>)
    ├── HotspotPopover.vue       # Popover com Teleport
    ├── SunPathLine.vue          # Linha de trajetória solar (SVG <g>)
    ├── PlantMapViewer.vue       # Viewer público completo
    ├── HotspotModal.vue         # Modal criar/editar hotspot
    └── PlantMapEditor.vue       # Editor admin completo
```

---

## Integração em Nova Página

### Página pública

```vue
<script setup lang="ts">
import { usePublicPlantMap } from '~/composables/plantMap/usePlantMapApi'
import type { PlantMap } from '~/composables/plantMap/types'
import PlantMapViewer from '~/components/plantMap/PlantMapViewer.vue'

const plantMap = ref<PlantMap | null>(null)
const { getPublicPlantMap } = usePublicPlantMap()

onMounted(async () => {
  plantMap.value = await getPublicPlantMap(projectId).catch(() => null)
})
</script>

<template>
  <section v-if="plantMap" id="planta">
    <ClientOnly>
      <PlantMapViewer :plant-map="plantMap" />
    </ClientOnly>
  </section>
</template>
```

### Página admin

```vue
<script setup lang="ts">
import { usePlantMapApi } from '~/composables/plantMap/usePlantMapApi'
import type { PlantMap } from '~/composables/plantMap/types'
import PlantMapEditor from '~/components/plantMap/PlantMapEditor.vue'

const plantMap = ref<PlantMap | null>(null)
const api = usePlantMapApi()

onMounted(async () => {
  plantMap.value = await api.getPlantMap(projectId).catch(() => null)
})
</script>

<template>
  <PlantMapEditor
    :project-id="projectId"
    :initial-plant-map="plantMap"
    @updated="plantMap = $event"
  />
</template>
```
