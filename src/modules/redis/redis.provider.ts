import { createClient } from 'redis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const REDIS_URL = new URL(
  process.env.REDIS_URL ?? 'redis://localhost:6380',
);

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
