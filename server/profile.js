const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');

const AVATAR_PREFIX = '/uploads/avatars/';
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1 }
}).single('avatar');

function readAvatar(req, res, next) {
  uploadAvatar(req, res, (error) => {
    if (!error) return next();
    const reason = error.code === 'LIMIT_FILE_SIZE'
      ? 'Размер фото профиля должен быть не больше 5 МБ.'
      : 'Не удалось прочитать фото профиля.';
    return res.status(400).json({ ok: false, reason });
  });
}

function imageExtension(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return '.png';
  if (buffer.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return '.jpg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
}

function originalFileName(name) {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? name : decoded;
}

function removeAvatar(directory, url) {
  if (!url || !url.startsWith(AVATAR_PREFIX)) return;
  const filename = url.slice(AVATAR_PREFIX.length);
  if (!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(filename)) return;
  try {
    fs.rmSync(path.join(directory, filename), { force: true });
  } catch (error) {
    console.error('Не удалось удалить фото профиля:', error.message);
  }
}

function registerProfileRoutes(app, { requireUser, authService, moderateContent, recordAuditEvent, uploadsDir }) {
  const avatarsDir = path.join(uploadsDir, 'avatars');

  app.get('/api/users/me', requireUser, (req, res) => {
    res.json({ ok: true, user: req.user });
  });

  app.patch('/api/users/me', requireUser, readAvatar, (req, res, next) => {
    const { displayName } = req.body || {};
    const rename = displayName !== undefined;
    if (!rename && !req.file) {
      return res.status(400).json({ ok: false, reason: 'Укажи имя или выбери фото.' });
    }
    const cleanName = typeof displayName === 'string' ? displayName.trim() : '';
    if (rename && (cleanName.length < 2 || cleanName.length > 40)) {
      return res.status(400).json({ ok: false, reason: 'Имя должно содержать от 2 до 40 символов.' });
    }

    const fileName = req.file ? originalFileName(req.file.originalname) : '';
    const verdict = moderateContent({ title: cleanName, fileName });
    if (verdict.status !== 'approved') {
      recordAuditEvent({
        source: 'auth',
        action: verdict.status,
        target: '@' + req.user.username,
        reason: verdict.reason
      });
      return res.status(400).json({ ok: false, reason: verdict.reason });
    }

    const extension = req.file ? imageExtension(req.file.buffer) : null;
    if (req.file && !extension) {
      return res.status(400).json({ ok: false, reason: 'Выбери изображение в формате PNG, JPEG или WebP.' });
    }

    let avatarUrl;
    let user;
    try {
      if (req.file) {
        fs.mkdirSync(avatarsDir, { recursive: true });
        const filename = randomUUID() + extension;
        avatarUrl = AVATAR_PREFIX + filename;
        fs.writeFileSync(path.join(avatarsDir, filename), req.file.buffer, { flag: 'wx' });
      }
      user = authService.updateUserProfile(req.user.id, {
        displayName: rename ? cleanName : undefined,
        avatarUrl
      });
    } catch (error) {
      removeAvatar(avatarsDir, avatarUrl);
      return next(error);
    }

    if (!user) {
      removeAvatar(avatarsDir, avatarUrl);
      return res.status(401).json({ ok: false, reason: 'Войдите в аккаунт RuBin.' });
    }
    if (avatarUrl) removeAvatar(avatarsDir, req.user.avatarUrl);
    return res.json({ ok: true, user });
  });
}

module.exports = { registerProfileRoutes };