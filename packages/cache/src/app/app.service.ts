import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'cache',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
