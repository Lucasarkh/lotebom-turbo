import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from '@/infra/db/prisma.service';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase body size limits for large map data
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  const config = new DocumentBuilder()
    .setTitle('CondoSaaS API')
    .setDescription('API do sistema de gestão de condomínios')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      defaultModelsExpandDepth: -1
    }
  });

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

      // Check custom domains in database
      const [tenant, project] = await Promise.all([
        prisma.tenant.findUnique({
          where: { customDomain: host },
          select: { id: true }
        }),
        prisma.project.findUnique({
          where: { customDomain: host },
          select: { id: true }
        })
      ]);

      if (tenant || project) {
        return callback(null, true);
      }

      callback(new Error('CORS: Acesso não autorizado para este domínio.'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    credentials: true
  });
  app.use(cookieParser());

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  console.log(`CondoSaaS API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
