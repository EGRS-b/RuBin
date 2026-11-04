const fs = require('fs');
const path = require('path');

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
    createdAt: '2026-10-27T18:45:00.000Z'
  }
];

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_PINS, null, 2), 'utf8');
  }
}

function readPins() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writePins(pins) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(pins, null, 2), 'utf8');
}

function getApprovedPins({ topic, q } = {}) {
  let pins = readPins().filter((p) => p.status === 'approved');
  if (topic && topic !== 'Все') {
    pins = pins.filter((p) => p.topic === topic);
  }
  if (q) {
    const query = q.toLowerCase();
    pins = pins.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags.toLowerCase().includes(query)
    );
  }
  return pins.sort((a, b) => b.id - a.id);
}

function addPin({ title, description, topic, tags, author, imageUrl, status }) {
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
    createdAt: new Date().toISOString()
  };
  pins.push(newPin);
  writePins(pins);
  return newPin;
}

module.exports = {
  TOPICS,
  getApprovedPins,
  addPin,
  readPins,
  writePins
};