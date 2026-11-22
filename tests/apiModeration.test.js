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