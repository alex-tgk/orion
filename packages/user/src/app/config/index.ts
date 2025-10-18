import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import redisConfig from './redis.config';
import storageConfig from './storage.config';
import rabbitmqConfig from './rabbitmq.config';

export const configModules = [
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  storageConfig,
  rabbitmqConfig,
];

export {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  storageConfig,
  rabbitmqConfig,
};

export * from './rate-limit.config';
