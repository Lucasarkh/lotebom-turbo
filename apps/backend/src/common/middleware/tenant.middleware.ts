import {
  Injectable,
  NestMiddleware,
  NotFoundException,
  Inject,
  forwardRef
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '@/infra/db/prisma.service';

/**
 * Global Middleware to resolve Tenant and Project context from Host header
 * or route slugs, ensuring isolation and domain-based access.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  // Simple in-memory cache for domain resolution (performance)
  private static domainCache = new Map<string, any>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private prisma: PrismaService) {}

  async use(req: any, res: Response, next: NextFunction) {
    if (req.method === 'OPTIONS') return next();

    let host = req.headers['host'] || '';
    
    // In local development or via proxy, we might want to trust a custom header
    // or the Origin/Referer header to determine the "virtual" host being accessed.
    const origin = req.headers['origin'];
    const referer = req.headers['referer'];
    const virtualHost = origin || referer;

    if (virtualHost && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) {
        try {
            const originHost = new URL(virtualHost).hostname;
            // If origin is something else like test.lucas.com.br, use it as the host
            if (originHost !== 'localhost' && originHost !== '127.0.0.1' && originHost !== '') {
                host = originHost;
            }
        } catch (e) { /* ignore invalid URL */ }
    }

    // Strip port for comparison (e.g., "localhost:3000" -> "localhost")
    if (host.includes(':')) {
        host = host.split(':')[0];
    }

    // Ignorar logs para caminhos de infraestrutura/documentação para reduzir ruído
    const ignoredPaths = ['/favicon.ico', '/docs', '/api/metrics', '/'];
    if (!ignoredPaths.some(p => req.path === p || req.path.startsWith('/docs'))) {
        console.log(`[TenantMiddleware] Resolved host: "${host}" for path: ${req.path}`);
    }
    
    // Main domain can be configured via Env, default to 'lotio.com.br'
    const mainDomain = process.env.MAIN_DOMAIN || 'lotio.com.br';
    const isMainDomain = host === mainDomain || host === 'localhost' || host === '127.0.0.1';

    // 1. Resolve from custom domain (highest priority)
    if (!isMainDomain && host) {
      // Check cache first
      const cached = TenantMiddleware.domainCache.get(host);
      if (cached && (Date.now() - cached.timestamp) < TenantMiddleware.CACHE_TTL) {
          req.tenantId = cached.tenantId;
          req.projectId = cached.projectId;
          req.project = cached.project;
          return next();
      }

      // Try project first
      const project = await this.prisma.project.findUnique({
        where: { customDomain: host },
        include: { tenant: { select: { id: true, slug: true, isActive: true } } }
      });

      if (project) {
        if (!project.tenant.isActive) throw new NotFoundException('Tenant inativo.');
        const data = { tenantId: project.tenantId, projectId: project.id, project, timestamp: Date.now() };
        TenantMiddleware.domainCache.set(host, data);
        req.tenantId = data.tenantId;
        req.projectId = data.projectId;
        req.project = data.project;
        return next();
      }

      // Try tenant next
      const tenant = await this.prisma.tenant.findUnique({
        where: { customDomain: host }
      });

      if (tenant) {
        if (!tenant.isActive) throw new NotFoundException('Tenant inativo.');
        const data = { tenantId: tenant.id, timestamp: Date.now() };
        TenantMiddleware.domainCache.set(host, data);
        req.tenantId = data.tenantId;
        return next();
      }
      
      // Domain not recognized
      throw new NotFoundException('Loteadora não encontrada para este domínio.');
    }

    // 2. Resolve from Slugs (when on main domain)
    // Extract slugs from path /api/p/:projectSlug or query params
    const path = req.path; // e.g., /p/nome-do-projeto/details
    const projectSlugMatch = path.match(/\/p\/([^\/]+)/);
    let projectSlug = projectSlugMatch ? projectSlugMatch[1] : (req.params.projectSlug || req.query.projectSlug);
    
    // Ignore internal routes that shouldn't be treated as slugs
    if (projectSlug === 'resolve-tenant') {
       projectSlug = null;
    }
    
    const tenantSlug = req.params.tenantSlug || req.query.tenantSlug;

    if (projectSlug) {
      const project = await this.prisma.project.findUnique({
        where: { slug: projectSlug as string },
        include: { tenant: { select: { id: true, isActive: true } } }
      });
      if (project) {
        if (!project.tenant.isActive) throw new NotFoundException('Tenant inativo.');
        req.tenantId = project.tenantId;
        req.projectId = project.id;
        req.project = project;
      }
    } else if (tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: tenantSlug as string }
      });
      if (tenant) {
        if (!tenant.isActive) throw new NotFoundException('Tenant inativo.');
        req.tenantId = tenant.id;
      }
    }

    next();
  }
}
