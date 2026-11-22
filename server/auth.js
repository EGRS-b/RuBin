const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_DATA_DIR = path.join(__dirname, 'data');
const DEFAULT_USERS_FILE = path.join(DEFAULT_DATA_DIR, 'users.json');

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

module.exports = {
  hashPassword,
  verifyPassword,
  sanitizeUser,
  readUsers
};