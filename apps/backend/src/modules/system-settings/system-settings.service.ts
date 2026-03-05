import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class SystemSettingsService {
  constructor(private prisma: PrismaService) {}

  async getPublicSettings() {
    const s = await this.prisma.systemSetting.findFirst();
    return (
      s || {
        contactWhatsapp: null,
        contactEmail: null,
        leadFormEnabled: true
      }
    );
  }

  async updateSettings(dto: {
    contactWhatsapp?: string;
    contactEmail?: string;
    leadFormEnabled?: boolean;
  }) {
    const existing = await this.prisma.systemSetting.findFirst();
    if (existing) {
      return this.prisma.systemSetting.update({
        where: { id: existing.id },
        data: dto
      });
    }
    return this.prisma.systemSetting.create({
      data: dto
    });
  }

  async createLead(dto: {
    name: string;
    email?: string;
    phone?: string;
    message?: string;
  }) {
    return this.prisma.systemLead.create({
      data: {
        ...dto,
        status: LeadStatus.NEW
      }
    });
  }

  async findAllLeads() {
    return this.prisma.systemLead.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateLeadStatus(id: string, status: LeadStatus) {
    return this.prisma.systemLead.update({
      where: { id },
      data: { status }
    });
  }

  async getMaintenanceStatus(): Promise<{
    enabled: boolean;
    message: string;
    enabledAt: string | null;
    enabledBy: string | null;
  }> {
    const meta = await this.prisma.systemMeta.findUnique({
      where: { key: 'maintenance_mode' }
    });

    if (!meta || !meta.value) {
      return { enabled: false, message: '', enabledAt: null, enabledBy: null };
    }

    try {
      return JSON.parse(meta.value);
    } catch {
      return { enabled: false, message: '', enabledAt: null, enabledBy: null };
    }
  }

  async setMaintenanceMode(
    enabled: boolean,
    message: string,
    userId: string
  ): Promise<{
    enabled: boolean;
    message: string;
    enabledAt: string | null;
    enabledBy: string | null;
  }> {
    const value = JSON.stringify({
      enabled,
      message: message || 'Sistema em manutenção. Voltaremos em breve.',
      enabledAt: enabled ? new Date().toISOString() : null,
      enabledBy: enabled ? userId : null
    });

    await this.prisma.systemMeta.upsert({
      where: { key: 'maintenance_mode' },
      update: { value },
      create: { key: 'maintenance_mode', value }
    });

    return JSON.parse(value);
  }
}
