import { createClient } from 'redis';
import { getAppEnv, getRequiredEnv } from '../../config/app.config';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

const getRedisUrl = (): string => {
  if (getAppEnv() === 'local') {
    return process.env.REDIS_URL ?? 'redis://localhost:6380';
  }

  return getRequiredEnv('REDIS_URL');
};

export const REDIS_URL = new URL(getRedisUrl());

export const redisProvider = {
  provide: REDIS_CLIENT,
  useFactory: async () => {
    const client = createClient({
      url: REDIS_URL.toString(),
    });

    client.on('error', (error) => {
      console.error('Redis error', error);
    });

    await client.connect();

    return client;
  },
};
