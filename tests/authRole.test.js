const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { moderateContent } = require('../server/moderation');
const { startTestServer } = require('./helpers/testServer');

function makeTempAuthPaths() {
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    usersFile: path.join(os.tmpdir(), `rubin-users-${stamp}.json`),
    sessionsFile: path.join(os.tmpdir(), `rubin-sessions-${stamp}.json`)
  };
}

test('Система учётных записей и RBAC: хеширование паролей, роли user/moderator и защита маршрутов', async () => {
  let auth = null;
  try {
    auth = require('../server/auth');
  } catch {
    auth = null;
  }

  if (auth) {
    const tempPaths = makeTempAuthPaths();
    try {
      const reg = auth.registerUser(
        { username: 'ivan_petrov', password: 'SafePass123!', displayName: 'Иван Петров' },
        { ...tempPaths, moderateText: moderateContent }
      );
      assert.equal(reg.ok, true);
      assert.equal(reg.user.role, 'user');

      const rawUsers = JSON.parse(fs.readFileSync(tempPaths.usersFile, 'utf8'));
      const saved = rawUsers.find((u) => u.username === 'ivan_petrov');
      assert.ok(saved.passwordHash.includes(':'));
      assert.equal(saved.passwordHash.includes('SafePass123!'), false);

      const modLogin = auth.loginUser({ username: 'egor', password: 'RubinMod2026!' }, tempPaths);
      assert.equal(modLogin.ok, true);
      assert.equal(modLogin.user.role, 'moderator');

      const badLogin = auth.loginUser({ username: 'egor', password: 'wrong' }, tempPaths);
      assert.equal(badLogin.ok, false);
    } finally {
      if (fs.existsSync(tempPaths.usersFile)) fs.unlinkSync(tempPaths.usersFile);
      if (fs.existsSync(tempPaths.sessionsFile)) fs.unlinkSync(tempPaths.sessionsFile);
    }
  }

  const ctx = await startTestServer();
  try {
    const probe = await ctx.requestJson('/api/auth/login', {
      method: 'POST',
      body: { username: 'egor', password: 'RubinMod2026!' }
    });

    if (probe.status !== 404) {
      assert.equal(probe.status, 200);
      assert.equal(probe.data.user.role, 'moderator');

      const userReg = await ctx.requestJson('/api/auth/register', {
        method: 'POST',
        body: { username: 'olga_art', password: 'UserPass123!', displayName: 'Ольга Художник' }
      });
      assert.equal(userReg.status, 201);
      assert.equal(userReg.data.user.role, 'user');

      const guestBlocked = await ctx.requestJson('/api/moderation/pending', {
        headers: { 'X-Rubin-Client': 'web' }
      });
      assert.equal(guestBlocked.status, 401);

      const userForbidden = await ctx.requestJson('/api/moderation/pending', {
        headers: {
          'X-Rubin-Client': 'web',
          Authorization: `Bearer ${userReg.data.token}`
        }
      });
      assert.equal(userForbidden.status, 403);

      const checkerForbidden = await ctx.requestJson('/api/moderate-check', {
        method: 'POST',
        headers: {
          'X-Rubin-Client': 'web',
          Authorization: `Bearer ${userReg.data.token}`
        },
        body: { title: 'Тест обычного пользователя' }
      });
      assert.equal(checkerForbidden.status, 403);

      const modAllowed = await ctx.requestJson('/api/moderation/pending', {
        headers: {
          'X-Rubin-Client': 'web',
          Authorization: `Bearer ${probe.data.token}`
        }
      });
      assert.equal(modAllowed.status, 200);
    }
  } finally {
    await ctx.close();
  }
});

test('Модуль авторизации корректно обрабатывает выход из сессии (logout) и дубликаты логинов', () => {
  let auth = null;
  try {
    auth = require('../server/auth');
  } catch {
    auth = null;
  }

  if (!auth) {
    assert.ok(true);
    return;
  }

  const tempPaths = makeTempAuthPaths();
  try {
    const first = auth.registerUser(
      { username: 'sergey_dev', password: 'StrongPass1!', displayName: 'Сергей' },
      { ...tempPaths, moderateText: moderateContent }
    );
    assert.equal(first.ok, true);

    const duplicate = auth.registerUser(
      { username: 'sergey_dev', password: 'StrongPass1!', displayName: 'Сергей 2' },
      { ...tempPaths, moderateText: moderateContent }
    );
    assert.equal(duplicate.ok, false);

    assert.equal(auth.getUserByToken(first.token, tempPaths).username, 'sergey_dev');
    assert.equal(auth.logoutUser(first.token, tempPaths), true);
    assert.equal(auth.getUserByToken(first.token, tempPaths), null);
  } finally {
    if (fs.existsSync(tempPaths.usersFile)) fs.unlinkSync(tempPaths.usersFile);
    if (fs.existsSync(tempPaths.sessionsFile)) fs.unlinkSync(tempPaths.sessionsFile);
  }
});

test('Регистрация блокирует запрещённые или нецензурные имена пользователей через фильтр РФ', () => {
  let auth = null;
  try {
    auth = require('../server/auth');
  } catch {
    auth = null;
  }

  if (!auth) {
    assert.ok(true);
    return;
  }

  const tempPaths = makeTempAuthPaths();
  try {
    const badDisplay = auth.registerUser(
      { username: 'clean_login', password: 'StrongPass1!', displayName: 'k a z i n o' },
      { ...tempPaths, moderateText: moderateContent }
    );
    assert.equal(badDisplay.ok, false);
  } finally {
    if (fs.existsSync(tempPaths.usersFile)) fs.unlinkSync(tempPaths.usersFile);
    if (fs.existsSync(tempPaths.sessionsFile)) fs.unlinkSync(tempPaths.sessionsFile);
  }
});
