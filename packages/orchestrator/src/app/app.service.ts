import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'orchestrator',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
