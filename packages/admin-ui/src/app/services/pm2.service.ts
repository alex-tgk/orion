import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as pm2 from 'pm2';
import { PM2ProcessDto, PM2ProcessListDto, PM2LogsDto, PM2ProcessStatus } from '../dto/pm2.dto';

@Injectable()
export class PM2Service implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PM2Service.name);
  private isConnected = false;

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      pm2.connect((err) => {
        if (err) {
          this.logger.error(`Failed to connect to PM2: ${err.message}`);
          reject(err);
        } else {
          this.isConnected = true;
          this.logger.log('Successfully connected to PM2');
          resolve();
        }
      });
    });
  }

  private async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    pm2.disconnect();
    this.isConnected = false;
    this.logger.log('Disconnected from PM2');
  }

  async listProcesses(): Promise<PM2ProcessListDto> {
    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      pm2.list((err, list) => {
        if (err) {
          this.logger.error(`Failed to list PM2 processes: ${err.message}`);
          reject(err);
          return;
        }

        const processes: PM2ProcessDto[] = list.map((proc) => ({
          pm_id: proc.pm_id ?? 0,
          name: proc.name ?? 'unknown',
          status: (proc.pm2_env?.status as PM2ProcessStatus) ?? PM2ProcessStatus.STOPPED,
          pid: proc.pid ?? 0,
          restarts: proc.pm2_env?.restart_time ?? 0,
          uptime: proc.pm2_env?.pm_uptime ? Date.now() - proc.pm2_env.pm_uptime : 0,
          monit: {
            memory: proc.monit?.memory ?? 0,
            cpu: proc.monit?.cpu ?? 0,
          },
          script: proc.pm2_env?.pm_exec_path,
          interpreter: proc.pm2_env?.exec_interpreter,
          nodeVersion: proc.pm2_env?.node_version,
        }));

        const running = processes.filter((p) => p.status === PM2ProcessStatus.ONLINE).length;
        const stopped = processes.filter((p) => p.status === PM2ProcessStatus.STOPPED).length;

        resolve({
          processes,
          total: processes.length,
          running,
          stopped,
        });
      });
    });
  }

  async getProcess(id: number): Promise<PM2ProcessDto> {
    const list = await this.listProcesses();
    const process = list.processes.find((p) => p.pm_id === id);

    if (!process) {
      throw new Error(`PM2 process with ID ${id} not found`);
    }

    return process;
  }

  async restartProcess(id: number): Promise<{ success: boolean; message: string }> {
    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve, _reject) => {
      pm2.restart(id, (err) => {
        if (err) {
          this.logger.error(`Failed to restart process ${id}: ${err.message}`);
          resolve({ success: false, message: err.message });
        } else {
          this.logger.log(`Successfully restarted process ${id}`);
          resolve({ success: true, message: 'Process restarted successfully' });
        }
      });
    });
  }

  async reloadProcess(id: number): Promise<{ success: boolean; message: string }> {
    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve, _reject) => {
      pm2.reload(id, (err) => {
        if (err) {
          this.logger.error(`Failed to reload process ${id}: ${err.message}`);
          resolve({ success: false, message: err.message });
        } else {
          this.logger.log(`Successfully reloaded process ${id}`);
          resolve({ success: true, message: 'Process reloaded successfully (zero-downtime)' });
        }
      });
    });
  }

  async stopProcess(id: number): Promise<{ success: boolean; message: string }> {
    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve, _reject) => {
      pm2.stop(id, (err) => {
        if (err) {
          this.logger.error(`Failed to stop process ${id}: ${err.message}`);
          resolve({ success: false, message: err.message });
        } else {
          this.logger.log(`Successfully stopped process ${id}`);
          resolve({ success: true, message: 'Process stopped successfully' });
        }
      });
    });
  }

  async startProcess(id: number): Promise<{ success: boolean; message: string }> {
    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve, _reject) => {
      pm2.restart(id, (err) => {
        if (err) {
          this.logger.error(`Failed to start process ${id}: ${err.message}`);
          resolve({ success: false, message: err.message });
        } else {
          this.logger.log(`Successfully started process ${id}`);
          resolve({ success: true, message: 'Process started successfully' });
        }
      });
    });
  }

  async getProcessLogs(id: number, _: number = 100): Promise<PM2LogsDto> {
    const process = await this.getProcess(id);

    // Note: PM2 doesn't provide a direct API to read logs programmatically
    // We would need to read from the log files directly
    // For now, returning a placeholder
    this.logger.warn('PM2 log reading not fully implemented - requires file system access');

    return {
      processId: id,
      processName: process.name,
      logs: [
        'Log reading from PM2 requires direct file system access',
        'Log files are typically in ~/.pm2/logs/',
        `Check: ~/.pm2/logs/${process.name}-out.log`,
        `Check: ~/.pm2/logs/${process.name}-error.log`,
      ],
      count: 4,
      timestamp: new Date().toISOString(),
    };
  }
}
