import { createClient } from 'redis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const redisProvider = {
  provide: REDIS_CLIENT,
  useFactory: async () => {
    const client = createClient({
      url: process.env.REDIS_URL,
    });

    client.on('error', (error) => {
      console.error('Redis error', error);
    });

    await client.connect();

    return client;
  },
};
