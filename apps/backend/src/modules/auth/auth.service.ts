import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/infra/db/prisma.service';
import { UserRole } from '@prisma/client';
import { RegisterTenantDto } from './dto/register-tenant.dto';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, refreshToken, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Register a new tenant (Loteadora) + admin user in one transaction.
   */
  async checkTenantSlugAvailability(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase().replace(/\s+/g, '-') },
    });
    return { available: !tenant };
  }

  async registerTenant(dto: RegisterTenantDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) throw new ConflictException('Email já cadastrado.');

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (existingTenant) throw new ConflictException('Slug de tenant já em uso.');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug: dto.tenantSlug.toLowerCase().replace(/\s+/g, '-'),
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          role: UserRole.ADMIN,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true,
        },
      });

      return { user, tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug } };
    });

    return result;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: '8h',
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.jwtSecret,
        expiresIn: '7d',
      },
    );

    // Save hashed refresh token in DB
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(refreshToken, 10) },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async refresh(id: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Acesso negado');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Acesso negado');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.jwtSecret,
        expiresIn: '8h',
      }),
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    return user;
  }
}
