import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';
import { ChatDto } from './dto/chat.dto';
import OpenAI from 'openai';
import axios from 'axios';
import { CreateAiConfigDto, UpdateAiConfigDto } from './dto/ai-config.dto';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async chat(dto: ChatDto, tenantId: string) {
    if (!dto.projectId) {
      throw new BadRequestException('Project ID is required for chat');
    }

    return this.processChat(dto.projectId, tenantId, dto.message);
  }

  async chatPublic(projectSlug: string, dto: ChatDto) {
    console.log(`[AiService] chatPublic called for slug: ${projectSlug}`);
    const project = await (this.prisma as any).project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, tenantId: true }
    });

    if (!project) {
      console.warn(`[AiService] Public project not found for slug: ${projectSlug}`);
      throw new NotFoundException('Project not found');
    }

    return this.processChat(project.id, project.tenantId, dto.message);
  }

  private async processChat(projectId: string, tenantId: string, message: string) {
    console.log(`[AiService] Processing chat for project ${projectId}, tenant ${tenantId}`);
    
    const project = await (this.prisma as any).project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        aiConfig: true,
      },
    });

    if (!project) {
      console.warn(`[AiService] Project not found: ${projectId}`);
      throw new NotFoundException('Project not found');
    }

    if (!project.aiEnabled) {
      console.warn(`[AiService] AI is not enabled for project: ${project.name}`);
      throw new BadRequestException('AI is disabled for this project');
    }

    if (!project.aiConfig) {
      console.warn(`[AiService] No AI Config linked to project: ${project.name}`);
      throw new BadRequestException('AI configuration is missing for this project. Please select a config in project settings.');
    }

    const aiConfig = project.aiConfig;
    if (!aiConfig.apiKey) {
      console.warn(`[AiService] API Key is missing in AI Config: ${aiConfig.name}`);
      throw new BadRequestException('AI API Key is not configured');
    }

    // Fetch context from database
    const context = await this.getProjectContext(project.id, tenantId);
    console.log(`[AiService] Context fetched (${context.length} chars)`);

    const systemPrompt = `
      ${aiConfig.systemPrompt || 'Você é um assistente virtual especializado em ajudar clientes a encontrar o lote ideal.'}
      
      ESTAS SÃO AS INFORMAÇÕES DO PROJETO:
      Nome do Loteamento: ${project.name}
      Descrição: ${project.description || 'N/A'}
      Endereço: ${project.address || 'N/A'}
      Condições Gerais de Pagamento: ${project.paymentConditionsSummary || 'N/A'}
      
      LOTES DISPONÍVEIS E DETALHES:
      ${context}

      DIRETRIZES DE SEGURANÇA (TRAVAS EXTREMAS):
      1. Você deve agir EXCLUSIVAMENTE como atendente deste empreendimento.
      2. Responda APENAS perguntas sobre lotes, disponibilidade, preços, condições de pagamento e características do loteamento.
      3. Se o usuário perguntar sobre QUALQUER outro assunto (ex: política, receitas, notícias, piadas, outros negócios, conselhos pessoais), você deve recusar educadamente dizendo: "Desculpe, sou um assistente especializado apenas neste loteamento e não posso ajudar com outros assuntos."
      4. Se não encontrar a informação específica nos dados fornecidos, diga que não localizou mas que um consultor humano pode ajudar.
      5. Nunca mencione o nome de outros empreendimentos que não sejam o ${project.name}.
    `;

    try {
      const provider = (aiConfig.provider || 'OPENAI').toUpperCase();
      const modelName = aiConfig.model || (provider === 'OPENAI' ? 'gpt-4o-mini' : provider === 'ANTHROPIC' ? 'claude-3-5-sonnet-20240620' : 'gemini-1.5-flash');

      console.log(`[AiService] Calling ${provider} (Model: ${modelName})`);

      if (provider === 'OPENAI') {
        const openai = new OpenAI({ apiKey: aiConfig.apiKey });
        const response = await openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: aiConfig.temperature || 0.7,
          max_tokens: aiConfig.maxTokens || 1000,
        });
        return { message: response.choices[0].message.content };
      } 
      
      if (provider === 'ANTHROPIC') {
        const anthropicResp = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: modelName,
            max_tokens: aiConfig.maxTokens || 1000,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }],
            temperature: aiConfig.temperature || 0.7,
          },
          {
            headers: {
              'x-api-key': aiConfig.apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
          },
        );
        return { message: anthropicResp.data.content[0].text };
      }

      if (provider === 'GOOGLE') {
        const googleResp = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${aiConfig.apiKey}`,
          {
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nUsuário: ${message}` }],
              },
            ],
            generationConfig: {
              temperature: aiConfig.temperature || 0.7,
              maxOutputTokens: aiConfig.maxTokens || 1000,
            },
          },
        );
        return { message: googleResp.data.candidates[0].content.parts[0].text };
      }

      throw new BadRequestException('Provider não suportado.');
    } catch (error) {
      console.error('[AiService] Error:', error.response?.data || error.message);
      throw new BadRequestException('Houve um erro ao processar sua solicitação com a IA. ' + (error.response?.data?.error?.message || error.message));
    }
  }

  private async getProjectContext(projectId: string, tenantId: string): Promise<string> {
    const lots = await (this.prisma as any).lotDetails.findMany({
      where: {
        projectId,
        tenantId,
        // Optional: Filter only available lots to prevent AI from offering sold ones?
        // Or include all and let it check status?
      },
      include: {
        mapElement: true,
      }
    });

    if (lots.length === 0) return "Não há informações de lotes cadastrados.";

    return lots.map(lot => {
      const statusMap = {
        AVAILABLE: 'Disponível',
        RESERVED: 'Reservado',
        SOLD: 'Vendido',
      };
      
      const code = lot.mapElement?.code || lot.mapElement?.name || 'S/N';
      const status = statusMap[lot.status] || lot.status;
      const area = lot.areaM2 ? `${lot.areaM2}m2` : 'Não informada';
      const price = lot.price ? `R$ ${lot.price.toLocaleString('pt-BR')}` : 'Sob consulta';
      const tags = (lot.tags && lot.tags.length) ? lot.tags.join(', ') : 'Nenhuma';
      
      return `Lote: ${code} | Status: ${status} | Área: ${area} | Preço: ${price} | Tags: ${tags} | Topografia: ${lot.slope || 'Plano'}`;
    }).join('\n');
  }

  // Admin Config Management
  async listConfigs(tenantId: string) {
    return (this.prisma as any).aiConfig.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createConfig(tenantId: string, dto: CreateAiConfigDto) {
    return (this.prisma as any).aiConfig.create({
      data: {
        ...dto,
        tenantId,
      }
    });
  }

  async updateConfig(id: string, tenantId: string, dto: UpdateAiConfigDto) {
    return (this.prisma as any).aiConfig.updateMany({
      where: { id, tenantId },
      data: dto
    });
  }

  async deleteConfig(id: string, tenantId: string) {
    return (this.prisma as any).aiConfig.deleteMany({
      where: { id, tenantId }
    });
  }
}
