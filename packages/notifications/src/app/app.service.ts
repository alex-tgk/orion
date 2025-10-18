import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'notifications',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
