import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'webhooks',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
