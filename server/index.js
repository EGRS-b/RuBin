const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const storage = require('./storage');

let moderateContent;
let checkSearchQuery;
try {
  const mod = require('./moderation');
  moderateContent = mod.moderateContent;
  checkSearchQuery =
    mod.checkSearchQuery ||
    ((q) => {
      const v = mod.moderateContent({ title: q });
      return v.status === 'rejected'
        ? { blocked: true, reason: 'Безопасный поиск RuBin: запрос скрыт по правилам РФ.' }
        : { blocked: false, reason: null };
    });
} catch {
  moderateContent = () => ({ status: 'approved', reason: 'Базовый режим проверки активен.' });
  checkSearchQuery = () => ({ blocked: false, reason: null });
}

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `pin-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'RuBin API', timestamp: new Date().toISOString() });
});

app.get('/api/pins', (req, res) => {
  const { topic, q = '' } = req.query;
  const searchCheck = checkSearchQuery(q);
  if (searchCheck.blocked) {
    return res.json({
      topics: storage.TOPICS,
      pins: [],
      safeSearchBlocked: true,
      reason: searchCheck.reason
    });
  }

  const pins = storage.getApprovedPins({ topic, q });
  return res.json({
    topics: storage.TOPICS,
    pins,
    safeSearchBlocked: false,
    reason: null
  });
});

app.post('/api/moderate-check', (req, res) => {
  const { title = '', description = '', tags = '', fileName = '' } = req.body || {};
  res.json(moderateContent({ title, description, tags, fileName }));
});

app.post('/api/pins', upload.single('image'), (req, res) => {
  const { title = '', description = '', topic = '', tags = '', author = '', imageUrl = '' } = req.body || {};
  const originalFileName = req.file ? req.file.originalname : imageUrl;

  if (!title.trim()) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ ok: false, status: 'rejected', reason: 'Укажите название пина.' });
  }

  const verdict = moderateContent({ title, description, tags, fileName: originalFileName });
  if (verdict.status === 'rejected') {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ ok: false, status: 'rejected', reason: verdict.reason });
  }

  const finalImageUrl = req.file ? `/uploads/${req.file.filename}` : imageUrl.trim();
  if (!finalImageUrl) {
    return res.status(400).json({ ok: false, status: 'rejected', reason: 'Добавьте изображение или ссылку на фото.' });
  }

  const savedPin = storage.addPin({
    title,
    description,
    topic,
    tags,
    author,
    imageUrl: finalImageUrl,
    status: verdict.status,
    moderationNote: verdict.status === 'pending' ? verdict.reason : ''
  });

  return res.status(201).json({
    ok: true,
    status: verdict.status,
    reason: verdict.reason,
    pin: savedPin
  });
});

app.post('/api/pins/:id/like', (req, res) => {
  const updated = storage.likePin(req.params.id);
  if (!updated) return res.status(404).json({ ok: false, reason: 'Пин не найден' });
  return res.json({ ok: true, likes: updated.likes, pin: updated });
});

app.post('/api/pins/:id/report', (req, res) => {
  const { reason = 'Нарушение правил сообщества RuBin' } = req.body || {};
  const updated = storage.reportPin(req.params.id, reason);
  if (!updated) return res.status(404).json({ ok: false, reason: 'Пин не найден' });
  return res.json({
    ok: true,
    message: 'Жалоба принята! Карточка временно скрыта из ленты и передана модератору.',
    pin: updated
  });
});

app.get('/api/moderation/pending', (_req, res) => {
  const pendingPins = storage.getPendingPins();
  res.json({ count: pendingPins.length, pins: pendingPins });
});

app.post('/api/moderation/:id/decision', (req, res) => {
  const { decision } = req.body || {};
  const updated = storage.decidePinStatus(req.params.id, decision);
  if (!updated) {
    return res.status(400).json({ ok: false, reason: 'Некорректный запрос или пин не найден.' });
  }
  return res.json({ ok: true, status: updated.status, pin: updated });
});

app.listen(PORT, () => {
  console.log(`RuBin server is running on http://localhost:${PORT}`);
});
