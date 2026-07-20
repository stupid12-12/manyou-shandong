import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  checkinSchema,
  loginSchema,
  progressSchema,
  registerSchema,
  tripData,
  type UserProgress
} from '@manyou/shared';

type DemoUser = { id: string; username: string; displayName: string; passwordHash: string };
type AuthedRequest = Request & { userId?: string };

const users = new Map<string, DemoUser>();
const progress = new Map<string, UserProgress>();
const refreshTokens = new Map<string, { userId: string; expiresAt: number }>();
const accessSecret = process.env.JWT_ACCESS_SECRET ?? 'demo-access-secret-replace-in-production';
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'demo-refresh-secret-replace-in-production';

function payload(user: DemoUser) {
  return { id: user.id, username: user.username, displayName: user.displayName };
}

function issueTokens(user: DemoUser) {
  const accessToken = jwt.sign({ sub: user.id, type: 'access' }, accessSecret, { expiresIn: '15m' });
  const nonce = randomBytes(16).toString('hex');
  const refreshToken = jwt.sign({ sub: user.id, type: 'refresh', nonce }, refreshSecret, { expiresIn: '7d' });
  const hash = createHash('sha256').update(refreshToken).digest('hex');
  refreshTokens.set(hash, { userId: user.id, expiresAt: Date.now() + 7 * 86400000 });
  return { accessToken, refreshToken };
}

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie('manyou_refresh', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 86400000,
    path: '/api/auth'
  });
}

function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: '请先登录' } });
  try {
    const decoded = jwt.verify(token, accessSecret) as jwt.JwtPayload;
    req.userId = String(decoded.sub);
    next();
  } catch {
    res.status(401).json({ data: null, error: { code: 'TOKEN_EXPIRED', message: '登录状态已过期' } });
  }
}

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok', mode: 'demo' }, error: null }));
  app.get('/api/trips/current', (_req, res) => res.json({ data: tripData, error: null }));
  app.get('/api/cities/:cityId', (req, res) => {
    const city = tripData.cities.find((item) => item.id === req.params.cityId);
    if (!city) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: '城市不存在' } });
    res.json({ data: city, error: null });
  });
  app.get('/api/spots/:spotId', (req, res) => {
    const spot = tripData.cities.flatMap((city) => city.spots).find((item) => item.id === req.params.spotId);
    if (!spot) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: '景点不存在' } });
    res.json({ data: spot, error: null });
  });

  app.post('/api/auth/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ data: null, error: { code: 'INVALID_INPUT', message: '请检查注册信息' } });
    const key = parsed.data.username.toLowerCase();
    if (users.has(key)) return res.status(409).json({ data: null, error: { code: 'USERNAME_TAKEN', message: '用户名已存在' } });
    const user = { id: randomBytes(8).toString('hex'), username: key, displayName: parsed.data.displayName, passwordHash: await bcrypt.hash(parsed.data.password, 10) };
    users.set(key, user);
    progress.set(user.id, { activeCityId: 'shandong', characterSpotId: null, visitedSpotIds: [], updatedAt: new Date().toISOString() });
    const tokens = issueTokens(user);
    setRefreshCookie(res, tokens.refreshToken);
    res.status(201).json({ data: { user: payload(user), accessToken: tokens.accessToken }, error: null });
  });

  app.post('/api/auth/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    const user = parsed.success ? users.get(parsed.data.username.toLowerCase()) : undefined;
    if (!parsed.success || !user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ data: null, error: { code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' } });
    }
    const tokens = issueTokens(user);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ data: { user: payload(user), accessToken: tokens.accessToken }, error: null });
  });

  app.post('/api/auth/refresh', (req, res) => {
    const token = req.cookies.manyou_refresh as string | undefined;
    if (!token) return res.status(401).json({ data: null, error: { code: 'NO_REFRESH', message: '请重新登录' } });
    const hash = createHash('sha256').update(token).digest('hex');
    const session = refreshTokens.get(hash);
    try {
      jwt.verify(token, refreshSecret);
      if (!session || session.expiresAt < Date.now()) throw new Error('expired');
      refreshTokens.delete(hash);
      const user = [...users.values()].find((item) => item.id === session.userId);
      if (!user) throw new Error('user missing');
      const tokens = issueTokens(user);
      setRefreshCookie(res, tokens.refreshToken);
      res.json({ data: { user: payload(user), accessToken: tokens.accessToken }, error: null });
    } catch {
      refreshTokens.delete(hash);
      res.status(401).json({ data: null, error: { code: 'INVALID_REFRESH', message: '请重新登录' } });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = req.cookies.manyou_refresh as string | undefined;
    if (token) refreshTokens.delete(createHash('sha256').update(token).digest('hex'));
    res.clearCookie('manyou_refresh', { path: '/api/auth' });
    res.status(204).send();
  });

  app.get('/api/users/me/progress', authenticate, (req: AuthedRequest, res) => {
    res.json({ data: progress.get(req.userId!) ?? null, error: null });
  });
  app.put('/api/users/me/progress', authenticate, (req: AuthedRequest, res) => {
    const parsed = progressSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ data: null, error: { code: 'INVALID_INPUT', message: '进度数据无效' } });
    const value = { ...parsed.data, updatedAt: new Date().toISOString() };
    progress.set(req.userId!, value);
    res.json({ data: value, error: null });
  });
  app.post('/api/users/me/checkins', authenticate, (req: AuthedRequest, res) => {
    const parsed = checkinSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ data: null, error: { code: 'INVALID_INPUT', message: '景点无效' } });
    const current = progress.get(req.userId!) ?? { activeCityId: 'shandong' as const, characterSpotId: null, visitedSpotIds: [], updatedAt: '' };
    const spot = tripData.cities.flatMap((city) => city.spots).find((item) => item.id === parsed.data.spotId);
    if (!spot) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: '景点不存在' } });
    const value: UserProgress = { activeCityId: spot.cityId, characterSpotId: spot.id, visitedSpotIds: [...new Set([...current.visitedSpotIds, spot.id])], updatedAt: new Date().toISOString() };
    progress.set(req.userId!, value);
    res.status(201).json({ data: value, error: null });
  });
  app.delete('/api/users/me/checkins/:spotId', authenticate, (req: AuthedRequest, res) => {
    const current = progress.get(req.userId!);
    if (current) progress.set(req.userId!, { ...current, visitedSpotIds: current.visitedSpotIds.filter((id) => id !== req.params.spotId), updatedAt: new Date().toISOString() });
    res.status(204).send();
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: '服务暂时不可用' } });
  });

  // 生产模式：托管前端静态文件
  const rootDir = fileURLToPath(new URL('..', import.meta.url));
  const webDist = resolve(rootDir, '../web/dist');
  if (process.env.NODE_ENV === 'production' && existsSync(webDist)) {
    app.use(express.static(webDist, { maxAge: '7d', etag: true }));
    // SPA fallback：非 API 路径返回 index.html
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(resolve(webDist, 'index.html'));
    });
  }

  return app;
}
