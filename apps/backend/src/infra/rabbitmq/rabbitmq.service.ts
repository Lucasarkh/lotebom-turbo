import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AmqpConnectionManager,
  ChannelWrapper,
  connect
} from 'amqp-connection-manager';

@Injectable()
export class RabbitMqService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);
  private readonly connection: AmqpConnectionManager;
  private readonly producerChannel: ChannelWrapper;
  private readonly consumerChannels: ChannelWrapper[] = [];
  private readonly assertedQueues = new Set<string>();

  constructor(private configService: ConfigService) {
    const rabbitUrl = this.configService.get<string>('RABBITMQ_URL');

    this.connection = connect([rabbitUrl]);
    this.connection.on('connect', () =>
      this.logger.log('Connected to RabbitMQ')
    );
    this.connection.on('disconnect', (err) =>
      this.logger.error('RabbitMQ disconnected', err?.err ?? err)
    );

    this.producerChannel = this.connection.createChannel({
      json: true,
      setup: async () => {
        this.logger.log('RabbitMQ producer channel ready');
      }
    });
  }

  async sendToQueue(queue: string, payload: unknown) {
    await this.producerChannel.waitForConnect();
    await this.ensureQueue(queue);

    // Since channel is created with json: true, send the payload directly
    // The library handles JSON serialization automatically
    this.producerChannel.sendToQueue(queue, payload, {
      persistent: true
    } as Parameters<ChannelWrapper['sendToQueue']>[2]);
  }

  private async ensureQueue(queue: string) {
    if (this.assertedQueues.has(queue)) {
      return;
    }

    await this.producerChannel.addSetup(async (channel) => {
      await channel.assertQueue(queue, { durable: true });
    });

    this.assertedQueues.add(queue);
  }

  async createConsumer(options: {
    queue: string;
    prefetch?: number;
    onMessage: (payload: unknown) => Promise<void>;
  }) {
    const channel = this.connection.createChannel({
      json: true,
      setup: async (ch) => {
        await ch.assertQueue(options.queue, { durable: true });

        if (options.prefetch && options.prefetch > 0) {
          await ch.prefetch(options.prefetch);
        }

        await ch.consume(
          options.queue,
          async (msg) => {
            if (!msg) {
              return;
            }

            try {
              const payload = JSON.parse(msg.content.toString());
              await options.onMessage(payload);
              ch.ack(msg);
            } catch (error) {
              this.logger.error(
                `Failed to process message from ${options.queue}`,
                error
              );
              ch.nack(msg, false, false);
            }
          },
          { noAck: false }
        );
      }
    });

    this.consumerChannels.push(channel);
    await channel.waitForConnect();
  }

  async onModuleDestroy() {
    await Promise.all(
      this.consumerChannels.map((channel) =>
        channel.close().catch(() => undefined)
      )
    );

    await this.producerChannel.close().catch(() => undefined);
    await this.connection.close();
  }
}
