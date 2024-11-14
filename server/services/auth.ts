import jwt from 'jsonwebtoken';
import { db } from '../../db';
import { sessions } from '../../db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'cinema-secret';

export async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.token, token),
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return decoded;
  } catch (err) {
    return null;
  }
}

export function generateToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
