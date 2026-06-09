import { CorsOptions } from 'cors';

export type AppEnv = 'local' | 'dev' | 'prod' | 'test';

export const getAppEnv = (): AppEnv => {
  const value = process.env.APP_ENV ?? 'local';

  if (
    value === 'local' ||
    value === 'dev' ||
    value === 'prod' ||
    value === 'test'
  ) {
    return value;
  }

  throw new Error(`Invalid APP_ENV: ${value}`);
};

export const isPublishedEnv = (): boolean => {
  const appEnv = getAppEnv();
  return appEnv === 'dev' || appEnv === 'prod';
};

export const getRequiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

export const getClientOrigins = (): string[] => {
  return (process.env.CLIENT_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const getCookieSameSite = (): 'lax' | 'none' | 'strict' => {
  const value = process.env.COOKIE_SAME_SITE;

  if (value === 'lax' || value === 'none' || value === 'strict') {
    return value;
  }

  return isPublishedEnv() ? 'none' : 'lax';
};

export const getCookieSecure = (): boolean => {
  const value = process.env.COOKIE_SECURE;

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return isPublishedEnv();
};

export const isSwaggerEnabled = (): boolean => {
  return process.env.SWAGGER_ENABLED !== 'false';
};

export const createHttpCorsOptions = (): CorsOptions => {
  const clientOrigins = getClientOrigins();

  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (clientOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  };
};

export const createSocketCorsOptions = () => {
  return {
    origin: getClientOrigins(),
    credentials: true,
  };
};
