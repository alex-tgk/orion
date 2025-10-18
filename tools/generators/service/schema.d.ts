export interface OrionServiceGeneratorSchema {
  name: string;
  port?: number;
  description?: string;
  withDatabase?: boolean;
  withRedis?: boolean;
  withRabbitMQ?: boolean;
  withWebSocket?: boolean;
  withCRUD?: boolean;
  withSwagger?: boolean;
  withE2E?: boolean;
  withDocker?: boolean;
  withKubernetes?: boolean;
  directory?: string;
  tags?: string;
}
