const test = require('node:test');
const assert = require('node:assert/strict');
const { checkSearchQuery } = require('../server/moderation');

test('Безопасный поиск пропускает обычные запросы пользователей', () => {
  assert.equal(checkSearchQuery('рецепт блинов').blocked, false);
  assert.equal(checkSearchQuery('озеро Байкал зимой').blocked, false);
  assert.equal(checkSearchQuery('').blocked, false);
});

test('Безопасный поиск блокирует запрещённые темы и уловки со знаками', () => {
  assert.equal(checkSearchQuery('онлайн к.а.з.и.н.о').blocked, true);
  assert.equal(checkSearchQuery('закладки наркотики').blocked, true);
});

test('Безопасный поиск блокирует нецензурную лексику', () => {
  const sample = Buffer.from('0L8u0Lgu0Lcu0LQu0LUu0YY=', 'base64').toString('utf8');
  assert.equal(checkSearchQuery(sample).blocked, true);
});
