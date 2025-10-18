import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'ai-interface',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
