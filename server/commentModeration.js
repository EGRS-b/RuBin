const spamConfig = require('./spamPatterns.json');
const { moderateContent } = require('./moderation');

function hasSpamLinks(text) {
  const lower = String(text || '').toLowerCase();
  return spamConfig.linkPatterns.some((pattern) => lower.includes(pattern));
}

function moderateComment({ author = '', text = '' } = {}) {
  const cleanText = String(text || '').trim();
  const cleanAuthor = String(author || 'Гость RuBin').trim();

  if (!cleanText) {
    return { allowed: false, reason: 'Введите текст комментария.' };
  }

  if (cleanText.length > spamConfig.maxCommentLength) {
    return {
      allowed: false,
      reason: `Комментарий слишком длинный (максимум ${spamConfig.maxCommentLength} символов).`
    };
  }

  if (hasSpamLinks(cleanText) || hasSpamLinks(cleanAuthor)) {
    return {
      allowed: false,
      reason: 'Антиспам RuBin: размещение внешних ссылок в комментариях запрещено.'
    };
  }

  const verdict = moderateContent({ title: cleanAuthor, description: cleanText });
  if (verdict.status !== 'approved') {
    return {
      allowed: false,
      reason: `Комментарий отклонён модерацией РФ: ${verdict.reason}`
    };
  }

  return { allowed: true, reason: 'Комментарий опубликован.' };
}

function moderateBoardTitle(title = '', description = '') {
  const cleanTitle = String(title || '').trim();
  const cleanDesc = String(description || '').trim();

  if (cleanTitle.length < 2) {
    return { allowed: false, reason: 'Название доски должно содержать минимум 2 символа.' };
  }

  if (cleanTitle.length > spamConfig.maxBoardTitleLength) {
    return {
      allowed: false,
      reason: `Название доски слишком длинное (максимум ${spamConfig.maxBoardTitleLength} символов).`
    };
  }

  if (hasSpamLinks(cleanTitle) || hasSpamLinks(cleanDesc)) {
    return { allowed: false, reason: 'В названии коллекции запрещены внешние ссылки.' };
  }

  const verdict = moderateContent({ title: cleanTitle, description: cleanDesc });
  if (verdict.status !== 'approved') {
    return {
      allowed: false,
      reason: `Название коллекции отклонено фильтром РФ: ${verdict.reason}`
    };
  }

  return { allowed: true, reason: 'Коллекция успешно создана.' };
}

module.exports = { moderateComment, moderateBoardTitle };