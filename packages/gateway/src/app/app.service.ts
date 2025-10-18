import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'gateway',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
