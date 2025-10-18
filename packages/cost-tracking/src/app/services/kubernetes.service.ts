import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as k8s from '@kubernetes/client-node';
import { KubernetesMetrics } from '../interfaces/cost-tracking.interface';

@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);
  private readonly kubeConfig: k8s.KubeConfig;
  private readonly metricsClient: k8s.Metrics;
  private readonly coreApi: k8s.CoreV1Api;

  constructor(private readonly configService: ConfigService) {
    this.kubeConfig = new k8s.KubeConfig();

    try {
      // Try to load in-cluster config first, fall back to default config
      this.kubeConfig.loadFromCluster();
    } catch {
      this.kubeConfig.loadFromDefault();
    }

    this.metricsClient = new k8s.Metrics(this.kubeConfig);
    this.coreApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
  }

  /**
   * Get metrics for all pods in the cluster
   */
  async getMetrics(): Promise<KubernetesMetrics[]> {
    try {
      const namespace = this.configService.get<string>('costTracking.kubernetes.namespace') || '';
      const metrics: KubernetesMetrics[] = [];

      // Get pod metrics
      const podMetrics = await this.metricsClient.getPodMetrics(namespace);

      for (const podMetric of podMetrics.items) {
        const podName = podMetric.metadata.name;
        const podNamespace = podMetric.metadata.namespace;

        // Get pod resource requests and limits
        const pod = await this.coreApi.readNamespacedPod(podName, podNamespace);

        for (const container of podMetric.containers) {
          const containerSpec = pod.body.spec?.containers.find(c => c.name === container.name);

          const cpuUsage = this.parseCpu(container.usage.cpu);
          const cpuRequest = this.parseCpu(containerSpec?.resources?.requests?.cpu || '0');
          const cpuLimit = this.parseCpu(containerSpec?.resources?.limits?.cpu || '0');

          const memoryUsage = this.parseMemory(container.usage.memory);
          const memoryRequest = this.parseMemory(containerSpec?.resources?.requests?.memory || '0');
          const memoryLimit = this.parseMemory(containerSpec?.resources?.limits?.memory || '0');

          metrics.push({
            namespace: podNamespace,
            podName,
            containerName: container.name,
            cpu: {
              usage: cpuUsage,
              request: cpuRequest,
              limit: cpuLimit || cpuRequest || cpuUsage,
              utilizationPercent: cpuRequest > 0 ? (cpuUsage / cpuRequest) * 100 : 0,
            },
            memory: {
              usage: memoryUsage,
              request: memoryRequest,
              limit: memoryLimit || memoryRequest || memoryUsage,
              utilizationPercent: memoryRequest > 0 ? (memoryUsage / memoryRequest) * 100 : 0,
            },
          });
        }
      }

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get Kubernetes metrics', error);
      return [];
    }
  }

  /**
   * Get storage metrics for persistent volumes
   */
  async getStorageMetrics(): Promise<any[]> {
    try {
      const pvcs = await this.coreApi.listPersistentVolumeClaimForAllNamespaces();
      const storageMetrics = [];

      for (const pvc of pvcs.body.items) {
        const capacity = this.parseMemory(pvc.status?.capacity?.storage || '0');

        storageMetrics.push({
          namespace: pvc.metadata.namespace,
          name: pvc.metadata.name,
          capacity,
          storageClass: pvc.spec?.storageClassName,
        });
      }

      return storageMetrics;
    } catch (error) {
      this.logger.error('Failed to get storage metrics', error);
      return [];
    }
  }

  /**
   * Parse CPU string to cores (e.g., "100m" -> 0.1)
   */
  private parseCpu(cpu: string): number {
    if (!cpu) return 0;

    if (cpu.endsWith('m')) {
      return parseFloat(cpu.slice(0, -1)) / 1000;
    }

    if (cpu.endsWith('n')) {
      return parseFloat(cpu.slice(0, -1)) / 1000000000;
    }

    return parseFloat(cpu);
  }

  /**
   * Parse memory string to bytes (e.g., "100Mi" -> bytes)
   */
  private parseMemory(memory: string): number {
    if (!memory) return 0;

    const units: Record<string, number> = {
      Ki: 1024,
      Mi: 1024 * 1024,
      Gi: 1024 * 1024 * 1024,
      Ti: 1024 * 1024 * 1024 * 1024,
      K: 1000,
      M: 1000 * 1000,
      G: 1000 * 1000 * 1000,
      T: 1000 * 1000 * 1000 * 1000,
    };

    for (const [unit, multiplier] of Object.entries(units)) {
      if (memory.endsWith(unit)) {
        return parseFloat(memory.slice(0, -unit.length)) * multiplier;
      }
    }

    return parseFloat(memory);
  }
}
