import express from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';
const PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Firebase Admin — used only for FCM push send. Reads service account JSON
// from a base64-encoded env var (FIREBASE_SERVICE_ACCOUNT) so the secret
// stays out of source and out of images.
let messaging = null;
let firestore = null;
try {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const decoded = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');
    const cred = JSON.parse(decoded);
    const firebaseApp = initializeApp({ credential: cert(cred) });
    messaging = getMessaging(firebaseApp);
    firestore = getFirestore(firebaseApp);
    console.log('[push] firebase-admin ready');
  } else {
    console.warn('[push] FIREBASE_SERVICE_ACCOUNT not set — push disabled');
  }
} catch (err) {
  console.warn('[push] firebase-admin init failed:', err.message);
}

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
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, service: 'uploads', pushReady: !!messaging }),
);

app.use((req, res, next) => {
  if (ALLOWED_ORIGINS.length === 0) return next();
  const origin = req.headers.origin || req.headers.referer || '';
  if (!origin) return next();
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

// ---- FCM push send ---------------------------------------------------------
// Client calls this after a status transition that other users should hear
// about. Body: { orderId, event, actorName }. Endpoint reads the order and
// users from Firestore, picks target FCM tokens, and sends via FCM.

const pickRecipients = (order, users) => {
  const creatorId = order.adminId;
  const targetIds = new Set();
  if (creatorId) targetIds.add(creatorId);
  for (const u of users) {
    if (u.role === 'superadmin') targetIds.add(u.id);
  }
  const tokens = [];
  for (const u of users) {
    if (targetIds.has(u.id) && u.fcmToken) tokens.push(u.fcmToken);
  }
  return { tokens, targetIds: [...targetIds] };
};

const eventText = (event, order, actorName) => {
  const who = actorName || 'Кто-то';
  if (event === 'ready') {
    return {
      title: `Заказ #${order.code} готов!`,
      body: `${who} завершил работу над заказом.`,
    };
  }
  if (event === 'shipped') {
    return {
      title: `Заказ #${order.code} отгружен`,
      body: `${who} отгрузил заказ.`,
    };
  }
  return { title: 'DoorMan', body: 'Обновление заказа' };
};

app.post('/api/notify-order-event', async (req, res) => {
  if (!messaging || !firestore) {
    return res.status(503).json({ error: 'PUSH_DISABLED' });
  }
  const { orderId, event, actorName } = req.body || {};
  if (!orderId || !event) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }
  try {
    const orderSnap = await firestore.collection('orders').doc(orderId).get();
    const salesSnap = orderSnap.exists
      ? null
      : await firestore.collection('sales').doc(orderId).get();
    const order = orderSnap.exists
      ? orderSnap.data()
      : salesSnap && salesSnap.exists
        ? salesSnap.data()
        : null;
    if (!order) return res.status(404).json({ error: 'ORDER_NOT_FOUND' });

    const usersSnap = await firestore.collection('users').get();
    const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const { tokens, targetIds } = pickRecipients(order, users);
    if (tokens.length === 0) {
      return res.json({ success: 0, failure: 0, targetIds, note: 'NO_TOKENS' });
    }

    const { title, body } = eventText(event, order, actorName);
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: {
        orderId: String(orderId),
        orderCode: String(order.code || ''),
        event: String(event),
      },
      webpush: {
        notification: {
          icon: '/doorman-logo.png',
          badge: '/doorman-logo.png',
          vibrate: [100, 50, 100],
          tag: `order-${event}-${orderId}`,
        },
      },
    });

    // Clean up tokens Firebase reports as no-longer-valid so we don't spam
    // dead tokens on every write.
    const staleTokens = new Set();
    result.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code || '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          staleTokens.add(tokens[i]);
        }
      }
    });
    if (staleTokens.size > 0) {
      await Promise.all(
        users
          .filter((u) => u.fcmToken && staleTokens.has(u.fcmToken))
          .map((u) =>
            firestore
              .collection('users')
              .doc(u.id)
              .update({ fcmToken: null })
              .catch(() => {}),
          ),
      );
    }

    res.json({
      success: result.successCount,
      failure: result.failureCount,
      targetIds,
    });
  } catch (err) {
    console.error('[push] send failed:', err);
    res.status(500).json({ error: err.message || 'SEND_FAILED' });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

app.listen(PORT, () => {
  console.log(`[uploads] listening on :${PORT}, dir=${UPLOAD_DIR}, maxSize=${MAX_SIZE}`);
});
