import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateRealtorLinkDto } from './dto/create-realtor-link.dto';
import { UpdateRealtorLinkDto } from './dto/update-realtor-link.dto';

@Injectable()
export class RealtorLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateRealtorLinkDto) {
    const existing = await this.prisma.realtorLink.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });
    if (existing) throw new ConflictException('Já existe um corretor com este código.');

    return this.prisma.realtorLink.create({
      data: { tenantId, ...dto },
    });
  }

  async findAll(tenantId: string, projectId?: string) {
    return this.prisma.realtorLink.findMany({
      where: {
        tenantId,
        ...(projectId ? { OR: [{ projectId }, { projectId: null }] } : {}),
      },
      include: { _count: { select: { leads: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const link = await this.prisma.realtorLink.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { leads: true } } },
    });
    if (!link) throw new NotFoundException('Link de corretor não encontrado.');
    return link;
  }

  /** Public – resolve realtor by tenant slug + code for the public page */
  async findPublic(tenantSlug: string, code: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');

    const link = await this.prisma.realtorLink.findFirst({
      where: { tenantId: tenant.id, code, enabled: true },
      select: { id: true, name: true, phone: true, email: true, photoUrl: true, code: true, projectId: true },
    });
    if (!link) throw new NotFoundException('Link de corretor não encontrado ou desabilitado.');
    return link;
  }

  async update(tenantId: string, id: string, dto: UpdateRealtorLinkDto) {
    const link = await this.prisma.realtorLink.findFirst({ where: { id, tenantId } });
    if (!link) throw new NotFoundException('Link de corretor não encontrado.');

    if (dto.code && dto.code !== link.code) {
      const conflict = await this.prisma.realtorLink.findFirst({
        where: { tenantId, code: dto.code, NOT: { id } },
      });
      if (conflict) throw new ConflictException('Código já utilizado por outro corretor.');
    }

    return this.prisma.realtorLink.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    const link = await this.prisma.realtorLink.findFirst({ where: { id, tenantId } });
    if (!link) throw new NotFoundException('Link de corretor não encontrado.');
    await this.prisma.realtorLink.delete({ where: { id } });
    return { message: 'Link de corretor removido com sucesso.' };
  }
}
