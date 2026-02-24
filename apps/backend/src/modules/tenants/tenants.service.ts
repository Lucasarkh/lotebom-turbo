import {
  Injectable,
  ConflictException,
  NotFoundException
} from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RegisterTenantDto } from '../auth/dto/register-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: RegisterTenantDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() }
    });
    if (existingUser) throw new ConflictException('Email já cadastrado.');

    const slug = dto.tenantSlug
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug }
    });
    if (existingTenant)
      throw new ConflictException('Slug de tenant já em uso.');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug
        }
      });

      await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          role: UserRole.LOTEADORA
        }
      });

      return tenant;
    });
  }

  async findAll() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            users: { where: { role: UserRole.CORRETOR } },
            projects: true,
            leads: true
          }
        }
      }
    });

    // We can also compute metrics here or in a separate call
    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      isActive: t.isActive,
      createdAt: t.createdAt,
      metrics: {
        brokers: t._count.users,
        projects: t._count.projects,
        leads: t._count.leads
      }
    }));
  }

  async updateStatus(id: string, isActive: boolean) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    return this.prisma.tenant.update({
      where: { id },
      data: { isActive }
    });
  }

  async delete(id: string) {
    // Usually we don't delete, just deactivate, but here's the option
    return this.prisma.tenant.delete({ where: { id } });
  }
}
