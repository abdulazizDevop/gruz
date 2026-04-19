import express from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';
const PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const rawExt = extname(file.originalname || '').toLowerCase();
    const ext = /^\.(jpg|jpeg|png|webp|gif|heic|heif)$/.test(rawExt) ? rawExt : '.jpg';
    cb(null, `${Date.now()}-${nanoid(10)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif|heic|heif)$/i.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(Object.assign(new Error('INVALID_TYPE'), { status: 415 }));
  },
});

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');

app.use((req, res, next) => {
  if (ALLOWED_ORIGINS.length === 0) return next();
  const origin = req.headers.origin || req.headers.referer || '';
  const ok = ALLOWED_ORIGINS.some((a) => origin.startsWith(a));
  if (!ok) return res.status(403).json({ error: 'ORIGIN_NOT_ALLOWED' });
  next();
});

const hits = new Map();
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [ip, list] of hits) {
    const kept = list.filter((t) => t > cutoff);
    if (kept.length === 0) hits.delete(ip);
    else hits.set(ip, kept);
  }
}, 30_000).unref();

app.use((req, res, next) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (list.length >= 60) return res.status(429).json({ error: 'RATE_LIMITED' });
  list.push(now);
  hits.set(ip, list);
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'uploads' }));

app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
      return res.status(status).json({ error: err.message || err.code || 'UPLOAD_FAILED' });
    }
    if (!req.file) return res.status(400).json({ error: 'NO_FILE' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

app.listen(PORT, () => {
  console.log(`[uploads] listening on :${PORT}, dir=${UPLOAD_DIR}, maxSize=${MAX_SIZE}`);
});
