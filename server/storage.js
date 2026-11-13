const fs = require('fs');
const path = require('path');
const { SORT_MODES, sortPins } = require('./pinSorter');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'pins.json');

const TOPICS = [
  'Семья и традиции',
  'Природа России',
  'Кулинария',
  'Уют и дом',
  'Архитектура',
  'Творчество'
];

const INITIAL_PINS = [
  {
    id: 1,
    title: 'Прозрачный лёд зимнего Байкала на закате',
    description: 'Удивительные узоры замёрзшего озера и чистейший сибирский воздух.',
    topic: 'Природа России',
    tags: '#байкал #сибирь #россия #зима',
    author: 'Алексей Морозов',
    imageUrl: 'https://images.unsplash.com/photo-1548705085-101177834f47?auto=format&fit=crop&w=600&h=800&q=80',
    status: 'approved',
    likes: 28,
    reports: 0,
    moderationNote: '',
    comments: [
      { id: 1, author: 'Наталья', text: 'Мечтаю увидеть зимний Байкал своими глазами!', createdAt: '2026-10-21T09:15:00.000Z' }
    ],
    createdAt: '2026-10-20T10:00:00.000Z'
  },
  {
    id: 2,
    title: 'Домашние кружевные блины с мёдом и ягодами',
    description: 'Бабушкин рецепт тонких блинов на молоке для тёплого воскресного завтрака всей семьёй.',
    topic: 'Кулинария',
    tags: '#рецепты #блины #масленица #завтрак',
    author: 'Мария Соколова',
    imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&h=520&q=80',
    status: 'approved',
    likes: 19,
    reports: 0,
    moderationNote: '',
    comments: [
      { id: 1, author: 'Ирина', text: 'Готовила по похожему рецепту на выходных — дети в восторге!', createdAt: '2026-10-22T11:00:00.000Z' }
    ],
    createdAt: '2026-10-21T12:30:00.000Z'
  },
  {
    id: 3,
    title: 'Семейная осенняя прогулка в золотом парке',
    description: 'Идеи для тёплой семейной фотосессии в октябре: плед, термос с облепиховым чаем и улыбки.',
    topic: 'Семья и традиции',
    tags: '#семья #осень #дети #традиции',
    author: 'Екатерина Волкова',
    imageUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=600&h=760&q=80',
    status: 'approved',
    likes: 34,
    reports: 0,
    moderationNote: '',
    comments: [],
    createdAt: '2026-10-22T15:10:00.000Z'
  },
  {
    id: 4,
    title: 'Уютный уголок для чтения у окна',
    description: 'Деревянные полки, мягкий тёплый свет торшера и льняной текстиль в светлой гостиной.',
    topic: 'Уют и дом',
    tags: '#интерьер #уют #дом #книги',
    author: 'Илья Демидов',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&h=480&q=80',
    status: 'approved',
    likes: 15,
    reports: 0,
    moderationNote: '',
    comments: [],
    createdAt: '2026-10-23T09:40:00.000Z'
  },
  {
    id: 5,
    title: 'Резные деревянные наличники старого Суздаля',
    description: 'Вдохновение русским деревянным зодчеством и тонкой ручной резьбой.',
    topic: 'Архитектура',
    tags: '#суздаль #архитектура #зодчество #история',
    author: 'Дмитрий Орлов',
    imageUrl: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=600&h=780&q=80',
    status: 'approved',
    likes: 22,
    reports: 0,
    moderationNote: '',
    comments: [],
    createdAt: '2026-10-24T14:20:00.000Z'
  },
  {
    id: 6,
    title: 'Керамика ручной работы на гончарном круге',
    description: 'Глиняные кружки и тарелки с природной глазурью — мастерская выходного дня.',
    topic: 'Творчество',
    tags: '#керамика #ремесло #творчество #ручнаяработа',
    author: 'Анна Лебедева',
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&h=640&q=80',
    status: 'approved',
    likes: 17,
    reports: 0,
    moderationNote: '',
    comments: [],
    createdAt: '2026-10-25T17:00:00.000Z'
  },
  {
    id: 7,
    title: 'Туманное утро в горах Алтая',
    description: 'Бирюзовая Катунь и хвойные леса — маршрут для летнего семейного путешествия по России.',
    topic: 'Природа России',
    tags: '#алтай #горы #путешествия #природа',
    author: 'Сергей Климов',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&h=500&q=80',
    status: 'approved',
    likes: 31,
    reports: 0,
    moderationNote: '',
    comments: [],
    createdAt: '2026-10-26T08:15:00.000Z'
  },
  {
    id: 8,
    title: 'Чаепитие на дачной веранде с самоваром',
    description: 'Душистый иван-чай, яблочный пирог и вечерние разговоры с близкими.',
    topic: 'Семья и традиции',
    tags: '#дача #чаепитие #семейныйуют #традиции',
    author: 'Ольга Белова',
    imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&h=720&q=80',
    status: 'approved',
    likes: 25,
    reports: 0,
    moderationNote: '',
    comments: [],
    createdAt: '2026-10-27T18:45:00.000Z'
  },
  {
    id: 9,
    title: 'Городской форум: молодёжная политика и волонтёрство',
    description: 'Фоторепортаж со студенческой встречи о городских инициативах.',
    topic: 'Семья и традиции',
    tags: '#форум #молодежь #волонтеры',
    author: 'Павел Громов',
    imageUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=600&h=460&q=80',
    status: 'pending',
    likes: 0,
    reports: 0,
    moderationNote: 'Автофильтр (серый список): Общественно-политическая тематика',
    comments: [],
    createdAt: '2026-10-28T11:00:00.000Z'
  }
];

function normalizePin(pin) {
  return {
    ...pin,
    likes: typeof pin.likes === 'number' ? pin.likes : (pin.id * 3 + 7),
    reports: typeof pin.reports === 'number' ? pin.reports : 0,
    moderationNote: pin.moderationNote || '',
    comments: Array.isArray(pin.comments) ? pin.comments : []
  };
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_PINS, null, 2), 'utf8');
  }
}

function readPins() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).map(normalizePin);
}

function writePins(pins) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(pins, null, 2), 'utf8');
}

function getApprovedPins({ topic, q, sort = 'newest' } = {}) {
  let pins = readPins().filter((p) => p.status === 'approved');
  if (topic && topic !== 'Все') pins = pins.filter((p) => p.topic === topic);
  if (q) {
    const query = q.toLowerCase();
    pins = pins.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags.toLowerCase().includes(query)
    );
  }
  return sortPins(pins, sort);
}

function getPendingPins() {
  return readPins()
    .filter((p) => p.status === 'pending')
    .sort((a, b) => b.id - a.id);
}

function getModerationOverview() {
  const pins = readPins();
  return {
    approvedPins: pins.filter((p) => p.status === 'approved').length,
    pendingPins: pins.filter((p) => p.status === 'pending').length,
    rejectedPins: pins.filter((p) => p.status === 'rejected').length,
    totalReports: pins.reduce((sum, p) => sum + (p.reports || 0), 0)
  };
}

function addPin({ title, description, topic, tags, author, imageUrl, status, moderationNote = '' }) {
  const pins = readPins();
  const nextId = pins.length ? Math.max(...pins.map((p) => p.id)) + 1 : 1;
  const newPin = {
    id: nextId,
    title: title.trim(),
    description: (description || '').trim(),
    topic: TOPICS.includes(topic) ? topic : TOPICS[0],
    tags: (tags || '#вдохновение').trim(),
    author: (author || 'Гость RuBin').trim(),
    imageUrl,
    status,
    likes: 0,
    reports: 0,
    moderationNote,
    comments: [],
    createdAt: new Date().toISOString()
  };
  pins.push(newPin);
  writePins(pins);
  return newPin;
}

function likePin(id) {
  const pins = readPins();
  const target = pins.find((p) => p.id === Number(id));
  if (!target) return null;
  target.likes += 1;
  writePins(pins);
  return target;
}

function reportPin(id, reason = 'Жалоба пользователя на контент') {
  const pins = readPins();
  const target = pins.find((p) => p.id === Number(id));
  if (!target) return null;
  target.reports += 1;
  target.status = 'pending';
  target.moderationNote = `Жалоба пользователя (${target.reports}): ${reason}`;
  writePins(pins);
  return target;
}

function decidePinStatus(id, status) {
  if (!['approved', 'rejected'].includes(status)) return null;
  const pins = readPins();
  const target = pins.find((p) => p.id === Number(id));
  if (!target) return null;
  target.status = status;
  target.moderationNote =
    status === 'approved'
      ? 'Проверено и одобрено модератором RuBin'
      : 'Отклонено модератором при ручной проверке';
  writePins(pins);
  return target;
}

function getPinComments(id) {
  const target = readPins().find((p) => p.id === Number(id));
  return target ? target.comments : null;
}

function addPinComment(id, { author, text }) {
  const pins = readPins();
  const target = pins.find((p) => p.id === Number(id));
  if (!target) return null;
  const nextCommentId = target.comments.length
    ? Math.max(...target.comments.map((c) => c.id)) + 1
    : 1;
  const comment = {
    id: nextCommentId,
    author: String(author || 'Гость RuBin').trim() || 'Гость RuBin',
    text: String(text).trim(),
    createdAt: new Date().toISOString()
  };
  target.comments.push(comment);
  writePins(pins);
  return comment;
}

module.exports = {
  TOPICS,
  SORT_MODES,
  getApprovedPins,
  getPendingPins,
  getModerationOverview,
  addPin,
  likePin,
  reportPin,
  decidePinStatus,
  getPinComments,
  addPinComment,
  readPins,
  writePins
};
