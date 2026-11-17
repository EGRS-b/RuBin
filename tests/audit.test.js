const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyAuditCategory,
  recordAuditEvent,
  getAuditLogs
} = require('../server/auditLogger');

function makeTempAuditPath() {
  return path.join(
    os.tmpdir(),
    `rubin-audit-test-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
  );
}

test('Классификатор аудита точно определяет категории угроз РФ без ИИ', () => {
  assert.equal(
    classifyAuditCategory('Обнаружена нецензурная лексика (ФЗ-53)', 'rejected').key,
    'profanity'
  );
  assert.equal(
    classifyAuditCategory('Антиспам RuBin: размещение внешних ссылок запрещено', 'blocked').key,
    'spam_links'
  );
  assert.equal(
    classifyAuditCategory('Пин отправлен на ручную проверку модератору', 'pending').key,
    'grey_list'
  );
  assert.equal(
    classifyAuditCategory('Проверка пройдена успешно', 'approved').key,
    'safe_content'
  );
});

test('Журнал аудита сохраняет события модерации пинов, поиска и комментариев', () => {
  const filePath = makeTempAuditPath();
  try {
    recordAuditEvent(
      {
        source: 'pin',
        action: 'approved',
        target: 'Рецепт домашнего пирога',
        reason: 'Проверка пройдена: контент соответствует правилам.'
      },
      { filePath }
    );
    recordAuditEvent(
      {
        source: 'search',
        action: 'blocked',
        target: 'Запрещённый запрос',
        reason: 'Безопасный поиск RuBin: результаты скрыты.'
      },
      { filePath }
    );

    const logs = getAuditLogs({ filePath });
    assert.equal(logs.length, 2);
    assert.equal(logs[0].source, 'search');
    assert.equal(logs[0].action, 'blocked');
    assert.equal(logs[0].category, 'safe_search');
    assert.equal(logs[1].action, 'approved');
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

test('Журнал аудита поддерживает фильтрацию по типу действия и лимит выдачи', () => {
  const filePath = makeTempAuditPath();
  try {
    recordAuditEvent({ source: 'pin', action: 'approved', target: 'Пин 1', reason: 'Ок' }, { filePath });
    recordAuditEvent({ source: 'comment', action: 'blocked', target: 'Пин 1', reason: 'Ссылок нельзя' }, { filePath });
    recordAuditEvent({ source: 'pin', action: 'flagged', target: 'Пин 2', reason: 'На ручную проверку' }, { filePath });

    const onlyBlocked = getAuditLogs({ action: 'blocked', filePath });
    assert.equal(onlyBlocked.length, 1);
    assert.equal(onlyBlocked[0].category, 'spam_links');

    const limited = getAuditLogs({ limit: 2, filePath });
    assert.equal(limited.length, 2);
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});