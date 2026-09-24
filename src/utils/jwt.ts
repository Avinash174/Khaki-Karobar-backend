import jwt, { SignOptions } from 'jsonwebtoken';
import { ENV } from '../config/env';

export interface TokenPayload {
  userId: string;
  role: string;
  phone: string;
  email?: string | null;
  businessId?: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: ENV.JWT_EXPIRES_IN as any };
  return jwt.sign(payload, ENV.JWT_SECRET, options);
}

export function generateRefreshToken(payload: { userId: string }): string {
  const options: SignOptions = { expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any };
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as { userId: string };
}
