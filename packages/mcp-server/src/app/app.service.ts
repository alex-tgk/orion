import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'mcp-server',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
