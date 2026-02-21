import { Injectable, NestMiddleware } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total de requisições HTTP',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 3, 5],
});

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;

      const route = req.route?.path || req.originalUrl || 'unknown';

      httpRequestsTotal.inc({
        method: req.method,
        route,
        status: res.statusCode,
      });

      httpRequestDuration.observe(
        { method: req.method, route, status: res.statusCode },
        duration,
      );
    });

    next();
  }
}
