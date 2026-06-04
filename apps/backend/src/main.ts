import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from '@/infra/db/prisma.service';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true // Required for Stripe webhook signature verification
  });

  // Removendo headers que revelam tecnologia (obrigatório para auditoria)
  app.disable('x-powered-by');

  // Trust Proxy for accurate client IPs (e.g., behind Nginx/Cloudflare)
  app.set('trust proxy', 1);

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable for Swagger docs, or configure specifically
      crossOriginEmbedderPolicy: false
    })
  );

  // Payload Compression (Gzip/Brotli)
  app.use(compression());

  // Increase body size limits for large map data
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  const isProduction = process.env.NODE_ENV === 'production';

  // Swagger — disponível apenas em ambientes não-produtivos por segurança
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Lotio API')
      .setDescription(
        'API REST para gerenciamento de loteamentos, mapas interativos, ' +
        'leads, corretores e fluxo de compra. Plataforma completa para ' +
        'incorporadoras e imobiliárias.'
      )
      .setVersion('1.0')
      .setContact('Lotio', 'https://lotio.com.br', 'contato@lotio.com.br')
      .setTermsOfService('https://lotio.com.br/termos')
      .setLicense('Proprietário', 'https://lotio.com.br')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Insira o token JWT de autenticação',
          in: 'header',
        },
        'bearer',
      )
      .addServer(
        process.env.API_URL ?? 'http://localhost:8080',
        'Servidor atual',
      )
      .addTag('Auth', 'Autenticação e gerenciamento de sessão')
      .addTag('Users', 'Gerenciamento de usuários do sistema')
      .addTag('Leads', 'Captação e gestão de leads')
      .addTag('Projects', 'Gerenciamento de projetos/loteamentos')
      .addTag('Health', 'Monitoramento e health checks')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        defaultModelsExpandDepth: -1,
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  app.setGlobalPrefix('api');

  const prisma = app.get(PrismaService);

  app.enableCors({
    origin: async (origin, callback) => {
      if (!origin) return callback(null, true);

      const internalOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173'
      ];

      if (internalOrigins.some((o) => origin.startsWith(o))) {
        return callback(null, true);
      }

      const host = new URL(origin).hostname;
      const mainDomain = process.env.MAIN_DOMAIN || 'lotio.com.br';

      if (host === mainDomain || host.endsWith('.' + mainDomain)) {
        return callback(null, true);
      }

      // Custom domain is always project-scoped; only project.customDomain is
      // checked to ensure CORS access matches what the routing middleware resolves.
      const project = await prisma.project.findUnique({
        where: { customDomain: host },
        select: { id: true }
      });

      if (project) {
        return callback(null, true);
      }

      callback(new Error('CORS: Acesso não autorizado para este domínio.'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    credentials: true
  });
  app.use(cookieParser());

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  console.log(`Lotio API running on http://localhost:${port}`);
  if (!isProduction) {
    console.log(`Swagger docs: http://localhost:${port}/docs`);
  }
}

bootstrap();
