export interface QueueMessage {
  messageId?: string;
  content: unknown;
  properties?: {
    contentType?: string;
    contentEncoding?: string;
    deliveryMode?: number;
    priority?: number;
    correlationId?: string;
    replyTo?: string;
    expiration?: string;
    timestamp?: number;
  };
  fields?: {
    deliveryTag?: number;
    redelivered?: boolean;
    exchange?: string;
    routingKey?: string;
  };
}

export interface QueueStats {
  messageCount: number;
  consumerCount: number;
  messagesReady?: number;
  messagesUnacknowledged?: number;
  publishRate?: number;
  deliveryRate?: number;
}

export interface Queue {
  name: string;
  vhost: string;
  durable: boolean;
  autoDelete: boolean;
  arguments?: Record<string, unknown>;
  stats: QueueStats;
  state?: string;
}

export interface QueueListResponse {
  queues: Queue[];
  total: number;
  totalMessages: number;
  timestamp: string;
}

export interface QueueMessagesResponse {
  queueName: string;
  messages: QueueMessage[];
  count: number;
  totalInQueue: number;
  timestamp: string;
}

export interface PurgeQueueResponse {
  queueName: string;
  messagesPurged: number;
  success: boolean;
  message: string;
  timestamp: string;
}

export interface QueueStatsUpdate {
  queueName: string;
  stats: QueueStats;
  timestamp: string;
}
