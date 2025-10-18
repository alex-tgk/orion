import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'dev-tools',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
