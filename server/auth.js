const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_DATA_DIR = path.join(__dirname, 'data');
const DEFAULT_USERS_FILE = path.join(DEFAULT_DATA_DIR, 'users.json');
const DEFAULT_SESSIONS_FILE = path.join(DEFAULT_DATA_DIR, 'sessions.json');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash = '') {
  const [salt, originalHex] = String(storedHash).split(':');
  if (!salt || !originalHex) return false;
  const candidateHex = crypto.scryptSync(String(password), salt, 64).toString('hex');
  const a = Buffer.from(originalHex, 'hex');
  const b = Buffer.from(candidateHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt
  };
}

function buildSeedUsers() {
  const createdAt = '2026-10-20T09:00:00.000Z';
  return [
    {
      id: 1,
      username: 'egor',
      displayName: 'Егор (Team Lead)',
      role: 'moderator',
      passwordHash: hashPassword('RubinMod2026!', 'seed_salt_egor_01'),
      createdAt
    },
    {
      id: 2,
      username: 'lev',
      displayName: 'Лев (Модератор)',
      role: 'moderator',
      passwordHash: hashPassword('RubinMod2026!', 'seed_salt_lev_02'),
      createdAt
    },
    {
      id: 3,
      username: 'elisey',
      displayName: 'Елисей (QA Модератор)',
      role: 'moderator',
      passwordHash: hashPassword('RubinMod2026!', 'seed_salt_elisey_03'),
      createdAt
    },
    {
      id: 4,
      username: 'reader',
      displayName: 'Анна Соколова',
      role: 'user',
      passwordHash: hashPassword('RubinUser2026!', 'seed_salt_reader_04'),
      createdAt
    }
  ];
}

function ensureUsersFile(usersFile = DEFAULT_USERS_FILE) {
  const dir = path.dirname(usersFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify(buildSeedUsers(), null, 2), 'utf8');
  }
}

function readUsers(usersFile = DEFAULT_USERS_FILE) {
  ensureUsersFile(usersFile);
  try {
    const parsed = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users, usersFile = DEFAULT_USERS_FILE) {
  ensureUsersFile(usersFile);
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
}

function readSessions(sessionsFile = DEFAULT_SESSIONS_FILE) {
  const dir = path.dirname(sessionsFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(sessionsFile)) {
    fs.writeFileSync(sessionsFile, JSON.stringify({}, null, 2), 'utf8');
    return {};
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSessions(sessions, sessionsFile = DEFAULT_SESSIONS_FILE) {
  const dir = path.dirname(sessionsFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2), 'utf8');
}

function createSessionToken(userId, sessionsFile = DEFAULT_SESSIONS_FILE) {
  const token = crypto.randomBytes(24).toString('hex');
  const sessions = readSessions(sessionsFile);
  sessions[token] = {
    userId,
    createdAt: new Date().toISOString()
  };
  writeSessions(sessions, sessionsFile);
  return token;
}

function registerUser(
  { username = '', password = '', displayName = '' } = {},
  options = {}
) {
  const usersFile = options.usersFile || DEFAULT_USERS_FILE;
  const sessionsFile = options.sessionsFile || DEFAULT_SESSIONS_FILE;
  const checkText = options.moderateText || null;

  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanDisplayName = String(displayName || cleanUsername).trim();
  const rawPassword = String(password || '');

  if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
    return {
      ok: false,
      reason: 'Логин должен содержать от 3 до 24 символов (латинские буквы, цифры или _).'
    };
  }

  if (rawPassword.length < 6) {
    return {
      ok: false,
      reason: 'Пароль должен содержать не менее 6 символов.'
    };
  }

  if (cleanDisplayName.length < 2 || cleanDisplayName.length > 40) {
    return {
      ok: false,
      reason: 'Имя профиля должно содержать от 2 до 40 символов.'
    };
  }

  if (typeof checkText === 'function') {
    const verdict = checkText({ title: cleanUsername, description: cleanDisplayName });
    if (verdict && verdict.status !== 'approved') {
      return {
        ok: false,
        reason: `Регистрация отклонена фильтром РФ: ${verdict.reason}`
      };
    }
  }

  const users = readUsers(usersFile);
  if (users.some((u) => u.username === cleanUsername)) {
    return {
      ok: false,
      reason: 'Пользователь с таким логином уже зарегистрирован.'
    };
  }

  const nextId = users.length ? Math.max(...users.map((u) => Number(u.id) || 0)) + 1 : 1;
  const newUser = {
    id: nextId,
    username: cleanUsername,
    displayName: cleanDisplayName,
    role: 'user',
    passwordHash: hashPassword(rawPassword),
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeUsers(users, usersFile);

  const token = createSessionToken(newUser.id, sessionsFile);
  return {
    ok: true,
    token,
    user: sanitizeUser(newUser)
  };
}

function loginUser({ username = '', password = '' } = {}, options = {}) {
  const usersFile = options.usersFile || DEFAULT_USERS_FILE;
  const sessionsFile = options.sessionsFile || DEFAULT_SESSIONS_FILE;

  const cleanUsername = String(username || '').trim().toLowerCase();
  const rawPassword = String(password || '');

  const users = readUsers(usersFile);
  const found = users.find((u) => u.username === cleanUsername);
  if (!found || !verifyPassword(rawPassword, found.passwordHash)) {
    return {
      ok: false,
      reason: 'Неверный логин или пароль.'
    };
  }

  const token = createSessionToken(found.id, sessionsFile);
  return {
    ok: true,
    token,
    user: sanitizeUser(found)
  };
}

function getUserByToken(token, options = {}) {
  if (!token) return null;
  const usersFile = options.usersFile || DEFAULT_USERS_FILE;
  const sessionsFile = options.sessionsFile || DEFAULT_SESSIONS_FILE;

  const cleanToken = String(token).replace(/^Bearer\s+/i, '').trim();
  if (!cleanToken) return null;

  const sessions = readSessions(sessionsFile);
  const record = sessions[cleanToken];
  if (!record) return null;

  const users = readUsers(usersFile);
  const found = users.find((u) => u.id === Number(record.userId));
  return sanitizeUser(found);
}

function logoutUser(token, options = {}) {
  if (!token) return false;
  const sessionsFile = options.sessionsFile || DEFAULT_SESSIONS_FILE;
  const cleanToken = String(token).replace(/^Bearer\s+/i, '').trim();
  const sessions = readSessions(sessionsFile);
  if (!sessions[cleanToken]) return false;
  delete sessions[cleanToken];
  writeSessions(sessions, sessionsFile);
  return true;
}

module.exports = {
  hashPassword,
  verifyPassword,
  sanitizeUser,
  registerUser,
  loginUser,
  getUserByToken,
  logoutUser
};