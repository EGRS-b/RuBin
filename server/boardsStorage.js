const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');

const INITIAL_BOARDS = [
  {
    id: 1,
    title: 'Идеи для дома и дачи',
    description: 'Тёплый интерьер, деревянный декор и вечерние чаепития',
    pinIds: [4, 8],
    createdAt: '2026-10-25T10:00:00.000Z'
  },
  {
    id: 2,
    title: 'Рецепты выходного дня',
    description: 'Домашняя выпечка и семейные завтраки',
    pinIds: [2],
    createdAt: '2026-10-26T12:00:00.000Z'
  },
  {
    id: 3,
    title: 'Маршруты по России',
    description: 'Байкал, Алтай, Золотое кольцо и русское зодчество',
    pinIds: [1, 5, 7],
    createdAt: '2026-10-27T15:00:00.000Z'
  }
];

function ensureBoardsFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BOARDS_FILE)) {
    fs.writeFileSync(BOARDS_FILE, JSON.stringify(INITIAL_BOARDS, null, 2), 'utf8');
  }
}

function readBoards() {
  ensureBoardsFile();
  return JSON.parse(fs.readFileSync(BOARDS_FILE, 'utf8'));
}

function writeBoards(boards) {
  ensureBoardsFile();
  fs.writeFileSync(BOARDS_FILE, JSON.stringify(boards, null, 2), 'utf8');
}

function getBoards() {
  return readBoards().sort((a, b) => b.id - a.id);
}

function createBoard({ title, description = '' }) {
  const boards = readBoards();
  const nextId = boards.length ? Math.max(...boards.map((b) => b.id)) + 1 : 1;
  const newBoard = {
    id: nextId,
    title: String(title).trim(),
    description: String(description).trim(),
    pinIds: [],
    createdAt: new Date().toISOString()
  };
  boards.push(newBoard);
  writeBoards(boards);
  return newBoard;
}

function togglePinInBoard(boardId, pinId) {
  const boards = readBoards();
  const board = boards.find((b) => b.id === Number(boardId));
  if (!board) return null;

  const numPinId = Number(pinId);
  const exists = board.pinIds.includes(numPinId);
  if (exists) {
    board.pinIds = board.pinIds.filter((id) => id !== numPinId);
  } else {
    board.pinIds.push(numPinId);
  }
  writeBoards(boards);
  return { board, added: !exists };
}

module.exports = {
  getBoards,
  createBoard,
  togglePinInBoard
};
