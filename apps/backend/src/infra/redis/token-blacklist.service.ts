import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class TokenBlacklistService {
  constructor(private readonly redisService: RedisService) {}

  async addToBlacklist(token: string, expiresInSeconds: number): Promise<void> {
    const key = `blacklisted_token:${token}`;
    const client = this.redisService.getClient();
    await client.setex(key, expiresInSeconds, 'true');
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const key = `blacklisted_token:${token}`;
    const client = this.redisService.getClient();
    const result = await client.get(key);
    return result === 'true';
  }

  async blacklistAllUserTokens(
    uuid: string,
    expiresInSeconds: number
  ): Promise<void> {
    const key = `user_logout:${uuid}`;
    const client = this.redisService.getClient();
    await client.setex(key, expiresInSeconds, Date.now().toString());
  }

  async isUserLoggedOut(uuid: string, tokenIssuedAt: number): Promise<boolean> {
    const key = `user_logout:${uuid}`;
    const client = this.redisService.getClient();
    const logoutTime = await client.get(key);

    if (!logoutTime) return false;

    return parseInt(logoutTime) > tokenIssuedAt * 1000;
  }
}
