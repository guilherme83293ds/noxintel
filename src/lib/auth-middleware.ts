import { createMiddleware } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { verifyToken, getUserById } from './auth';

export const requireAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest();
    let token = '';
    const authHeader = request?.headers?.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    } else {
      const cookie = request?.headers?.get('cookie') || '';
      const match = cookie.match(/(?:^|;\s*)nox_token=([^;]+)/);
      if (match) token = match[1];
    }
    if (!token) throw new Error('Unauthorized');
    const payload = verifyToken(token);
    if (!payload) throw new Error('Unauthorized: invalid token');
    const user = await getUserById(payload.userId);
    if (!user) throw new Error('Unauthorized: user not found');
    return next({
      context: {
        userId: user.id,
        email: user.email,
        profile: user,
      },
    });
  }
);
