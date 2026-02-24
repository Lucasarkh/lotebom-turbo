import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMqService } from '@infra/rabbitmq/rabbitmq.service';
import { SendPulseService } from '@infra/sendpulse/sendpulse.service';

export interface EmailJob {
  type: 'welcome-tenant' | 'welcome-realtor' | 'password-reset';
  to: string;
  data: Record<string, any>;
  attempts: number;
}

const EMAIL_QUEUE = 'email-notifications';

@Injectable()
export class EmailQueueService implements OnModuleInit {
  private readonly logger = new Logger(EmailQueueService.name);
  private readonly maxRetries = 3;

  constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly sendPulseService: SendPulseService
  ) {}

  async onModuleInit() {
    await this.startEmailConsumer();
    this.logger.log('Email queue consumer started');
  }

  async queueEmail(type: EmailJob['type'], to: string, data: Record<string, any>): Promise<void> {
    const job: EmailJob = {
      type,
      to,
      data,
      attempts: 0
    };

    await this.rabbitMqService.sendToQueue(EMAIL_QUEUE, job);
    this.logger.debug(`Email queued: ${type} to ${to}`);
  }

  async queueWelcomeTenantEmail(to: string, userName: string, tenantName: string): Promise<void> {
    await this.queueEmail('welcome-tenant', to, { userName, tenantName });
  }

  async queueWelcomeRealtorEmail(to: string, userName: string): Promise<void> {
    await this.queueEmail('welcome-realtor', to, { userName });
  }

  async queuePasswordResetEmail(to: string, userName: string, resetToken: string): Promise<void> {
    await this.queueEmail('password-reset', to, { userName, resetToken });
  }

  private async startEmailConsumer(): Promise<void> {
    await this.rabbitMqService.createConsumer({
      queue: EMAIL_QUEUE,
      prefetch: 5,
      onMessage: async (payload: any) => {
        if (!this.isValidEmailJob(payload)) {
          this.logger.warn('Received invalid email job payload, skipping...');
          return;
        }

        await this.processEmailJob(payload as EmailJob);
      }
    });
  }

  private isValidEmailJob(payload: any): payload is EmailJob {
    return (
      payload &&
      typeof payload.to === 'string' &&
      typeof payload.type === 'string' &&
      payload.data &&
      typeof payload.data === 'object' &&
      typeof payload.attempts === 'number'
    );
  }

  private async processEmailJob(job: EmailJob): Promise<void> {
    try {
      await this.sendEmail(job);
      this.logger.log(`Email sent: ${job.type} to ${job.to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${job.type} to ${job.to}`, error.message);

      if (job.attempts + 1 < this.maxRetries) {
        const retryJob: EmailJob = { ...job, attempts: job.attempts + 1 };
        // Wait a bit before retrying (exponential backoff)
        const delay = Math.pow(5, job.attempts + 1) * 1000;
        
        this.logger.log(`Retrying email in ${delay / 1000}s (Attempt ${retryJob.attempts})`);
        
        setTimeout(async () => {
          await this.rabbitMqService.sendToQueue(EMAIL_QUEUE, retryJob);
        }, delay);
      } else {
        this.logger.error(`Max retries reached for email ${job.type} to ${job.to}`);
      }
    }
  }

  private async sendEmail(job: EmailJob): Promise<void> {
    switch (job.type) {
      case 'welcome-tenant':
        await this.sendPulseService.sendWelcomeTenantEmail(
          job.to,
          job.data.userName,
          job.data.tenantName
        );
        break;
      case 'welcome-realtor':
        await this.sendPulseService.sendWelcomeRealtorEmail(
          job.to,
          job.data.userName
        );
        break;
      case 'password-reset':
        await this.sendPulseService.sendPasswordResetEmail(
          job.to,
          job.data.userName,
          job.data.resetToken
        );
        break;
      default:
        this.logger.warn(`Unknown email job type: ${(job as any).type}`);
    }
  }
}
