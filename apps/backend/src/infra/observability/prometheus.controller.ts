import { Controller, Get } from '@nestjs/common';
import { Registry } from 'prom-client';

@Controller()
export class MetricsController {
  constructor(private registry: Registry) {}

  @Get('metrics')
  getMetrics() {
    return this.registry.metrics();
  }
}
