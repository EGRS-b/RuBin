const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const pkg = require('../package.json');
const storage = require('./storage');
const boardsStorage = require('./boardsStorage');
const { normalizeSortMode } = require('./pinSorter');
const { securityHeadersMiddleware, buildHealthPayload } = require('./securityHeaders');

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

let moderateComment;
let moderateBoardTitle;
try {
  ({ moderateComment, moderateBoardTitle } = require('./commentModeration'));
} catch {
  moderateComment = ({ author = '', text = '' } = {}) => {
    if (!String(text).trim()) return { allowed: false, reason: 'Введите текст комментария.' };
    const v = moderateContent({ title: author, description: text });
    return { allowed: v.status === 'approved', reason: v.reason };
  };
  moderateBoardTitle = (title = '', description = '') => {
    if (String(title).trim().length < 2) return { allowed: false, reason: 'Слишком короткое название.' };
    const v = moderateContent({ title, description });
    return { allowed: v.status === 'approved', reason: v.reason };
  };
}

let recordAuditEvent;
let getAuditLogs;
let getAuditSummary;
try {
  ({ recordAuditEvent, getAuditLogs, getAuditSummary } = require('./auditLogger'));
} catch {
  const memoryAudit = [];
  recordAuditEvent = ({ source = 'system', action = 'approved', target = '', reason = '' } = {}) => {
    const entry = {
      id: memoryAudit.length + 1,
      timestamp: new Date().toISOString(),
      source,
      action: action === 'rejected' ? 'blocked' : action === 'pending' ? 'flagged' : action,
      category: 'policy_check',
      categoryLabel: 'Проверка контента РФ',
      target,
      reason
    };
    memoryAudit.unshift(entry);
    return entry;
  };
  getAuditLogs = ({ limit = 30, action = '' } = {}) =>
    memoryAudit
      .filter((e) => !action || e.action === action)
      .slice(0, Number(limit) || 30);
  getAuditSummary = () => ({
    totalEvents: memoryAudit.length,
    blockedCount: memoryAudit.filter((e) => e.action === 'blocked').length,
    flaggedCount: memoryAudit.filter((e) => e.action === 'flagged').length,
    approvedCount: memoryAudit.filter((e) => e.action === 'approved').length,
    spamBlockedCount: 0,
    byCategory: {}
  });
}

let authService = null;
try {
  authService = require('./auth');
} catch {
  authService = null;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

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

app.disable('x-powered-by');
app.use(securityHeadersMiddleware);
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function extractAuthUser(req) {
  if (!authService) return null;
  const header = req.headers.authorization || '';
  if (!header) return null;
  return authService.getUserByToken(header);
}

app.get('/api/health', (_req, res) => {
  const overview = storage.getModerationOverview();
  const pinsCount =
    (overview.approvedPins || 0) + (overview.pendingPins || 0) + (overview.rejectedPins || 0);
  const boardsCount = boardsStorage.getBoards().length;

  res.json(
    buildHealthPayload({
      version: pkg.version || '1.1.0',
      pinsCount,
      boardsCount
    })
  );
});

app.post('/api/auth/register', (req, res) => {
  if (!authService) {
    return res.status(503).json({ ok: false, reason: 'Модуль авторизации временно недоступен.' });
  }
  const { username = '', password = '', displayName = '' } = req.body || {};
  const result = authService.registerUser(
    { username, password, displayName },
    { moderateText: moderateContent }
  );
  if (!result.ok) {
    return res.status(400).json(result);
  }
  recordAuditEvent({
    source: 'auth',
    action: 'approved',
    target: `@${result.user.username}`,
    reason: `Зарегистрирован новый участник сообщества (${result.user.displayName}).`
  });
  return res.status(201).json(result);
});

app.post('/api/auth/login', (req, res) => {
  if (!authService) {
    return res.status(503).json({ ok: false, reason: 'Модуль авторизации временно недоступен.' });
  }
  const { username = '', password = '' } = req.body || {};
  const result = authService.loginUser({ username, password });
  if (!result.ok) {
    return res.status(401).json(result);
  }
  return res.json(result);
});

app.post('/api/auth/logout', (req, res) => {
  if (authService) {
    authService.logoutUser(req.headers.authorization || '');
  }
  return res.json({ ok: true, message: 'Вы вышли из учётной записи.' });
});

app.get('/api/auth/me', (req, res) => {
  const user = extractAuthUser(req);
  if (!user) {
    return res.status(401).json({ ok: false, user: null, reason: 'Гостевой режим.' });
  }
  return res.json({ ok: true, user });
});

app.get('/api/pins', (req, res) => {
  const { topic, q = '', search = '', sort = 'newest' } = req.query;
  const queryText = q || search || '';
  const activeSort = normalizeSortMode(sort);

  const searchCheck = checkSearchQuery(queryText);
  if (searchCheck.blocked) {
    recordAuditEvent({
      source: 'search',
      action: 'blocked',
      target: 'Поисковый запрос ограничен',
      reason: searchCheck.reason
    });
    return res.json({
      topics: storage.TOPICS,
      sort: activeSort,
      pins: [],
      safeSearchBlocked: true,
      reason: searchCheck.reason
    });
  }

  const pins = storage.getApprovedPins({ topic, q: queryText, sort: activeSort });
  return res.json({
    topics: storage.TOPICS,
    sort: activeSort,
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
  const currentUser = extractAuthUser(req);
  const { title = '', description = '', topic = '', tags = '', author = '', imageUrl = '' } = req.body || {};
  const resolvedAuthor = currentUser ? currentUser.displayName : author;
  const originalFileName = req.file ? req.file.originalname : imageUrl;

  if (!title.trim()) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ ok: false, status: 'rejected', reason: 'Укажите название пина.' });
  }

  const verdict = moderateContent({ title, description, tags, fileName: originalFileName });
  if (verdict.status === 'rejected') {
    if (req.file) fs.unlinkSync(req.file.path);
    recordAuditEvent({
      source: 'pin',
      action: 'blocked',
      target: title.trim(),
      reason: verdict.reason
    });
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
    author: resolvedAuthor,
    imageUrl: finalImageUrl,
    status: verdict.status,
    moderationNote: verdict.status === 'pending' ? verdict.reason : ''
  });

  recordAuditEvent({
    source: 'pin',
    action: verdict.status,
    target: savedPin.title,
    reason: verdict.reason
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
  recordAuditEvent({
    source: 'report',
    action: 'flagged',
    target: updated.title,
    reason: updated.moderationNote
  });
  return res.json({
    ok: true,
    message: 'Жалоба принята! Карточка временно скрыта из ленты и передана модератору.',
    pin: updated
  });
});

app.get('/api/pins/:id/comments', (req, res) => {
  const comments = storage.getPinComments(req.params.id);
  if (!comments) return res.status(404).json({ ok: false, reason: 'Пин не найден' });
  return res.json({ ok: true, comments });
});

app.post('/api/pins/:id/comments', (req, res) => {
  const currentUser = extractAuthUser(req);
  const { author = '', text = '' } = req.body || {};
  const resolvedAuthor = currentUser ? currentUser.displayName : author;
  const check = moderateComment({ author: resolvedAuthor, text });
  if (!check.allowed) {
    recordAuditEvent({
      source: 'comment',
      action: 'blocked',
      target: `Пин #${req.params.id} (${resolvedAuthor || 'Гость'})`,
      reason: check.reason
    });
    return res.status(400).json({ ok: false, reason: check.reason });
  }
  const comment = storage.addPinComment(req.params.id, { author: resolvedAuthor, text });
  if (!comment) return res.status(404).json({ ok: false, reason: 'Пин не найден' });
  return res.status(201).json({ ok: true, reason: check.reason, comment });
});

app.get('/api/moderation/pending', (_req, res) => {
  const pendingPins = storage.getPendingPins();
  res.json({ count: pendingPins.length, pins: pendingPins });
});

app.get('/api/moderation/audit', (req, res) => {
  const { limit = 25, action = '' } = req.query;
  const logs = getAuditLogs({ limit, action });
  res.json({ ok: true, count: logs.length, logs });
});

app.get('/api/moderation/stats', (_req, res) => {
  const summary = getAuditSummary();
  const overview = storage.getModerationOverview();
  res.json({
    ok: true,
    stats: {
      ...summary,
      ...overview
    }
  });
});

app.post('/api/moderation/:id/decision', (req, res) => {
  const { decision } = req.body || {};
  const updated = storage.decidePinStatus(req.params.id, decision);
  if (!updated) {
    return res.status(400).json({ ok: false, reason: 'Некорректный запрос или пин не найден.' });
  }
  recordAuditEvent({
    source: 'moderator',
    action: updated.status === 'approved' ? 'approved' : 'blocked',
    target: updated.title,
    reason: updated.moderationNote
  });
  return res.json({ ok: true, status: updated.status, pin: updated });
});

app.get('/api/boards', (_req, res) => {
  res.json({ boards: boardsStorage.getBoards() });
});

app.post('/api/boards', (req, res) => {
  const { title = '', description = '' } = req.body || {};
  const check = moderateBoardTitle(title, description);
  if (!check.allowed) {
    recordAuditEvent({
      source: 'board',
      action: 'blocked',
      target: title || 'Новая доска',
      reason: check.reason
    });
    return res.status(400).json({ ok: false, reason: check.reason });
  }
  const board = boardsStorage.createBoard({ title, description });
  return res.status(201).json({ ok: true, reason: check.reason, board });
});

app.post('/api/boards/:id/pins', (req, res) => {
  const { pinId } = req.body || {};
  const result = boardsStorage.togglePinInBoard(req.params.id, pinId);
  if (!result) {
    return res.status(404).json({ ok: false, reason: 'Коллекция не найдена.' });
  }
  return res.json({
    ok: true,
    added: result.added,
    message: result.added ? 'Пин сохранён в коллекцию!' : 'Пин убран из коллекции.',
    board: result.board
  });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, reason: 'Маршрут API RuBin не найден.' });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    const clickableHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
    console.log(`RuBin server is running on http://${clickableHost}:${PORT}`);
  });
}

module.exports = app;