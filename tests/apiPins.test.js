const test = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('./helpers/testServer');

test('GET /api/pins возвращает ленту пинов и корректно применяет режимы сортировки', async () => {
  const ctx = await startTestServer();
  try {
    const newest = await ctx.requestJson('/api/pins?sort=newest');
    assert.equal(newest.status, 200);
    assert.equal(newest.data.safeSearchBlocked, false);
    assert.equal(newest.data.sort, 'newest');
    assert.ok(Array.isArray(newest.data.pins));
    assert.ok(newest.data.pins.length >= 8);

    const popular = await ctx.requestJson('/api/pins?sort=popular');
    assert.equal(popular.status, 200);
    assert.equal(popular.data.sort, 'popular');
    assert.ok(popular.data.pins[0].likes >= popular.data.pins[1].likes);

    const discussed = await ctx.requestJson('/api/pins?sort=discussed');
    assert.equal(discussed.status, 200);
    assert.equal(discussed.data.sort, 'discussed');
    assert.ok(discussed.data.pins[0].comments.length >= discussed.data.pins[discussed.data.pins.length - 1].comments.length);
  } finally {
    await ctx.close();
  }
});

test('POST /api/pins публикует доброжелательный пин и поддерживает лайки (201 и 200)', async () => {
  const ctx = await startTestServer();
  try {
    const created = await ctx.requestJson('/api/pins', {
      method: 'POST',
      body: {
        title: 'Вечернее чаепитие у камина в зимнем доме',
        description: 'Тёплый семейный вечер с домашним яблочным пирогом.',
        topic: 'Семья и традиции',
        tags: '#семья #уют #зима',
        author: 'Тест RuBin',
        imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600'
      }
    });

    assert.equal(created.status, 201);
    assert.equal(created.data.ok, true);
    assert.equal(created.data.status, 'approved');
    assert.ok(created.data.pin.id >= 10);

    const liked = await ctx.requestJson(`/api/pins/${created.data.pin.id}/like`, { method: 'POST' });
    assert.equal(liked.status, 200);
    assert.equal(liked.data.likes, 1);

    const missing = await ctx.requestJson('/api/pins/99999/like', { method: 'POST' });
    assert.equal(missing.status, 404);
  } finally {
    await ctx.close();
  }
});

test('Маршруты коллекций /api/boards создают новую доску и сохраняют пин', async () => {
  const ctx = await startTestServer();
  try {
    const initial = await ctx.requestJson('/api/boards');
    assert.equal(initial.status, 200);
    assert.ok(initial.data.boards.length >= 3);

    const createdBoard = await ctx.requestJson('/api/boards', {
      method: 'POST',
      body: {
        title: 'Зимние пейзажи Урала',
        description: 'Подборка снежных вершин и хвойных троп'
      }
    });
    assert.equal(createdBoard.status, 201);
    assert.equal(createdBoard.data.ok, true);

    const toggled = await ctx.requestJson(`/api/boards/${createdBoard.data.board.id}/pins`, {
      method: 'POST',
      body: { pinId: 1 }
    });
    assert.equal(toggled.status, 200);
    assert.equal(toggled.data.added, true);
    assert.ok(toggled.data.board.pinIds.includes(1));
  } finally {
    await ctx.close();
  }
});

test('Маршруты комментариев /api/pins/:id/comments добавляют и возвращают добрый отзыв', async () => {
  const ctx = await startTestServer();
  try {
    const added = await ctx.requestJson('/api/pins/1/comments', {
      method: 'POST',
      body: {
        author: 'Елисей',
        text: 'Потрясающая фотография прозрачного льда Байкала!'
      }
    });
    assert.equal(added.status, 201);
    assert.equal(added.data.ok, true);

    const list = await ctx.requestJson('/api/pins/1/comments');
    assert.equal(list.status, 200);
    assert.ok(list.data.comments.some((c) => c.text.includes('прозрачного льда Байкала')));
  } finally {
    await ctx.close();
  }
});