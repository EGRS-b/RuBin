// Словарь нецензурной лексики и грубых оскорблений хранится в Base64,
// чтобы исходный код репозитория оставался этичным при демонстрации 

const EXACT_B64 =
  'WyLRhdGD0LkiLCLRhdGD0LgiLCLQsdC70Y8iLCLQsdC70Y/RgtGMIiwi0YHRg9C60LAiLCLRgdGD0LrQuCIsItGH0LzQviIsItC70L7RhSIsImZ1Y2siLCJzaGl0IiwicG9ybiIsIm5zZnciLCJ4eHgiXQ==';

const PREFIX_B64 =
  'WyLRhdGD0LUiLCLRhdGD0Y8iLCLQvtGF0YPQtSIsItCw0YXRg9C1Iiwi0L3QsNGF0YPQuSIsItC/0L7RhdGD0LkiLCLQv9C40LfQtCIsItGB0L/QuNC30LQiLCLRgNCw0YHQv9C40LfQtCIsItCx0LvRj9C0Iiwi0LLRi9Cx0LvRj9C0Iiwi0LXQsdCwIiwi0LXQsdC7Iiwi0LXQsdGD0YciLCLQtdCx0L3RgyIsItC30LDQtdCxIiwi0LLRi9C10LEiLCLQvdCw0LXQsSIsItGD0LXQsSIsItC00L7Qu9Cx0L7QtdCxIiwi0L/RgNC+0LXQsSIsItC80YPQtNCw0LoiLCLQvNGD0LTQuNC7Iiwi0LzRg9C00L4iLCLQv9C40LTQvtGAIiwi0L/QuNC00LDRgCIsItC/0LXQtNC40LoiLCLRiNC70Y7RhSIsItGI0LDQu9Cw0LIiLCLQv9GA0L7RgdGC0LjRgtGD0YIiLCLQs9C+0LLQvSIsItC00LXRgNGM0LwiLCLRg9Cx0LvRjtC0Iiwi0LzRgNCw0LfRjCIsItC80YDQsNC30LgiLCLQs9C90LjQtNCwIiwiYml0Y2giLCJmdWNraW4iXQ==';

const EXACT_PROFANITY = JSON.parse(Buffer.from(EXACT_B64, 'base64').toString('utf8'));
const PREFIX_PROFANITY = JSON.parse(Buffer.from(PREFIX_B64, 'base64').toString('utf8'));

function hasProfanity(tokens) {
  for (const token of tokens) {
    if (EXACT_PROFANITY.includes(token)) {
      return token;
    }
    for (const stem of PREFIX_PROFANITY) {
      if (token.startsWith(stem)) {
        return stem;
      }
    }
  }
  return null;
}

module.exports = { hasProfanity };
