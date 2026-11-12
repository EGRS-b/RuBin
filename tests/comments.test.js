const test = require('node:test');
const assert = require('node:assert/strict');
const { moderateComment } = require('../server/commentModeration');

test('Пропускает доброжелательные комментарии пользователей', () => {
  const res = moderateComment({
    author: 'Мария',
    text: 'Какой чудесный рецепт блинов! Обязательно приготовим в воскресенье с семьёй.'
  });
  assert.equal(res.allowed, true);
});

test('Блокирует внешние спам-ссылки в комментариях', () => {
  assert.equal(moderateComment({ author: 'Бот', text: 'Переходи на https://spam-site.com/win' }).allowed, false);
  assert.equal(moderateComment({ author: 'Канал', text: 'Подпишись t.me/bonus777' }).allowed, false);
});

test('Блокирует нецензурную лексику и запрещённые темы в обсуждениях', () => {
  const swear = Buffer.from('0L8u0Lgu0Lcu0LQu0LUu0YY=', 'base64').toString('utf8');
  assert.equal(moderateComment({ author: 'Гость', text: `Это полный ${swear}` }).allowed, false);
  assert.equal(moderateComment({ author: 'Игрок', text: 'Лучшее онлайн казино тут' }).allowed, false);
});

test('Отклоняет пустые и слишком длинные комментарии', () => {
  assert.equal(moderateComment({ author: 'Анна', text: '   ' }).allowed, false);
  assert.equal(moderateComment({ author: 'Анна', text: 'а'.repeat(350) }).allowed, false);
});