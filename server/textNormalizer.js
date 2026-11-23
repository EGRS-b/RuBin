const RUSSIAN_FUNCTION_WORDS = new Set([
  'а', 'в', 'и', 'к', 'о', 'с', 'у', 'я',
  'во', 'да', 'до', 'же', 'за', 'из', 'ли', 'на', 'не', 'ни', 'но', 'об', 'от', 'по', 'со', 'то'
]);

const LEET_MAP = {
  '0': 'о',
  '3': 'з',
  '4': 'ч',
  '6': 'б',
  '@': 'а',
  '$': 'с'
};

const HOMOGLYPHS = {
  a: 'а',
  c: 'с',
  e: 'е',
  k: 'к',
  m: 'м',
  o: 'о',
  p: 'р',
  t: 'т',
  x: 'х',
  y: 'у'
};

const TRANSLIT_DIGRAPHS = [
  ['shch', 'щ'],
  ['sch', 'щ'],
  ['yo', 'е'],
  ['jo', 'е'],
  ['zh', 'ж'],
  ['kh', 'х'],
  ['ts', 'ц'],
  ['ch', 'ч'],
  ['sh', 'ш'],
  ['yu', 'ю'],
  ['ju', 'ю'],
  ['ya', 'я'],
  ['ja', 'я']
];

const TRANSLIT_SINGLE = {
  a: 'а',
  b: 'б',
  c: 'ц',
  d: 'д',
  e: 'е',
  f: 'ф',
  g: 'г',
  h: 'х',
  i: 'и',
  j: 'й',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  q: 'к',
  r: 'р',
  s: 'с',
  t: 'т',
  u: 'у',
  v: 'в',
  w: 'в',
  x: 'кс',
  y: 'й',
  z: 'з'
};

function toCyrillicLookalikes(word) {
  return String(word || '').replace(/[acekmoptxy]/g, (ch) => HOMOGLYPHS[ch] || ch);
}

function translitToCyrillic(word, { yVowel = 'ы' } = {}) {
  let result = String(word || '').toLowerCase();
  for (const [latinSeq, cyrChar] of TRANSLIT_DIGRAPHS) {
    result = result.split(latinSeq).join(cyrChar);
  }
  result = result.replace(/y(?=[bcdfghjklmnpqrstvwxz])/g, yVowel);
  result = result.replace(/[a-z]/g, (ch) => TRANSLIT_SINGLE[ch] || ch);
  return result;
}

function withSoftSignVariants(cyrWord) {
  const variants = [cyrWord];
  if (cyrWord.endsWith('т') && cyrWord.length >= 4) {
    variants.push(`${cyrWord}ь`);
  }
  if (cyrWord.endsWith('ат') && cyrWord.length >= 4) {
    variants.push(cyrWord.replace(/ат$/, 'ять'));
  }
  if (cyrWord.endsWith('ят') && cyrWord.length >= 4) {
    variants.push(cyrWord.replace(/ят$/, 'ять'));
  }
  return variants;
}

function decodeLeetWhenMixed(word) {
  const str = String(word || '');
  if (!/[а-яa-z]/.test(str) || !/[0346@$]/.test(str)) {
    return str;
  }
  return str.replace(/[0346@$]/g, (ch) => LEET_MAP[ch] || ch);
}

function squeezeRepeatedChars(word) {
  return String(word || '').replace(/([а-яa-z])\1{1,}/g, '$1');
}

function expandWordVariants(word) {
  const clean = String(word || '').trim();
  if (!clean) return [];

  const base = decodeLeetWhenMixed(clean);
  const lookalike = toCyrillicLookalikes(base);
  const translitY = translitToCyrillic(base, { yVowel: 'ы' });
  const translitU = translitToCyrillic(base, { yVowel: 'у' });

  const core = [
    clean,
    base,
    lookalike,
    ...withSoftSignVariants(lookalike),
    ...withSoftSignVariants(translitY),
    ...withSoftSignVariants(translitU),
    translitToCyrillic(base.replace(/x/g, "х"), { yVowel: "ы" }),
    translitToCyrillic(base.replace(/x/g, "х"), { yVowel: "у" })
  ];

  const expanded = [];
  for (const item of core) {
    expanded.push(item);
    expanded.push(squeezeRepeatedChars(item));
  }

  return expanded.filter(Boolean);
}

function buildJoinedFragments(rawWords) {
  const joined = [];
  const n = rawWords.length;

  for (let i = 0; i < n; i += 1) {
    if (rawWords[i].length !== 1) continue;
    let run = rawWords[i];
    let count = 1;
    for (let j = i + 1; j < n && rawWords[j].length === 1 && count < 14; j += 1) {
      run += rawWords[j];
      count += 1;
      if (count >= 3) {
        joined.push(run);
      }
    }
  }

  for (let i = 0; i < n; i += 1) {
    const first = rawWords[i];
    if (first.length > 3 || RUSSIAN_FUNCTION_WORDS.has(first)) continue;

    let acc = first;
    let parts = 1;
    for (let j = i + 1; j < n && parts < 8; j += 1) {
      const next = rawWords[j];
      if (next.length > 3) break;
      if (parts === 1 && next.length >= 2 && RUSSIAN_FUNCTION_WORDS.has(next)) break;
      acc += next;
      parts += 1;
      if (acc.length >= 3 && acc.length <= 16) {
        joined.push(acc);
      }
    }
  }

  return joined;
}

function normalizeAndTokenize(rawText) {
  if (!rawText) return [];

  const lower = String(rawText)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/['`´ʼ]/g, 'ь');

  const collapsedPunct = lower.replace(
    /(?<=[а-яa-z0-9@$])[.\-*+|/\\~^]+(?=[а-яa-z0-9@$])/g,
    ''
  );

  const naturalWords = lower
    .split(/[^а-яa-z0-9@$]+/)
    .filter(Boolean);

  const rawWords = collapsedPunct
    .split(/[^а-яa-z0-9@$]+/)
    .filter(Boolean);

  const joinedWords = buildJoinedFragments(rawWords);
  const allCandidates = [...naturalWords, ...rawWords, ...joinedWords];

  const finalSet = new Set();
  for (const candidate of allCandidates) {
    for (const variant of expandWordVariants(candidate)) {
      finalSet.add(variant);
    }
  }

  return Array.from(finalSet);
}

module.exports = {
  toCyrillicLookalikes,
  translitToCyrillic,
  decodeLeetWhenMixed,
  squeezeRepeatedChars,
  normalizeAndTokenize
};