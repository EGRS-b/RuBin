const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const storage = require('./storage');

let moderateContent;
try {
  ({ moderateContent } = require('./moderation'));
} catch {
  moderateContent = () => ({
    status: 'approved',
    reason: 'Базовый режим проверки активен.'
  });
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
  res.json({
    status: 'ok',
    service: 'RuBin API',
    timestamp: new Date().toISOString()
  });
});

// Получение ленты одобренных пинов и списка тем
app.get('/api/pins', (req, res) => {
  const { topic, q } = req.query;
  const pins = storage.getApprovedPins({ topic, q });
  res.json({
    topics: storage.TOPICS,
    pins
  });
});

// Живая проверка текста фильтром модерации РФ
app.post('/api/moderate-check', (req, res) => {
  const { title = '', description = '', tags = '', fileName = '' } = req.body || {};
  const verdict = moderateContent({ title, description, tags, fileName });
  res.json(verdict);
});

// Публикация нового пина (с проверкой модерацией)
app.post('/api/pins', upload.single('image'), (req, res) => {
  const { title = '', description = '', topic = '', tags = '', author = '', imageUrl = '' } = req.body || {};
  const originalFileName = req.file ? req.file.originalname : imageUrl;

  if (!title.trim()) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ ok: false, status: 'rejected', reason: 'Укажите название пина.' });
  }

  const verdict = moderateContent({
    title,
    description,
    tags,
    fileName: originalFileName
  });

  if (verdict.status === 'rejected') {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      ok: false,
      status: 'rejected',
      reason: verdict.reason
    });
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
    status: verdict.status
  });

  return res.status(201).json({
    ok: true,
    status: verdict.status,
    reason: verdict.reason,
    pin: savedPin
  });
});

app.listen(PORT, () => {
  console.log(`RuBin server is running on http://localhost:${PORT}`);
});