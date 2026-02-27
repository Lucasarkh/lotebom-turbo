import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateAgencyDto, UpdateAgencyDto } from './dto/agency.dto';
import { CreateInviteDto, AcceptInviteDto } from './dto/invite.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { EmailQueueService } from '@infra/email-queue/email-queue.service';

@Injectable()
export class AgenciesService {
  private readonly logger = new Logger(AgenciesService.name);

  constructor(
    private prisma: PrismaService,
    private emailQueueService: EmailQueueService,
  ) {}

  async createAgency(tenantId: string, dto: CreateAgencyDto) {
    const existing = await this.prisma.agency.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email de imobiliária já cadastrado.');

    return this.prisma.agency.create({
      data: {
        ...dto,
        tenantId,
        isPending: true,
      },
    });
  }

  async listAgencies(tenantId: string) {
    return this.prisma.agency.findMany({
      where: { tenantId },
      include: {
        invites: {
          where: { used: false, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { realtors: true, users: true }
        }
      }
    });
  }

  async getAgency(id: string, tenantId: string) {
    const agency = await this.prisma.agency.findFirst({
      where: { id, tenantId },
      include: {
        realtors: {
          include: {
            user: true
          }
        },
        users: true
      }
    });
    if (!agency) throw new NotFoundException('Imobiliária não encontrada.');
    return agency;
  }

  async updateAgency(id: string, tenantId: string, dto: UpdateAgencyDto) {
    return this.prisma.agency.updateMany({
      where: { id, tenantId },
      data: dto
    });
  }

  async deleteAgency(id: string, tenantId: string) {
    return this.prisma.agency.deleteMany({
      where: { id, tenantId }
    });
  }

  // --- Invite System ---

  async createInvite(tenantId: string, senderId: string, dto: CreateInviteDto) {
    const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (!sender) throw new NotFoundException('Usuário remetente não encontrado.');
    
    // Authorization logic
    if (sender.role === UserRole.IMOBILIARIA) {
      if (dto.role !== UserRole.CORRETOR) throw new ForbiddenException('Imobiliárias só podem convidar corretores.');
      if (!sender.agencyId) throw new BadRequestException('Usuário imobiliária sem agencyId associado.');
      dto.agencyId = sender.agencyId;
    }

    // Se for convite para Administrador de Imobiliária (feito pela Loteadora)
    // Validar se o e-mail coincide com o e-mail da imobiliária pré-cadastrada
    if (dto.role === UserRole.IMOBILIARIA && dto.agencyId) {
      const agency = await this.prisma.agency.findUnique({
        where: { id: dto.agencyId }
      });
      if (!agency) throw new NotFoundException('Imobiliária não encontrada.');
      if (agency.email.toLowerCase() !== dto.email.toLowerCase()) {
        throw new BadRequestException('O e-mail do convite deve ser o mesmo e-mail cadastrado para a imobiliária.');
      }
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invite = await this.prisma.invite.create({
      data: {
        email: dto.email,
        role: dto.role,
        agencyId: dto.agencyId,
        tenantId,
        token,
        expiresAt,
      },
    });

    // Send invite email (non-blocking — don't fail invite creation if queue is down)
    try {
      await this.emailQueueService.queueInviteEmail(dto.email, invite.token, invite.role, invite.email);
    } catch (error: any) {
      this.logger.error(`Failed to queue invite email for ${dto.email}:`, error.message);
    }

    return invite;
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const invite = await this.prisma.invite.findFirst({
      where: { token: dto.token, used: false, expiresAt: { gt: new Date() } }
    });

    if (!invite) throw new BadRequestException('Convite inválido ou expirado.');

    // Segurança extra: Validar se o e-mail que está tentando registrar é EXATAMENTE o e-mail do convite
    // Isso evita que alguém pegue um token válido e mude o e-mail na requisição (fraude)
    // No frontend vamos passar o e-mail, mas o backend manda na verdade o que está no banco de dados do convite.
    
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invite.email }
    });

    if (existingUser) {
      await this.prisma.invite.update({
        where: { id: invite.id },
        data: { used: true }
      });
      throw new BadRequestException('Este e-mail já está cadastrado no sistema.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: invite.email,
          name: dto.name,
          passwordHash,
          role: invite.role,
          tenantId: invite.tenantId,
          agencyId: invite.agencyId,
        }
      });

      if (invite.role === UserRole.CORRETOR && invite.agencyId) {
        await tx.realtor.create({
          data: {
            userId: user.id,
            agencyId: invite.agencyId,
          }
        });
      }

      if (invite.role === UserRole.IMOBILIARIA && invite.agencyId) {
        await tx.agency.update({
          where: { id: invite.agencyId },
          data: { isPending: false }
        });
      }

      await tx.invite.update({
        where: { id: invite.id },
        data: { used: true }
      });

      return user;
    });
  }

  async getInviteDetail(token: string) {
    const invite = await this.prisma.invite.findFirst({
      where: { token, used: false, expiresAt: { gt: new Date() } },
      include: {
        agency: { select: { name: true, email: true } }
      }
    });

    if (!invite) throw new BadRequestException('Convite inválido, expirado ou já utilizado.');

    return {
      email: invite.email,
      role: invite.role,
      agencyName: invite.agency?.name
    };
  }

  async getAgencyMetrics(agencyId: string) {
    const realtors = await this.prisma.realtor.findMany({
      where: { agencyId },
      include: {
        user: {
          include: {
            realtorLink: {
              include: {
                _count: {
                  select: { leads: true, trackingSessions: true }
                }
              }
            }
          }
        }
      }
    });

    return realtors.map(r => ({
      id: r.id,
      name: r.user.name,
      leads: r.user.realtorLink?._count.leads || 0,
      accesses: r.user.realtorLink?._count.trackingSessions || 0,
    }));
  }
}
