let allPins = [];
let allTopics = [];
let activeTopic = 'Все';
let activeDetailPin = null;
let searchTimer = null;

const pinsGrid = document.getElementById('pinsGrid');
const topicsBar = document.getElementById('topicsBar');
const searchInput = document.getElementById('searchInput');
const safeSearchBanner = document.getElementById('safeSearchBanner');
const safeSearchReason = document.getElementById('safeSearchReason');
const resetSearchBtn = document.getElementById('resetSearchBtn');

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

const detailModal = document.getElementById('detailModal');
const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
const detailImage = document.getElementById('detailImage');
const detailTopic = document.getElementById('detailTopic');
const detailTitle = document.getElementById('detailTitle');
const detailDesc = document.getElementById('detailDesc');
const detailAuthor = document.getElementById('detailAuthor');
const detailTags = document.getElementById('detailTags');
const detailLikeBtn = document.getElementById('detailLikeBtn');
const detailReportBtn = document.getElementById('detailReportBtn');
const detailStatusMsg = document.getElementById('detailStatusMsg');

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
      fetchPins();
    };
    topicsBar.appendChild(btn);
  });

  pinTopicSelect.innerHTML = topics.map((t) => `<option value="${t}">${t}</option>`).join('');
}

function renderPins() {
  pinsGrid.innerHTML = allPins
    .map(
      (pin) => `
      <article class="pin-card" data-id="${pin.id}">
        <img class="pin-image" src="${pin.imageUrl}" alt="${pin.title}"
             onerror="this.onerror=null;this.src='${fallbackSvg(pin.title)}'" />
        <div class="pin-body">
          <span class="pin-topic">${pin.topic}</span>
          <h3 class="pin-title">${pin.title}</h3>
          <p class="pin-desc">${pin.description}</p>
          <div class="pin-footer">
            <span class="pin-author">${pin.author}</span>
            <button class="like-chip" data-like-id="${pin.id}">❤️ ${pin.likes || 0}</button>
          </div>
        </div>
      </article>
    `
    )
    .join('');

  document.querySelectorAll('.pin-card').forEach((card) => {
    card.addEventListener('click', () => {
      const pin = allPins.find((p) => p.id === Number(card.dataset.id));
      if (pin) openDetailModal(pin);
    });
  });

  document.querySelectorAll('.like-chip').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await sendLike(btn.dataset.likeId);
    });
  });
}

async function fetchPins() {
  const params = new URLSearchParams();
  if (activeTopic !== 'Все') params.set('topic', activeTopic);
  if (searchInput.value.trim()) params.set('q', searchInput.value.trim());

  const res = await fetch(`/api/pins?${params.toString()}`);
  const data = await res.json();

  if (data.topics && !allTopics.length) {
    allTopics = data.topics;
    renderTopics(allTopics);
  }

  if (data.safeSearchBlocked) {
    safeSearchReason.textContent = data.reason;
    safeSearchBanner.classList.remove('hidden');
    pinsGrid.innerHTML = '';
    return;
  }

  safeSearchBanner.classList.add('hidden');
  allPins = data.pins || [];
  renderPins();
}

async function sendLike(id) {
  const res = await fetch(`/api/pins/${id}/like`, { method: 'POST' });
  const data = await res.json();
  if (data.ok) {
    await fetchPins();
    if (activeDetailPin && activeDetailPin.id === Number(id)) {
      activeDetailPin.likes = data.likes;
      detailLikeBtn.textContent = `❤️ Нравится (${data.likes})`;
    }
  }
}

function openDetailModal(pin) {
  activeDetailPin = pin;
  detailImage.src = pin.imageUrl;
  detailImage.onerror = () => { detailImage.src = fallbackSvg(pin.title); };
  detailTopic.textContent = pin.topic;
  detailTitle.textContent = pin.title;
  detailDesc.textContent = pin.description;
  detailAuthor.textContent = `Автор публикации: ${pin.author}`;
  detailTags.textContent = pin.tags;
  detailLikeBtn.textContent = `❤️ Нравится (${pin.likes || 0})`;
  detailStatusMsg.className = 'check-result hidden';
  detailModal.classList.remove('hidden');
}

closeDetailModalBtn.addEventListener('click', () => detailModal.classList.add('hidden'));

detailLikeBtn.addEventListener('click', async () => {
  if (activeDetailPin) await sendLike(activeDetailPin.id);
});

detailReportBtn.addEventListener('click', async () => {
  if (!activeDetailPin) return;
  const res = await fetch(`/api/pins/${activeDetailPin.id}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Отправлено пользователем на проверку соответствия правилам РФ' })
  });
  const data = await res.json();
  if (data.ok) {
    detailStatusMsg.className = 'check-result pending';
    detailStatusMsg.textContent = data.message;
    await fetchPins();
  }
});

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(fetchPins, 200);
});

resetSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  fetchPins();
});

toggleCheckerBtn.addEventListener('click', () => checkerPanel.classList.toggle('hidden'));

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

function closeCreateModal() {
  createModal.classList.add('hidden');
  createPinStatus.className = 'check-result hidden';
}

openCreateModalBtn.addEventListener('click', () => createModal.classList.remove('hidden'));
closeCreateModalBtn.addEventListener('click', closeCreateModal);
cancelCreateBtn.addEventListener('click', closeCreateModal);

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

  const res = await fetch('/api/pins', { method: 'POST', body: formData });
  const result = await res.json();

  createPinStatus.className = `check-result ${result.status}`;
  createPinStatus.textContent = result.reason;

  if (result.status === 'approved') {
    createPinForm.reset();
    await fetchPins();
    setTimeout(closeCreateModal, 1100);
  } else if (result.status === 'pending') {
    createPinForm.reset();
  }
});

fetchPins();