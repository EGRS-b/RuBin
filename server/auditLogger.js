const fs = require('fs');
const path = require('path');
const auditConfig = require('./auditCategories.json');

const DEFAULT_DATA_DIR = path.join(__dirname, 'data');
const DEFAULT_AUDIT_FILE = path.join(DEFAULT_DATA_DIR, 'auditLog.json');

const INITIAL_AUDIT_LOGS = [
  {
    id: 4,
    timestamp: '2026-10-29T14:20:00.000Z',
    source: 'comment',
    action: 'blocked',
    category: 'spam_links',
    categoryLabel: 'Спам и внешние ссылки',
    target: 'Пин #1 (автор: Бот)',
    reason: 'Антиспам RuBin: размещение внешних ссылок в комментариях запрещено.'
  },
  {
    id: 3,
    timestamp: '2026-10-29T12:05:00.000Z',
    source: 'search',
    action: 'blocked',
    category: 'safe_search',
    categoryLabel: 'Безопасный поиск РФ',
    target: 'Поисковый запрос скрыт',
    reason: 'Безопасный поиск RuBin: результаты по данному запросу скрыты в соответствии с законодательством РФ.'
  },
  {
    id: 2,
    timestamp: '2026-10-28T11:00:00.000Z',
    source: 'pin',
    action: 'flagged',
    category: 'grey_list',
    categoryLabel: 'Серый список (ручная проверка)',
    target: 'Городской форум: молодёжная политика и волонтёрство',
    reason: 'Пин отправлен на ручную проверку модератору (Общественно-политическая тематика).'
  },
  {
    id: 1,
    timestamp: '2026-10-27T18:45:00.000Z',
    source: 'pin',
    action: 'approved',
    category: 'safe_content',
    categoryLabel: 'Разрешённый контент',
    target: 'Чаепитие на дачной веранде с самоваром',
    reason: 'Проверка пройдена: контент соответствует правилам платформы RuBin и законодательству РФ.'
  }
];

function normalizeAction(action) {
  if (action === 'blocked' || action === 'rejected') return 'blocked';
  if (action === 'flagged' || action === 'pending') return 'flagged';
  return 'approved';
}

function classifyAuditCategory(reason = '', action = 'approved') {
  const normalizedAction = normalizeAction(action);
  const lowerReason = String(reason || '').toLowerCase().replace(/ё/g, 'е');

  for (const rule of auditConfig.rules) {
    const hit = rule.markers.some((marker) =>
      lowerReason.includes(marker.toLowerCase().replace(/ё/g, 'е'))
    );
    if (hit) {
      return { key: rule.key, label: rule.label };
    }
  }

  return auditConfig.defaults[normalizedAction] || auditConfig.defaults.approved;
}

function ensureAuditFile(filePath = DEFAULT_AUDIT_FILE) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    const seed = filePath === DEFAULT_AUDIT_FILE ? INITIAL_AUDIT_LOGS : [];
    fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), 'utf8');
  }
}

function readAuditFile(filePath = DEFAULT_AUDIT_FILE) {
  ensureAuditFile(filePath);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAuditFile(entries, filePath = DEFAULT_AUDIT_FILE) {
  ensureAuditFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), 'utf8');
}

function recordAuditEvent(
  { source = 'pin', action = 'approved', target = '', reason = '' } = {},
  options = {}
) {
  const filePath = options.filePath || DEFAULT_AUDIT_FILE;
  const entries = readAuditFile(filePath);
  const normalizedAction = normalizeAction(action);
  const classified = classifyAuditCategory(reason, normalizedAction);
  const nextId = entries.length ? Math.max(...entries.map((e) => Number(e.id) || 0)) + 1 : 1;

  const entry = {
    id: nextId,
    timestamp: new Date().toISOString(),
    source: String(source || 'system').trim() || 'system',
    action: normalizedAction,
    category: classified.key,
    categoryLabel: classified.label,
    target: String(target || 'Объект проверки').trim().slice(0, 120),
    reason: String(reason || 'Событие зафиксировано системой аудита RuBin.').trim()
  };

  const maxEntries = Number(auditConfig.maxEntries) || 200;
  const updated = [entry, ...entries].slice(0, maxEntries);
  writeAuditFile(updated, filePath);
  return entry;
}

function getAuditLogs({ limit = 30, action = '', filePath = DEFAULT_AUDIT_FILE } = {}) {
  let entries = readAuditFile(filePath);
  if (action && ['blocked', 'flagged', 'approved'].includes(action)) {
    entries = entries.filter((item) => item.action === action);
  }
  const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 200));
  return entries.slice(0, safeLimit);
}

function getAuditSummary({ filePath = DEFAULT_AUDIT_FILE } = {}) {
  const entries = readAuditFile(filePath);
  const byCategory = {};
  let blockedCount = 0;
  let flaggedCount = 0;
  let approvedCount = 0;
  let spamBlockedCount = 0;

  for (const item of entries) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    if (item.action === 'blocked') blockedCount += 1;
    else if (item.action === 'flagged') flaggedCount += 1;
    else approvedCount += 1;

    if (item.category === 'spam_links') {
      spamBlockedCount += 1;
    }
  }

  return {
    totalEvents: entries.length,
    blockedCount,
    flaggedCount,
    approvedCount,
    spamBlockedCount,
    byCategory
  };
}

module.exports = {
  classifyAuditCategory,
  recordAuditEvent,
  getAuditLogs,
  getAuditSummary
};