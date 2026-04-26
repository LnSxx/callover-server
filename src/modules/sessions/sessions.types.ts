export type CreateSessionParams = {
  userId: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

export type CreateSessionResult = {
  sessionId: string;
  expirationTime: Date;
};
