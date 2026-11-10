const test = require('node:test');
const assert = require('node:assert/strict');
const { moderateBoardTitle } = require('../server/commentModeration');

test('Разрешает корректные названия коллекций вдохновения', () => {
  assert.equal(moderateBoardTitle('Уютная дача и сад', 'Идеи для лета').allowed, true);
  assert.equal(moderateBoardTitle('Семейные рецепты').allowed, true);
});

test('Блокирует запрещённые слова и ссылки в названиях досок', () => {
  assert.equal(moderateBoardTitle('Ставки и к.а.з.и.н.о').allowed, false);
  assert.equal(moderateBoardTitle('Доска https://site.ru/promo').allowed, false);
  assert.equal(moderateBoardTitle('Я').allowed, false);
});