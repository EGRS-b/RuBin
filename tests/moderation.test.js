const test = require('node:test');
const assert = require('node:assert/strict');
const { moderateContent } = require('../server/moderation');

test('Пропускает доброжелательный семейный и творческий контент (approved)', () => {
  const res = moderateContent({
    title: 'Семейный ужин на даче и деревянная скамейка',
    description: 'Рецепт домашнего пирога и уютный вечер с детьми',
    tags: '#семья #уют #рецепты #спорт',
    fileName: 'family_dinner.jpg'
  });
  assert.equal(res.status, 'approved');
});

test('Блокирует запрещённые ключевые слова из стоп-листа (rejected)', () => {
  const res = moderateContent({
    title: 'Быстрый заработок и онлайн казино',
    description: 'Переходи по ссылке',
    fileName: 'banner.png'
  });
  assert.equal(res.status, 'rejected');
});

test('Защищает от обхода фильтра через точки, дефисы и регистр (к.а.з.и.н.о)', () => {
  const res = moderateContent({
    title: 'Выигрывай в К.А.З.И.Н.О прямо сейчас',
    description: 'Бонус всем',
    fileName: 'win.jpg'
  });
  assert.equal(res.status, 'rejected');
});

test('Проверяет название загружаемого файла изображения', () => {
  const res = moderateContent({
    title: 'Красивая картинка',
    description: 'Без описания',
    fileName: 'reklama_казино_777.jpg'
  });
  assert.equal(res.status, 'rejected');
});

test('Отправляет спорные темы из серого списка на ручную модерацию (pending)', () => {
  const res = moderateContent({
    title: 'Горячая политика и обсуждения недели',
    description: 'Обсуждаем новости',
    fileName: 'news.jpg'
  });
  assert.equal(res.status, 'pending');
});