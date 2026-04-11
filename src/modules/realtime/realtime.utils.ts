import { Socket } from 'socket.io';
import * as cookie from 'cookie';
import cookieParser from 'cookie-parser';

export function extractSignedSessionId(client: Socket): string | null {
  const rawCookieHeader = client.handshake.headers.cookie;

  if (!rawCookieHeader) {
    return null;
  }

  const parsedCookies = cookie.parse(rawCookieHeader);

  const sessionId = cookieParser.signedCookie(
    parsedCookies['sessionId'],
    process.env.COOKIE_SECRET!,
  );

  if (!sessionId || typeof sessionId !== 'string') {
    return null;
  }

  return sessionId;
}
