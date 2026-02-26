import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        return new Redis(url);
      },
      inject: [ConfigService]
    },
    {
      provide: 'REDIS_SERVICE',
      useFactory: (redis: Redis) => {
        return {
          get: async (key: string) => {
            const val = await redis.get(key);
            return val ? JSON.parse(val) : null;
          },
          set: async (key: string, value: any, ttl?: number) => {
            const str = JSON.stringify(value);
            if (ttl) {
              await redis.set(key, str, 'EX', ttl);
            } else {
              await redis.set(key, str);
            }
          },
          del: async (key: string) => {
            await redis.del(key);
          }
        };
      },
      inject: ['REDIS_CLIENT']
    }
  ],
  exports: ['REDIS_CLIENT', 'REDIS_SERVICE']
})
export class RedisModule {}
