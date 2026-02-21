import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-ctr';
  private readonly secretKey: Buffer;
  private readonly iv: Buffer;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    this.secretKey = crypto.createHash('sha256').update(String(key)).digest();

    this.iv = Buffer.alloc(16, 0);
  }

  encrypt(text: string): string {
    if (!text) return text;

    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.secretKey,
      this.iv
    );
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return encrypted.toString('hex');
  }

  decrypt(hash: string): string {
    if (!hash) return hash;

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      this.iv
    );
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(hash, 'hex')),
      decipher.final()
    ]);

    return decrypted.toString();
  }
}
