import { ApiProperty } from '@nestjs/swagger';

export class RequestMetricsDto {
  @ApiProperty({ description: 'Total requests in time period' })
  total: number;

  @ApiProperty({ description: 'Successful requests (2xx)' })
  success: number;

  @ApiProperty({ description: 'Client errors (4xx)' })
  clientErrors: number;

  @ApiProperty({ description: 'Server errors (5xx)' })
  serverErrors: number;

  @ApiProperty({ description: 'Average response time in ms' })
  avgResponseTime: number;

  @ApiProperty({ description: 'P95 response time in ms' })
  p95ResponseTime: number;

  @ApiProperty({ description: 'P99 response time in ms' })
  p99ResponseTime: number;

  @ApiProperty({ description: 'Requests per second' })
  requestsPerSecond: number;
}

export class ResourceMetricsDto {
  @ApiProperty({ description: 'Memory usage in MB' })
  memoryUsage: number;

  @ApiProperty({ description: 'Memory limit in MB' })
  memoryLimit: number;

  @ApiProperty({ description: 'CPU usage percentage' })
  cpuUsage: number;

  @ApiProperty({ description: 'Heap used in MB' })
  heapUsed: number;

  @ApiProperty({ description: 'Heap total in MB' })
  heapTotal: number;

  @ApiProperty({ description: 'External memory in MB' })
  external: number;

  @ApiProperty({ description: 'Event loop lag in ms', required: false })
  eventLoopLag?: number;
}

export class DatabaseMetricsDto {
  @ApiProperty({ description: 'Active connections' })
  activeConnections: number;

  @ApiProperty({ description: 'Idle connections' })
  idleConnections: number;

  @ApiProperty({ description: 'Total queries executed' })
  queriesExecuted: number;

  @ApiProperty({ description: 'Average query time in ms' })
  avgQueryTime: number;

  @ApiProperty({ description: 'Slow queries (>100ms)' })
  slowQueries: number;
}

export class CacheMetricsDto {
  @ApiProperty({ description: 'Cache hits' })
  hits: number;

  @ApiProperty({ description: 'Cache misses' })
  misses: number;

  @ApiProperty({ description: 'Hit rate percentage' })
  hitRate: number;

  @ApiProperty({ description: 'Total keys in cache' })
  keys: number;

  @ApiProperty({ description: 'Memory used by cache in MB' })
  memoryUsed: number;
}

export class EndpointMetricsDto {
  @ApiProperty({ description: 'Endpoint path' })
  path: string;

  @ApiProperty({ description: 'HTTP method' })
  method: string;

  @ApiProperty({ description: 'Request count' })
  count: number;

  @ApiProperty({ description: 'Average response time in ms' })
  avgResponseTime: number;

  @ApiProperty({ description: 'Error count' })
  errors: number;

  @ApiProperty({ description: 'Error rate percentage' })
  errorRate: number;
}

export class ServiceMetricsDto {
  @ApiProperty({ description: 'Service name' })
  serviceName: string;

  @ApiProperty({ type: RequestMetricsDto, description: 'Request metrics' })
  requests: RequestMetricsDto;

  @ApiProperty({ type: ResourceMetricsDto, description: 'Resource metrics' })
  resources: ResourceMetricsDto;

  @ApiProperty({ type: DatabaseMetricsDto, required: false })
  database?: DatabaseMetricsDto;

  @ApiProperty({ type: CacheMetricsDto, required: false })
  cache?: CacheMetricsDto;

  @ApiProperty({ type: [EndpointMetricsDto], description: 'Top endpoints by traffic' })
  topEndpoints: EndpointMetricsDto[];

  @ApiProperty({ description: 'Metrics collection timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Time range for metrics in minutes' })
  timeRange: number;
}
