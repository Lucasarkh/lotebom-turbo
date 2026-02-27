# 🚀 Documentação Completa e Detalhada: Plataforma Lot.io

Este guia fornece uma visão técnica e estratégica de todos os recursos da plataforma, servindo como manual de bordo para gestores, estrategistas comerciais e operadores do sistema.

---

## 🏗️ 1. Gestão de Projetos (Empreendimentos)
A central de controle de cada loteamento. É aqui que você define a identidade e as configurações base.

*   **O que faz:** Criação de novos projetos, controle de publicação (Rascunho vs. Publicado) e gestão de descrições.
*   **Como usar:**
    1.  Acesse **Projetos** e clique em **+ Novo Projeto**.
    2.  Defina o **Nome** e o **Slug** (a parte final da URL, ex: `parque-das-flores`).
    3.  **Configurações Básicas:** Na aba "Configurações", você pode editar a descrição e, se for administrador, definir um **Domínio Customizado** exclusivo para esse projeto.
*   **Onde acessar:** Menu Lateral > [Projetos](/painel/projetos).

---

## 🗺️ 2. Planta Interativa (O Coração Visual)
Interface gráfica onde o cliente visualiza o status real de cada lote.

*   **O que faz:** Transforma imagens comuns do loteamento em mapas interativos com status de disponibilidade (Cores: Verde=Livre, Amarelo=Reservado, Vermelho=Vendido).
*   **Como usar:**
    1.  Acesse o projeto e vá na aba **🗺️ Planta Interativa**.
    2.  **Upload:** Suba a imagem do loteamento.
    3.  **Mapeamento:** Use o modo **+ Adicionar** para desenhar os polígonos ou pontos sobre cada lote na imagem.
    4.  **Trajetória Solar:** Ative o "Sun Path" e ajuste o ângulo (0° a 360°) para simular fielmente o movimento do sol sobre o terreno.
*   **Importante:** Cada ponto criado aqui gera automaticamente uma entrada na aba **Lotes** para edição de preços.
*   **Onde acessar:** Projetos > Selecionar Projeto > Aba [Planta Interativa](/painel/projetos/[id]/planta).

---

## 🧮 3. Regras de Financiamento (Simulador)
Configuração do simulador de parcelas que o cliente vê publicamente.

*   **O que faz:** Define as regras matemáticas para o cálculo automático de financiamento nas páginas dos lotes.
*   **Como usar:**
    1.  No projeto, acesse a aba **Financiamento**.
    2.  Defina a **Entrada Mínima** (percentual ou valor fixo), o **Número Máximo de Parcelas** e a **Taxa de Juros Mensal**.
    3.  Configure o **Indexador** (ex: IGP-M + 1% ao ano) e se permite **Balões Intermediários**.
    4.  Ative a opção "Habilitar Simulador nas Páginas Públicas" para que os cálculos apareçam para o cliente.
*   **Onde acessar:** Projetos > Selecionar Projeto > Aba [Financiamento](/painel/projetos/[id]/index).

---

## 📋 4. Inventário Detalhado (Lotes)
Onde você enriquece os dados técnicos de cada unidade.

*   **O que faz:** Centraliza todos os dados contratuais de cada lote (preço, área real, topografia, medidas de frente/fundo).
*   **Como usar:**
    1.  Acesse a aba **Lotes** do projeto.
    2.  Selecione um lote (que foi previamente desenhado na planta).
    3.  Preencha as medições de contrato e o **Preço (R$)**.
    4.  Altere o status manualmente se a venda for fechada fora do sistema.
*   **Onde acessar:** Projetos > Selecionar Projeto > Aba [Lotes](/painel/projetos/[id]/index).

---

## 🌄 5. Panorama 360° (Tour Virtual)
Imersão digital no canteiro de obras ou área comum.

*   **O que faz:** Cria tours virtuais a partir de fotos 360°, permitindo navegação entre diferentes pontos do empreendimento.
*   **Como usar:**
    1.  Acesse a aba **🌄 Panorama 360°** no projeto.
    2.  Suba fotos 360° (equirretangulares).
    3.  Crie **Hotspots de Navegação** (Beacons) para que o cliente "ande" de um ponto a outro.
    4.  Crie **Hotspots de Information** para destacar um lote específico visto de cima.
*   **Onde acessar:** Projetos > Selecionar Projeto > Aba [Panorama](/painel/projetos/[id]/panorama).

---

## 🧬 6. Gestão de Leads (CRM Integrado)
Gestão completa do relacionamento e intenções de compra.

*   **O que faz:** Captura interessados via site, links de corretores ou checkout abandonado, organizando-os em um funil Kanban.
*   **Recursos Críticos:**
    1.  **Kanban:** Arraste os cards para mudar o estágio da venda.
    2.  **Tracking Digital:** Veja quais lotes o lead mais olhou e por quanto tempo ele navegou na planta antes de entrar em contato.
    3.  **Recorrência:** O sistema identifica se um lead já visitou ou se é um contato antigo.
*   **Onde acessar:** Menu Lateral > [Gestão de Leads](/painel/leads).

---

## 📅 7. Agenda de Visitas (Scheduling)
Controle de fluxo no plantão de vendas.

*   **O que faz:** Calendário para agendamento de visitas presenciais guiadas.
*   **Como usar:**
    1.  Em **Agenda**, visualize os compromissos do mês.
    2.  **Regras:** Defina janelas de atendimento (ex: Segunda a Sábado, das 09h às 18h).
    3.  Configure intervalos de duração (ex: 1 hora por visita) para evitar sobreposição de clientes no plantão.
*   **Onde acessar:** Menu Lateral > [Agenda](/painel/agendamentos).

---

## 🤖 8. Assistente de IA (Chatbot Inteligente)
Automação de atendimento qualificado via integração de chave de api.

*   **O que faz:** Configura perfis de IA que conhecem o projeto e respondem dúvidas de clientes em tempo real, capturando o lead no final da conversa.
*   **Como usar:**
    1.  Crie um perfil em **Configurações de IA**.
    2.  No seu projeto, na aba **IA**, ative o assistente e selecione o perfil criado.
    3.  Integre a sua chave de api para criar o "cerebro" do assistente.
    3.  A IA usará os dados de preços e disponibilidades do sistema para responder o cliente sem intervenção humana.
*   **Onde acessar:** Menu Lateral > [Assistente IA](/painel/ai).

---

## 🤝 9. Corretores & Links de Parceria
Transforme cada parceiro em uma máquina de vendas rastreável.

*   **O que faz:** Gerencia corretores externos e gera links exclusivos de tracking.
*   **Como usar:**
    1.  Cadastre o corretor em **Corretores** (Nome, CRECI, Contatos).
    2.  Gere um **Link de Corretor**. Qualquer lead oriundo desse link fica vinculado a ele (vínculo eterno ou por sessão).
    3.  Acompanhe quantos cliques e leads cada corretor trouxe nas métricas.
*   **Onde acessar:** Menu Lateral > [Corretores](/painel/corretores).

---

## 🔗 10. Campanhas de Marketing (UTM)
Rastreamento preciso de tráfego pago (Google Ads / Facebook Ads).

*   **O que faz:** Cria links com parâmetros UTM para medir exatamente quais anúncios estão trazendo retorno financeiro.
*   **Campos:** Fonte, Mídia, Campanha, Conteúdo e Termo.
*   **Budget:** Permite inserir o orçamento gasto na campanha para cálculo futuro de ROI.
*   **Onde acessar:** Menu Lateral > [Campanhas](/painel/campanhas).

---

## 📈 11. Métricas de Acesso (Analytics)
Inteligência de dados sem necessidade de ferramentas externas complexas.

*   **O que faz:** Dashboard com sessões, visualizações de página, taxa de conversão e dispositivos mais usados.
*   **Destaque:** Gráfico de hits por projeto permitindo comparar qual empreendimento está gerando mais engajamento.
*   **Onde acessar:** Menu Lateral > [Métricas](/painel/metricas).

---

## 💳 12. Gestão de Pagamentos & Reservas Online
Configuração financeira para depósitos de segurança e reservas.

*   **O que faz:** Centraliza as chaves de API dos gateways (Stripe, Asaas, Mercado Pago, etc).
*   **Ativação:** No projeto (Aba Pagamento), você deve "Ligar" qual gateway esse projeto específico usará.
*   **Taxa de Reserva:** No projeto, defina o valor (fixo ou %) cobrado via cartão/PIX para "travar" um lote por X horas.
*   **Onde acessar:** Menu Lateral > [Pagamentos](/painel/pagamentos).

---

## 📧 13. Mensagens do Sistema (SysAdmin)
Leads corporativos para a plataforma.

*   **O que faz:** Centraliza mensagens vindas da Landing Page principal (geralmente pessoas interessadas em contratar a ferramenta).
*   **Atenção:** Visível apenas para perfis `SYSADMIN`.
*   **Onde acessar:** Menu Lateral > [Mensagens](/painel/mensagens).

---

## 👥 14. Equipe & Usuários (RBAC)
Controle de quem acessa o quê.

*   **Papéis:** 
    - **Loteadora (Admin):** Acesso total ao painel.
    - **Corretor:** Acesso limitado apenas aos seus leads e consultas de disponibilidade.
*   **Onde acessar:** Menu Lateral > [Usuários](/painel/usuarios).

---

*Documentação atualizada técnica e estrategicamente em 26/02/2026.*

