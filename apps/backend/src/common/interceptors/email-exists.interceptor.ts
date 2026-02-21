import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException
} from '@nestjs/common';
import { PrismaService } from 'src/infra/db/prisma.service';
import { Observable } from 'rxjs';

@Injectable()
export class EmailExistsInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const email: string | undefined = req?.body?.email;

    if (!email) return next.handle();

    const normalized = String(email).toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email: normalized } });

    if (user) {
      throw new ConflictException('Email já cadastrado');
    }

    return next.handle();
  }
}
