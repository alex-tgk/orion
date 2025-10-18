import type { Meta, StoryObj } from '@storybook/react';
import { ServiceHealthCard } from './ServiceHealthCard';
import { ServiceHealth, ServiceStatus, HealthCheckStatus } from '../../types/health';

const meta: Meta<typeof ServiceHealthCard> = {
  title: 'Health/ServiceHealthCard',
  component: ServiceHealthCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ServiceHealthCard>;

const baseService: ServiceHealth = {
  serviceName: 'gateway',
  uptime: 99.9,
  lastCheckTimestamp: new Date().toISOString(),
  responseTime: 45,
  version: '1.0.0',
  dependencies: ['auth', 'user'],
  checks: [
    {
      name: 'database',
      status: HealthCheckStatus.PASS,
      message: 'Connected',
      timestamp: new Date().toISOString(),
      responseTime: 12,
    },
    {
      name: 'redis',
      status: HealthCheckStatus.PASS,
      message: 'Connected',
      timestamp: new Date().toISOString(),
      responseTime: 5,
    },
  ],
  status: ServiceStatus.HEALTHY,
};

export const Healthy: Story = {
  args: {
    service: baseService,
  },
};

export const Degraded: Story = {
  args: {
    service: {
      ...baseService,
      serviceName: 'auth',
      status: ServiceStatus.DEGRADED,
      uptime: 95.5,
      responseTime: 250,
      checks: [
        {
          name: 'database',
          status: HealthCheckStatus.PASS,
          message: 'Connected',
          timestamp: new Date().toISOString(),
        },
        {
          name: 'redis',
          status: HealthCheckStatus.WARN,
          message: 'High latency',
          timestamp: new Date().toISOString(),
        },
      ],
    },
  },
};

export const Unhealthy: Story = {
  args: {
    service: {
      ...baseService,
      serviceName: 'user',
      status: ServiceStatus.UNHEALTHY,
      uptime: 75.2,
      responseTime: 1500,
      error: 'Database connection failed',
      checks: [
        {
          name: 'database',
          status: HealthCheckStatus.FAIL,
          message: 'Connection timeout',
          timestamp: new Date().toISOString(),
        },
        {
          name: 'redis',
          status: HealthCheckStatus.PASS,
          message: 'Connected',
          timestamp: new Date().toISOString(),
        },
      ],
    },
  },
};

export const Unknown: Story = {
  args: {
    service: {
      ...baseService,
      serviceName: 'notifications',
      status: ServiceStatus.UNKNOWN,
      uptime: 0,
      responseTime: 0,
      error: 'Service unreachable',
      checks: [],
    },
  },
};

export const WithClickHandler: Story = {
  args: {
    service: baseService,
    onClick: (serviceName) => alert(`Clicked: ${serviceName}`),
  },
};

export const NoDependencies: Story = {
  args: {
    service: {
      ...baseService,
      dependencies: [],
    },
  },
};
