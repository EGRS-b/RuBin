const dictionary = require('./moderationDictionary.json');
const { hasProfanity } = require('./profanityList');

const HOMOGLYPHS = {
  a: 'а', c: 'с', e: 'е', k: 'к', m: 'м',
  o: 'о', p: 'р', t: 'т', x: 'х', y: 'у'
};

function toCyrillicLookalikes(str) {
  return str.replace(/[acekmoptxy]/g, (ch) => HOMOGLYPHS[ch] || ch);
}

function extractTokens(rawText) {
  if (!rawText) return [];

  const lower = String(rawText).toLowerCase().replace(/ё/g, 'е');
  const collapsed = lower.replace(/(?<=[а-яa-z0-9])[.\-*+|/\\]+(?=[а-яa-z0-9])/g, '');
  const rawTokens = collapsed.split(/[^а-яa-z0-9]+/).filter(Boolean);

  const tokens = [...rawTokens];
  let buffer = '';
  for (const t of rawTokens) {
    if (t.length === 1) {
      buffer += t;
    } else {
      if (buffer.length >= 3) tokens.push(buffer);
      buffer = '';
    }
  }
  if (buffer.length >= 3) tokens.push(buffer);

  const cyrTokens = tokens.map(toCyrillicLookalikes);
  return Array.from(new Set([...tokens, ...cyrTokens]));
}

function matchesRule(tokens, ruleWord) {
  return tokens.some((token) => {
    if (ruleWord.length <= 5) {
      return token === ruleWord;
    }
    return token.startsWith(ruleWord);
  });
}

function moderateContent({ title = '', description = '', tags = '', fileName = '' } = {}) {
  const combined = [title, description, tags, fileName].join(' ');
  const tokens = extractTokens(combined);

  const profanityMatch = hasProfanity(tokens);
  if (profanityMatch) {
    return {
      status: 'rejected',
      matchedWord: profanityMatch,
      reason: 'Публикация отклонена: обнаружена нецензурная лексика или оскорбления (ФЗ-53 «О государственном языке РФ»).'
    };
  }

  for (const item of dictionary.blocked) {
    if (matchesRule(tokens, item.word)) {
      return {
        status: 'rejected',
        matchedWord: item.word,
        reason: `Публикация отклонена: обнаружен запрещенный контент (${item.category}).`
      };
    }
  }

  for (const item of dictionary.review) {
    if (matchesRule(tokens, item.word)) {
      return {
        status: 'pending',
        matchedWord: item.word,
        reason: `Пин отправлен на ручную проверку модератору (${item.category}).`
      };
    }
  }

  return {
    status: 'approved',
    matchedWord: null,
    reason: 'Проверка пройдена: контент соответствует правилам платформы RuBin и законодательству РФ.'
  };
}

function checkSearchQuery(query = '') {
  if (!String(query).trim()) {
    return { blocked: false, reason: null };
  }
  const verdict = moderateContent({ title: query });
  if (verdict.status === 'rejected') {
    return {
      blocked: true,
      reason: 'Безопасный поиск RuBin: результаты по данному запросу скрыты в соответствии с законодательством РФ.'
    };
  }
  return { blocked: false, reason: null };
}

module.exports = { moderateContent, extractTokens, checkSearchQuery };
