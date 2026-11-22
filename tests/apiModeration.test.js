const test = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('./helpers/testServer');

test('Безопасный поиск API блокирует запрещённые запросы и фиксирует событие в аудите', async () => {
  const ctx = await startTestServer();
  try {
    const blockedSearch = await ctx.requestJson(
      `/api/pins?q=${encodeURIComponent('онлайн к.а.з.и.н.о бонус')}`
    );
    assert.equal(blockedSearch.status, 200);
    assert.equal(blockedSearch.data.safeSearchBlocked, true);
    assert.equal(blockedSearch.data.pins.length, 0);
    assert.ok(blockedSearch.data.reason.length > 0);

    const audit = await ctx.requestJson('/api/moderation/audit?action=blocked&limit=5');
    assert.equal(audit.status, 200);
    assert.ok(audit.data.logs.some((entry) => entry.source === 'search'));
  } finally {
    await ctx.close();
  }
});

test('API отклоняет запрещённые пины, спам-комментарии и нежелательные названия досок (HTTP 400)', async () => {
  const ctx = await startTestServer();
  try {
    const badPin = await ctx.requestJson('/api/pins', {
      method: 'POST',
      body: {
        title: 'Быстрые ставки и казино вулкан',
        description: 'Переходи за выигрышем',
        imageUrl: 'https://example.com/pic.jpg'
      }
    });
    assert.equal(badPin.status, 400);
    assert.equal(badPin.data.status, 'rejected');

    const spamComment = await ctx.requestJson('/api/pins/1/comments', {
      method: 'POST',
      body: {
        author: 'Спамер',
        text: 'Заходи на наш канал https://spam-link.example/bonus'
      }
    });
    assert.equal(spamComment.status, 400);
    assert.equal(spamComment.data.ok, false);

    const badBoard = await ctx.requestJson('/api/boards', {
      method: 'POST',
      body: {
        title: 'Ссылки https://bad.example',
        description: 'Рекламная подборка'
      }
    });
    assert.equal(badBoard.status, 400);
    assert.equal(badBoard.data.ok, false);
  } finally {
    await ctx.close();
  }
});

test('Жалобы пользователей переводят карточку в очередь ручной проверки (POST /api/pins/:id/report)', async () => {
  const ctx = await startTestServer();
  try {
    const reportRes = await ctx.requestJson('/api/pins/2/report', {
      method: 'POST',
      body: { reason: 'Подозрение на спам в описании' }
    });
    assert.equal(reportRes.status, 200);
    assert.equal(reportRes.data.ok, true);
    assert.equal(reportRes.data.pin.status, 'pending');
    assert.equal(reportRes.data.pin.reports, 1);

    const checkLive = await ctx.requestJson('/api/moderate-check', {
      method: 'POST',
      body: { title: 'Тёплый семейный ужин', description: 'Рецепт пирога с яблоками' }
    });
    assert.equal(checkLive.status, 200);
    assert.equal(checkLive.data.status, 'approved');
  } finally {
    await ctx.close();
  }
});

test('Очередь модератора и сводка угроз /api/moderation/stats отражают ручные решения', async () => {
  const ctx = await startTestServer();
  try {
    const pendingBefore = await ctx.requestJson('/api/moderation/pending');
    assert.equal(pendingBefore.status, 200);
    assert.ok(pendingBefore.data.count >= 1);
    const targetId = pendingBefore.data.pins[0].id;

    const decision = await ctx.requestJson(`/api/moderation/${targetId}/decision`, {
      method: 'POST',
      body: { decision: 'approved' }
    });
    assert.equal(decision.status, 200);
    assert.equal(decision.data.status, 'approved');

    const stats = await ctx.requestJson('/api/moderation/stats');
    assert.equal(stats.status, 200);
    assert.equal(stats.data.ok, true);
    assert.ok(stats.data.stats.totalEvents >= 1);
    assert.ok(stats.data.stats.approvedPins >= 9);
  } finally {
    await ctx.close();
  }
});

test('Диагностический маршрут GET /api/health подтверждает готовность сервиса RuBin', async () => {
  const ctx = await startTestServer();
  try {
    const health = await ctx.requestJson('/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.data.status, 'ok');
    assert.equal(health.data.service, 'RuBin API');
    assert.ok(Boolean(health.data.timestamp));
  } finally {
    await ctx.close();
  }
});