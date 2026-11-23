const test = require('node:test');
const assert = require('node:assert/strict');
const { moderateContent, checkSearchQuery } = require('../server/moderation');

test('Антиобход РФ: блокирует запрещённые слова и мат с произвольным числом пробелов', () => {
  const spacedCasino = moderateContent({ title: 'Выигрывай в   к  а   з и   н о   сегодня' });
  assert.equal(spacedCasino.status, 'rejected');

  const spacedSwear = moderateContent({
    description: Buffer.from('0LEgICAg0LsgICDRjw==', 'base64').toString('utf8')
  });
  assert.equal(spacedSwear.status, 'rejected');

  const syllableSplit = moderateContent({
    description: Buffer.from('0YHRgyAgINC60LA=', 'base64').toString('utf8')
  });
  assert.equal(syllableSplit.status, 'rejected');
});

test('Антиобход РФ: блокирует полный латинский транслит запрещённых тем и брани', () => {
  assert.equal(moderateContent({ title: 'Online kazino bonus' }).status, 'rejected');
  assert.equal(moderateContent({ title: 'Zakladki narkotiki' }).status, 'rejected');
  assert.equal(moderateContent({ description: 'blyat suka mudak' }).status, 'rejected');
  assert.equal(moderateContent({ description: 'khuy pizdec' }).status, 'rejected');
});

test('Антиобход РФ: блокирует комбинацию транслита, пробелов, регистра и цифр-заменителей', () => {
  assert.equal(moderateContent({ title: 'K   a  Z   i  N  o' }).status, 'rejected');
  assert.equal(moderateContent({ description: 'S   u    K  a' }).status, 'rejected');
  assert.equal(moderateContent({ description: 'B  l   Y  a  T' }).status, 'rejected');
  assert.equal(moderateContent({ description: '4 м о и л0х' }).status, 'rejected');
  assert.equal(checkSearchQuery('p  0  r  n  0').blocked, true);
});

test('Антиобход РФ: не даёт ложных блокировок на обычных русских фразах с предлогами', () => {
  const clean = moderateContent({
    title: 'У окна в саду стоит самовар и чашки с чаем',
    description: 'Поездка к озеру и прогулка в лесу с семьёй на выходных',
    tags: '#семья #дом #уют'
  });
  assert.equal(clean.status, 'approved');
})