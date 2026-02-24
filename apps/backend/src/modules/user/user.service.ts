import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { EmailQueueService } from '@infra/email-queue/email-queue.service';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  tenantId: true,
  createdAt: true
};

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private emailQueueService: EmailQueueService
  ) {}

  async create(tenantId: string, dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() }
    });
    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // If role is LOTEADORA and no tenantId is provided, create a new tenant
    if (dto.role === UserRole.LOTEADORA && !tenantId) {
      const user = await this.prisma.$transaction(async (tx) => {
        const slug = dto.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        let uniqueSlug = slug;
        const existingTenant = await tx.tenant.findUnique({
          where: { slug: uniqueSlug }
        });
        if (existingTenant) {
          uniqueSlug = `${slug}-${Math.floor(Math.random() * 1000)}`;
        }

        const tenant = await tx.tenant.create({
          data: {
            name: dto.name,
            slug: uniqueSlug
          }
        });

        return tx.user.create({
          data: {
            tenantId: tenant.id,
            name: dto.name,
            email: dto.email.toLowerCase(),
            passwordHash,
            role: UserRole.LOTEADORA
          },
          select: { ...USER_SELECT, tenant: { select: { name: true } } }
        });
      });

      await this.emailQueueService.queueWelcomeTenantEmail(
        user.email,
        user.name,
        user.tenant?.name || dto.name
      );

      return user;
    }

    if (dto.role === UserRole.CORRETOR && !tenantId) {
      throw new BadRequestException('Um tenant é obrigatório para o papel de corretor.');
    }

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role ?? UserRole.CORRETOR
      },
      select: { ...USER_SELECT, tenant: { select: { name: true } } }
    });

    // Send correct welcome email based on role
    if (user.role === UserRole.CORRETOR) {
      await this.emailQueueService.queueWelcomeRealtorEmail(user.email, user.name);
    } else if (user.role === UserRole.LOTEADORA && tenantId) {
      await this.emailQueueService.queueWelcomeTenantEmail(
        user.email,
        user.name,
        user.tenant?.name || 'sua empresa'
      );
    }

    return user;
  }

  async findAll(tenantId: string, query: PaginationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantId },
        select: USER_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({
        where: { tenantId }
      })
    ]);

    return {
      data,
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      }
    };
  }

  async findById(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: USER_SELECT
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId }
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.role) data.role = dto.role;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT
    });
  }

  async remove(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId }
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    return this.prisma.user.delete({
      where: { id }
    });
  }
}
