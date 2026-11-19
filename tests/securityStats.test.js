const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { recordAuditEvent, getAuditLogs, getAuditSummary } = require('../server/auditLogger');

function makeTempAuditPath() {
  return path.join(
    os.tmpdir(),
    `rubin-stats-test-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
  );
}

test('Сводка безопасности корректно подсчитывает блокировки, антиспам и проверки', () => {
  const filePath = makeTempAuditPath();
  try {
    recordAuditEvent(
      { source: 'comment', action: 'blocked', target: 'Спам', reason: 'Антиспам: внешних ссылок нет' },
      { filePath }
    );
    recordAuditEvent(
      { source: 'pin', action: 'rejected', target: 'Нарушение', reason: 'Незаконные азартные игры (ФЗ-244)' },
      { filePath }
    );
    recordAuditEvent(
      { source: 'pin', action: 'pending', target: 'Форум', reason: 'Общественно-политическая тематика' },
      { filePath }
    );
    recordAuditEvent(
      { source: 'pin', action: 'approved', target: 'Алтай', reason: 'Проверка пройдена' },
      { filePath }
    );

    const summary = getAuditSummary({ filePath });
    assert.equal(summary.totalEvents, 4);
    assert.equal(summary.blockedCount, 2);
    assert.equal(summary.flaggedCount, 1);
    assert.equal(summary.approvedCount, 1);
    assert.equal(summary.spamBlockedCount, 1);
    assert.equal(summary.byCategory.prohibited_substances, 1);
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

test('Журнал аудита автоматически удерживает размер истории в пределах лимита 200 записей', () => {
  const filePath = makeTempAuditPath();
  try {
    for (let i = 1; i <= 205; i += 1) {
      recordAuditEvent(
        { source: 'pin', action: 'approved', target: `Пин #${i}`, reason: 'Проверка пройдена' },
        { filePath }
      );
    }
    const logs = getAuditLogs({ limit: 250, filePath });
    assert.equal(logs.length, 200);
    assert.equal(logs[0].target, 'Пин #205');
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

test('Модуль аудита устойчив к пустым входным параметрам', () => {
  const filePath = makeTempAuditPath();
  try {
    const entry = recordAuditEvent({}, { filePath });
    assert.equal(entry.action, 'approved');
    assert.ok(entry.target.length > 0);
    assert.ok(entry.timestamp);
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});