let allPins = [];
let allTopics = [];
let activeTopic = 'Все';

const pinsGrid = document.getElementById('pinsGrid');
const topicsBar = document.getElementById('topicsBar');
const searchInput = document.getElementById('searchInput');

const toggleCheckerBtn = document.getElementById('toggleCheckerBtn');
const checkerPanel = document.getElementById('checkerPanel');
const runCheckBtn = document.getElementById('runCheckBtn');
const checkResult = document.getElementById('checkResult');

const openCreateModalBtn = document.getElementById('openCreateModalBtn');
const closeCreateModalBtn = document.getElementById('closeCreateModalBtn');
const cancelCreateBtn = document.getElementById('cancelCreateBtn');
const createModal = document.getElementById('createModal');
const createPinForm = document.getElementById('createPinForm');
const pinTopicSelect = document.getElementById('pinTopic');
const createPinStatus = document.getElementById('createPinStatus');

function fallbackSvg(title) {
  const safe = encodeURIComponent(title);
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23be123c"/><text x="50%" y="50%" fill="white" font-size="20" font-family="sans-serif" text-anchor="middle">${safe}</text></svg>`;
}

function renderTopics(topics) {
  const list = ['Все', ...topics];
  topicsBar.innerHTML = '';
  list.forEach((topic) => {
    const btn = document.createElement('button');
    btn.className = `topic-chip ${topic === activeTopic ? 'active' : ''}`;
    btn.textContent = topic;
    btn.onclick = () => {
      activeTopic = topic;
      renderTopics(topics);
      renderPins();
    };
    topicsBar.appendChild(btn);
  });

  pinTopicSelect.innerHTML = topics
    .map((t) => `<option value="${t}">${t}</option>`)
    .join('');
}

function renderPins() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = allPins.filter((pin) => {
    const matchTopic = activeTopic === 'Все' || pin.topic === activeTopic;
    const matchQuery =
      !query ||
      pin.title.toLowerCase().includes(query) ||
      pin.description.toLowerCase().includes(query) ||
      pin.tags.toLowerCase().includes(query);
    return matchTopic && matchQuery;
  });

  pinsGrid.innerHTML = filtered
    .map(
      (pin) => `
      <article class="pin-card">
        <img class="pin-image" src="${pin.imageUrl}" alt="${pin.title}"
             onerror="this.onerror=null;this.src='${fallbackSvg(pin.title)}'" />
        <div class="pin-body">
          <span class="pin-topic">${pin.topic}</span>
          <h3 class="pin-title">${pin.title}</h3>
          <p class="pin-desc">${pin.description}</p>
          <div class="pin-author">Автор: ${pin.author} • ${pin.tags}</div>
        </div>
      </article>
    `
    )
    .join('');
}

async function loadInitialData() {
  const res = await fetch('/api/pins');
  const data = await res.json();
  allPins = data.pins || [];
  allTopics = data.topics || [];
  renderTopics(allTopics);
  renderPins();
}

searchInput.addEventListener('input', renderPins);

toggleCheckerBtn.addEventListener('click', () => {
  checkerPanel.classList.toggle('hidden');
});

runCheckBtn.addEventListener('click', async () => {
  const payload = {
    title: document.getElementById('checkTitle').value,
    description: document.getElementById('checkDesc').value,
    fileName: document.getElementById('checkFile').value
  };

  const res = await fetch('/api/moderate-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await res.json();

  checkResult.className = `check-result ${result.status}`;
  checkResult.textContent = `[Статус: ${result.status.toUpperCase()}] ${result.reason}`;
});

function closeModal() {
  createModal.classList.add('hidden');
  createPinStatus.className = 'check-result hidden';
}

openCreateModalBtn.addEventListener('click', () => {
  createModal.classList.remove('hidden');
});
closeCreateModalBtn.addEventListener('click', closeModal);
cancelCreateBtn.addEventListener('click', closeModal);

createPinForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append('title', document.getElementById('pinTitle').value);
  formData.append('description', document.getElementById('pinDesc').value);
  formData.append('topic', pinTopicSelect.value);
  formData.append('author', document.getElementById('pinAuthor').value);
  formData.append('tags', document.getElementById('pinTags').value);
  formData.append('imageUrl', document.getElementById('pinImageUrl').value);

  const fileInput = document.getElementById('pinFile');
  if (fileInput.files && fileInput.files[0]) {
    formData.append('image', fileInput.files[0]);
  }

  const res = await fetch('/api/pins', {
    method: 'POST',
    body: formData
  });
  const result = await res.json();

  createPinStatus.className = `check-result ${result.status}`;
  createPinStatus.textContent = result.reason;

  if (result.status === 'approved') {
    createPinForm.reset();
    await loadInitialData();
    setTimeout(closeModal, 1200);
  } else if (result.status === 'pending') {
    createPinForm.reset();
  }
});

loadInitialData();