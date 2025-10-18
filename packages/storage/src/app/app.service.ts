import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'storage',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
