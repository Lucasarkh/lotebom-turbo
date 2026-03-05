import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { NotificationType, UserRole } from '@prisma/client';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { EmailQueueService } from '@infra/email-queue/email-queue.service';

// ─── Milestone definitions ────────────────────────────────────────────────────

const LEAD_MILESTONES_LOTEADORA = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
const LEAD_MILESTONES_CORRETOR  = [10, 25, 50, 100, 250, 500];
const LEAD_MILESTONES_IMOBILIARIA = [25, 50, 100, 500, 1000];
const ACCESS_MILESTONES = [100, 500, 1000, 5000, 10000, 50000];
const SCHEDULING_MILESTONES = [10, 50, 100, 500];

function leadMsgLoteadora(count: number, projectName: string): string {
  if (count >= 5000) return `🚀 ${count.toLocaleString('pt-BR')} leads no empreendimento ${projectName}! Uma máquina de vendas!`;
  if (count >= 2500) return `🔥 2.500 leads no ${projectName}! Incrível desempenho!`;
  if (count >= 1000) return `🎯 1.000 leads no ${projectName}! Você está arrasando!`;
  if (count >= 500)  return `⭐ 500 leads no ${projectName}! Excelente performance!`;
  if (count >= 250)  return `💪 250 leads no ${projectName}! Você está no caminho certo.`;
  if (count >= 100)  return `🎉 100 leads no ${projectName}! Parabéns!`;
  if (count >= 50)   return `📈 50 leads no ${projectName}! Excelente progresso!`;
  if (count >= 25)   return `✅ 25 leads no ${projectName}! Continue assim!`;
  return                    `🌱 10 leads no ${projectName}! Ótimo começo!`;
}

function leadMsgCorretor(count: number): string {
  if (count >= 500) return `🏆 500 leads! Você é uma referência no mercado!`;
  if (count >= 250) return `🌟 250 leads! Performance excepcional!`;
  if (count >= 100) return `🎯 100 leads atingidos! Parabéns pelo excelente trabalho.`;
  if (count >= 50)  return `💪 Mais de 50 leads atingidos! Ótimo progresso!`;
  if (count >= 25)  return `📈 25 leads atingidos! Você está indo muito bem.`;
  return                   `🌱 Você atingiu 10 leads! Ótimo começo.`;
}

function leadMsgImobiliaria(count: number): string {
  if (count >= 1000) return `🏆 1.000 leads da equipe! Uma potência!`;
  if (count >= 500)  return `🚀 500 leads da equipe! Performance incrível!`;
  if (count >= 100)  return `🎉 100 leads da equipe! Parabéns a todos!`;
  if (count >= 50)   return `📈 50 leads da equipe! Excelente resultado.`;
  return                    `✅ Sua equipe captou 25 leads! Bom trabalho.`;
}

function accessMsg(count: number, projectName: string): string {
  if (count >= 50000) return `🚀 O empreendimento ${projectName} chegou a 50 mil acessos! Excepcional!`;
  if (count >= 10000) return `🔥 O empreendimento ${projectName} já tem mais de 10 mil acessos! Um verdadeiro sucesso!`;
  if (count >= 5000)  return `⭐ O empreendimento ${projectName} ultrapassou 5.000 acessos! Incrível!`;
  if (count >= 1000)  return `🎉 O empreendimento ${projectName} já tem mais de mil acessos! Está bombando!`;
  if (count >= 500)   return `💪 O empreendimento ${projectName} já tem mais de 500 acessos, parabéns!`;
  return                     `🌱 O empreendimento ${projectName} atingiu 100 acessos. Ótimo início!`;
}

function schedulingMsg(count: number, projectName: string): string {
  if (count >= 500) return `🚀 500 visitas agendadas no empreendimento ${projectName}! Incrível!`;
  if (count >= 100) return `🎉 100 visitas agendadas no empreendimento ${projectName}! Parabéns!`;
  if (count >= 50)  return `💪 50 visitas agendadas no ${projectName}! Muito bem!`;
  return                   `✅ Você já tem 10 visitas agendadas no empreendimento ${projectName}!`;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  // ─── Core CRUD ─────────────────────────────────────────────────────────────

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    actionUrl?: string,
    metadata?: Record<string, any>,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, message, actionUrl, metadata },
    });
  }

  /** Notify all LOTEADORA users of a given tenant */
  async notifyTenantLoteadoras(
    tenantId: string,
    type: NotificationType,
    title: string,
    message: string,
    actionUrl?: string,
    metadata?: Record<string, any>,
  ) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, role: UserRole.LOTEADORA, isActive: true },
      select: { id: true },
    });

    if (users.length === 0) return;

    await this.prisma.notification.createMany({
      data: users.map((u) => ({ userId: u.id, type, title, message, actionUrl, metadata })),
    });
  }

  /** Notify an agency admin (IMOBILIARIA user) */
  async notifyAgency(
    agencyId: string,
    type: NotificationType,
    title: string,
    message: string,
    actionUrl?: string,
    metadata?: Record<string, any>,
  ) {
    const users = await this.prisma.user.findMany({
      where: { agencyId, role: UserRole.IMOBILIARIA, isActive: true },
      select: { id: true },
    });

    if (users.length === 0) return;

    await this.prisma.notification.createMany({
      data: users.map((u) => ({ userId: u.id, type, title, message, actionUrl, metadata })),
    });
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notificação não encontrada');
    if (notification.userId !== userId) throw new ForbiddenException();

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // ─── SYSADMIN Broadcast ─────────────────────────────────────────────────────

  async broadcast(dto: BroadcastNotificationDto) {
    const whereClause: any = { isActive: true };
    if (dto.tenantId) whereClause.tenantId = dto.tenantId;
    if (dto.role)     whereClause.role = dto.role;

    const users = await this.prisma.user.findMany({
      where: whereClause,
      select: { id: true, email: true, name: true },
    });

    if (users.length === 0) return { sent: 0 };

    await this.prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: NotificationType.SYSTEM,
        title: dto.title,
        message: dto.message,
        actionUrl: dto.actionUrl,
      })),
    });

    if (dto.sendEmail) {
      for (const user of users) {
        try {
          await this.emailQueue.queueSystemNotificationEmail(
            user.email,
            user.name,
            dto.title,
            dto.message,
          );
        } catch (err: any) {
          this.logger.error(`Failed to queue email for user ${user.id}: ${err.message}`);
        }
      }
    }

    return { sent: users.length };
  }

  // ─── Event Hooks ────────────────────────────────────────────────────────────

  /** Called after a new lead is created */
  async onNewLead(
    tenantId: string,
    projectId: string,
    projectName: string,
    realtorLinkId?: string | null,
  ) {
    // Resolve realtorLink → userId + agencyId
    let realtorUserId: string | undefined;
    let agencyId: string | undefined;
    if (realtorLinkId) {
      const rl = await this.prisma.realtorLink
        .findUnique({ where: { id: realtorLinkId }, select: { userId: true, agencyId: true } })
        .catch(() => null);
      realtorUserId = rl?.userId ?? undefined;
      agencyId = rl?.agencyId ?? undefined;
    }

    // 1. Notify LOTEADORA users
    await this.notifyTenantLoteadoras(
      tenantId,
      NotificationType.NEW_LEAD,
      'Novo lead recebido!',
      `Um novo lead foi captado no empreendimento "${projectName}".`,
      `/painel/leads`,
      { projectId },
    ).catch((e) => this.logger.error('onNewLead loteadora', e.message));

    // 2. Notify the attributed CORRETOR
    if (realtorUserId) {
      await this.create(
        realtorUserId,
        NotificationType.NEW_LEAD,
        'Novo lead para você!',
        `Você recebeu um novo lead no empreendimento "${projectName}".`,
        `/painel/leads`,
        { projectId },
      ).catch((e) => this.logger.error('onNewLead corretor', e.message));
    }

    // 3. Notify IMOBILIARIA admin if the lead came from an agency
    if (agencyId) {
      await this.notifyAgency(
        agencyId,
        NotificationType.NEW_LEAD,
        'Novo lead para sua equipe!',
        `Um novo lead foi captado no empreendimento "${projectName}" para a sua equipe.`,
        `/painel/leads`,
        { projectId },
      ).catch((e) => this.logger.error('onNewLead imobiliaria', e.message));
    }

    // 4. Check lead milestones asynchronously (fire-and-forget)
    this.checkLeadMilestones(tenantId, projectId, projectName, realtorUserId, agencyId).catch(
      (e) => this.logger.error('checkLeadMilestones', e.message),
    );
  }

  /** Called after a new scheduling is created */
  async onNewScheduling(
    tenantId: string,
    projectId: string,
    projectName: string,
    schedulingId: string,
    realtorUserId?: string,
  ) {
    await this.notifyTenantLoteadoras(
      tenantId,
      NotificationType.NEW_SCHEDULING,
      'Novo agendamento recebido!',
      `Uma nova visita foi agendada no empreendimento "${projectName}".`,
      `/painel/agendamentos`,
      { projectId, schedulingId },
    ).catch((e) => this.logger.error('onNewScheduling loteadora', e.message));

    if (realtorUserId) {
      await this.create(
        realtorUserId,
        NotificationType.NEW_SCHEDULING,
        'Nova visita agendada!',
        `Uma visita foi agendada no empreendimento "${projectName}".`,
        `/painel/agendamentos`,
        { projectId, schedulingId },
      ).catch((e) => this.logger.error('onNewScheduling corretor', e.message));
    }

    // Check scheduling milestones
    this.checkSchedulingMilestones(tenantId, projectId, projectName).catch(
      (e) => this.logger.error('checkSchedulingMilestones', e.message),
    );
  }

  /** Called after a new tracking session is created – checks access milestones */
  async onNewSession(tenantId: string, projectId: string) {
    if (!tenantId || !projectId) return;
    const project = await this.prisma.project
      .findUnique({ where: { id: projectId }, select: { name: true } })
      .catch(() => null);
    if (!project) return;
    this.checkAccessMilestones(tenantId, projectId, project.name).catch(
      (e) => this.logger.error('checkAccessMilestones', e.message),
    );
  }

  // ─── Milestone Checks ───────────────────────────────────────────────────────

  private async checkLeadMilestones(
    tenantId: string,
    projectId: string,
    projectName: string,
    realtorUserId?: string,
    agencyId?: string,
  ) {
    // --- LOTEADORA total leads per project ---
    const totalLeads = await this.prisma.lead.count({ where: { tenantId, projectId } });

    for (const milestone of LEAD_MILESTONES_LOTEADORA) {
      if (totalLeads === milestone) {
        const title = `🏆 Marco de leads atingido — ${milestone} leads!`;
        const message = leadMsgLoteadora(milestone, projectName);
        await this.notifyTenantLoteadoras(
          tenantId,
          NotificationType.LEAD_MILESTONE,
          title,
          message,
          `/painel/leads`,
          { projectId, milestone },
        );
        break; // only trigger highest crossed milestone once
      }
    }

    // --- CORRETOR lead count ---
    if (realtorUserId) {
      const realtorLink = await this.prisma.realtorLink.findUnique({
        where: { userId: realtorUserId },
        select: { id: true },
      });
      if (realtorLink) {
        const realtorLeads = await this.prisma.lead.count({
          where: { realtorLinkId: realtorLink.id },
        });
        for (const milestone of LEAD_MILESTONES_CORRETOR) {
          if (realtorLeads === milestone) {
            await this.create(
              realtorUserId,
              NotificationType.LEAD_MILESTONE,
              `🎯 Marco de leads — ${milestone} leads!`,
              leadMsgCorretor(milestone),
              `/painel/leads`,
              { milestone },
            );
            break;
          }
        }
      }
    }

    // --- IMOBILIARIA agency lead count ---
    if (agencyId) {
      const agencyLinks = await this.prisma.realtorLink.findMany({
        where: { agencyId },
        select: { id: true },
      });
      const agencyLinkIds = agencyLinks.map((r) => r.id);
      if (agencyLinkIds.length > 0) {
        const agencyLeads = await this.prisma.lead.count({
          where: { realtorLinkId: { in: agencyLinkIds } },
        });
        for (const milestone of LEAD_MILESTONES_IMOBILIARIA) {
          if (agencyLeads === milestone) {
            await this.notifyAgency(
              agencyId,
              NotificationType.LEAD_MILESTONE,
              `🏆 Marco da equipe — ${milestone} leads!`,
              leadMsgImobiliaria(milestone),
              `/painel/leads`,
              { milestone },
            );
            break;
          }
        }
      }
    }
  }

  private async checkAccessMilestones(
    tenantId: string,
    projectId: string,
    projectName: string,
  ) {
    const count = await this.prisma.trackingSession.count({ where: { tenantId, projectId } });

    for (const milestone of ACCESS_MILESTONES) {
      if (count === milestone) {
        await this.notifyTenantLoteadoras(
          tenantId,
          NotificationType.ACCESS_MILESTONE,
          `📊 Marco de acessos — ${milestone.toLocaleString('pt-BR')} acessos!`,
          accessMsg(milestone, projectName),
          `/painel`,
          { projectId, milestone },
        );
        break;
      }
    }
  }

  private async checkSchedulingMilestones(
    tenantId: string,
    projectId: string,
    projectName: string,
  ) {
    const count = await this.prisma.scheduling.count({ where: { tenantId, projectId } });

    for (const milestone of SCHEDULING_MILESTONES) {
      if (count === milestone) {
        await this.notifyTenantLoteadoras(
          tenantId,
          NotificationType.NEW_SCHEDULING,
          `📅 Marco de agendamentos — ${milestone} visitas!`,
          schedulingMsg(milestone, projectName),
          `/painel/agendamentos`,
          { projectId, milestone },
        );
        break;
      }
    }
  }
}
