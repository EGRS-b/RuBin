let allPins = [];
let allTopics = [];
let allBoards = [];
let activeTopic = 'Все';
let activeSort = 'newest';
let activeBoard = null;
let activeDetailPin = null;
let searchTimer = null;
let currentUser = null;
let authToken = localStorage.getItem('rubin_auth_token') || '';

const pinsGrid = document.getElementById('pinsGrid');
const topicsBar = document.getElementById('topicsBar');
const sortBar = document.getElementById('sortBar');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const searchInput = document.getElementById('searchInput');
const safeSearchBanner = document.getElementById('safeSearchBanner');
const safeSearchReason = document.getElementById('safeSearchReason');
const resetSearchBtn = document.getElementById('resetSearchBtn');

const toggleBoardsBtn = document.getElementById('toggleBoardsBtn');
const boardsPanel = document.getElementById('boardsPanel');
const boardsBadge = document.getElementById('boardsBadge');
const boardsGrid = document.getElementById('boardsGrid');
const createBoardForm = document.getElementById('createBoardForm');
const boardFormStatus = document.getElementById('boardFormStatus');
const activeBoardBar = document.getElementById('activeBoardBar');
const activeBoardLabel = document.getElementById('activeBoardLabel');
const clearBoardFilterBtn = document.getElementById('clearBoardFilterBtn');

const toggleCheckerBtn = document.getElementById('toggleCheckerBtn');
const checkerPanel = document.getElementById('checkerPanel');
const runCheckBtn = document.getElementById('runCheckBtn');
const checkResult = document.getElementById('checkResult');

const toggleModBtn = document.getElementById('toggleModBtn');
const moderatorPanel = document.getElementById('moderatorPanel');
const pendingBadge = document.getElementById('pendingBadge');
const pendingList = document.getElementById('pendingList');
const refreshModBtn = document.getElementById('refreshModBtn');
const statTotalEvents = document.getElementById('statTotalEvents');
const statBlockedCount = document.getElementById('statBlockedCount');
const statSpamCount = document.getElementById('statSpamCount');
const statPendingReports = document.getElementById('statPendingReports');
const auditActionFilter = document.getElementById('auditActionFilter');
const auditLogList = document.getElementById('auditLogList');

const openAuthModalBtn = document.getElementById('openAuthModalBtn');
const userChip = document.getElementById('userChip');
const userDisplayName = document.getElementById('userDisplayName');
const userRoleBadge = document.getElementById('userRoleBadge');
const logoutBtn = document.getElementById('logoutBtn');
const authModal = document.getElementById('authModal');
const authModalTitle = document.getElementById('authModalTitle');
const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginStatusMsg = document.getElementById('loginStatusMsg');
const registerStatusMsg = document.getElementById('registerStatusMsg');

const openCreateModalBtn = document.getElementById('openCreateModalBtn');
const closeCreateModalBtn = document.getElementById('closeCreateModalBtn');
const cancelCreateBtn = document.getElementById('cancelCreateBtn');
const createModal = document.getElementById('createModal');
const createPinForm = document.getElementById('createPinForm');
const pinTopicSelect = document.getElementById('pinTopic');
const pinAuthorInput = document.getElementById('pinAuthor');
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
const saveBoardSelect = document.getElementById('saveBoardSelect');
const saveToBoardBtn = document.getElementById('saveToBoardBtn');

const commentsList = document.getElementById('commentsList');
const commentForm = document.getElementById('commentForm');
const commentAuthorInput = document.getElementById('commentAuthor');
const commentStatusMsg = document.getElementById('commentStatusMsg');

const healthPill = document.getElementById('healthPill');
const healthStatusText = document.getElementById('healthStatusText');
const openAboutModalBtn = document.getElementById('openAboutModalBtn');
const footerAboutBtn = document.getElementById('footerAboutBtn');
const aboutModal = document.getElementById('aboutModal');
const closeAboutModalBtn = document.getElementById('closeAboutModalBtn');
const okAboutModalBtn = document.getElementById('okAboutModalBtn');
const refreshHealthBtn = document.getElementById('refreshHealthBtn');
const sysHealthState = document.getElementById('sysHealthState');
const sysVersion = document.getElementById('sysVersion');
const sysUptime = document.getElementById('sysUptime');
const sysModerationMode = document.getElementById('sysModerationMode');

const SOURCE_LABELS = {
  pin: 'Пин',
  search: 'Поиск',
  comment: 'Комментарий',
  board: 'Доска',
  report: 'Жалоба',
  moderator: 'Модератор',
  auth: 'Аккаунт',
  system: 'Система'
};

const ACTION_LABELS = {
  blocked: 'Заблокировано',
  flagged: 'На проверке',
  approved: 'Разрешено'
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildAuthHeaders(extraHeaders = {}) {
  const headers = {
    'X-Rubin-Client': 'web',
    ...extraHeaders
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return headers;
}

function apiFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: buildAuthHeaders(options.headers || {})
  });
}

function isModerator() {
  return Boolean(currentUser && currentUser.role === 'moderator');
}

function syncAuthorInputs() {
  if (currentUser) {
    pinAuthorInput.value = currentUser.displayName;
    commentAuthorInput.value = currentUser.displayName;
  }
}

function setAuthTab(mode) {
  const isLogin = mode === 'login';
  tabLoginBtn.classList.toggle('active', isLogin);
  tabRegisterBtn.classList.toggle('active', !isLogin);
  loginForm.classList.toggle('hidden', !isLogin);
  registerForm.classList.toggle('hidden', isLogin);
  authModalTitle.textContent = isLogin
    ? '👤 Вход в аккаунт RuBin'
    : '✨ Регистрация в RuBin';
  loginStatusMsg.className = 'check-result hidden';
  registerStatusMsg.className = 'check-result hidden';
}

function openAuthModal(defaultMode = 'login') {
  setAuthTab(defaultMode);
  authModal.classList.remove('hidden');
}

function closeAuthModal() {
  authModal.classList.add('hidden');
}

openAuthModalBtn.addEventListener('click', () => openAuthModal('login'));
closeAuthModalBtn.addEventListener('click', closeAuthModal);
tabLoginBtn.addEventListener('click', () => setAuthTab('login'));
tabRegisterBtn.addEventListener('click', () => setAuthTab('register'));

async function restoreSession() {
  if (!authToken) {
    currentUser = null;
        return;
  }
  try {
    const res = await apiFetch('/api/auth/me');
    if (!res.ok) {
      authToken = '';
      localStorage.removeItem('rubin_auth_token');
      currentUser = null;
            return;
    }
    const data = await res.json();
    currentUser = data.user || null;
        if (isModerator()) {
      await loadPendingQueue();
    }
  } catch {
    currentUser = null;
      }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    username: document.getElementById('loginUsername').value,
    password: document.getElementById('loginPassword').value
  };
  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      loginStatusMsg.className = 'check-result rejected';
      loginStatusMsg.textContent = data.reason || 'Не удалось выполнить вход.';
      return;
    }
    authToken = data.token;
    localStorage.setItem('rubin_auth_token', authToken);
    currentUser = data.user;
        loginForm.reset();
    closeAuthModal();
    if (isModerator()) {
      await refreshModeratorDashboard();
    }
  } catch {
    loginStatusMsg.className = 'check-result rejected';
    loginStatusMsg.textContent = 'Сервер авторизации временно недоступен.';
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    username: document.getElementById('regUsername').value,
    displayName: document.getElementById('regDisplayName').value,
    password: document.getElementById('regPassword').value
  };
  try {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      registerStatusMsg.className = 'check-result rejected';
      registerStatusMsg.textContent = data.reason || 'Ошибка при регистрации.';
      return;
    }
    authToken = data.token;
    localStorage.setItem('rubin_auth_token', authToken);
    currentUser = data.user;
        registerForm.reset();
    closeAuthModal();
  } catch {
    registerStatusMsg.className = 'check-result rejected';
    registerStatusMsg.textContent = 'Сервер регистрации временно недоступен.';
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Игнорируем сетевую ошибку при выходе
  }
  authToken = '';
  currentUser = null;
  localStorage.removeItem('rubin_auth_token');
  pinAuthorInput.value = '';
  commentAuthorInput.value = '';
  });

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.dataset.theme = isDark ? 'dark' : 'light';
  themeToggleBtn.textContent = isDark ? '☀️ Светлая тема' : '🌙 Ночная тема';
  localStorage.setItem('rubin_theme', isDark ? 'dark' : 'light');
}

applyTheme(localStorage.getItem('rubin_theme') || 'light');

themeToggleBtn.addEventListener('click', () => {
  const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});

function syncSortChips() {
  sortBar.querySelectorAll('.sort-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.sort === activeSort);
  });
}

sortBar.querySelectorAll('.sort-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    activeSort = chip.dataset.sort || 'newest';
    syncSortChips();
    fetchPins();
  });
});

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

async function loadBoards() {
  const res = await apiFetch('/api/boards');
  const data = await res.json();
  allBoards = data.boards || [];
  boardsBadge.textContent = allBoards.length;

  boardsGrid.innerHTML = allBoards
    .map(
      (b) => `
      <div class="board-card" data-board-id="${b.id}">
        <h4>📌 ${escapeHtml(b.title)}</h4>
        <p>${escapeHtml(b.description || 'Персональная подборка пинов')}</p>
        <span class="board-count">Пинов внутри: ${b.pinIds.length}</span>
      </div>
    `
    )
    .join('');

  boardsGrid.querySelectorAll('.board-card').forEach((card) => {
    card.addEventListener('click', () => {
      const found = allBoards.find((b) => b.id === Number(card.dataset.boardId));
      if (found) {
        activeBoard = found;
        activeBoardLabel.textContent = `📌 Открыта коллекция: «${found.title}» (${found.pinIds.length})`;
        activeBoardBar.classList.remove('hidden');
        boardsPanel.classList.add('hidden');
        renderPins();
      }
    });
  });

  saveBoardSelect.innerHTML = allBoards
    .map((b) => `<option value="${b.id}">${escapeHtml(b.title)}</option>`)
    .join('');

  if (activeBoard) {
    activeBoard = allBoards.find((b) => b.id === activeBoard.id) || null;
  }
}

clearBoardFilterBtn.addEventListener('click', () => {
  activeBoard = null;
  activeBoardBar.classList.add('hidden');
  renderPins();
});

document.getElementById('logoHome').addEventListener('click', () => {
  activeBoard = null;
  activeTopic = 'Все';
  activeSort = 'newest';
  searchInput.value = '';
  activeBoardBar.classList.add('hidden');
  syncSortChips();
  renderTopics(allTopics);
  fetchPins();
});

toggleBoardsBtn.addEventListener('click', () => {
  boardsPanel.classList.toggle('hidden');
  loadBoards();
});

createBoardForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById('newBoardTitle').value,
    description: document.getElementById('newBoardDesc').value
  };
  const res = await apiFetch('/api/boards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  boardFormStatus.className = `check-result ${data.ok ? 'approved' : 'rejected'}`;
  boardFormStatus.textContent = data.reason;
  if (data.ok) {
    createBoardForm.reset();
    await loadBoards();
  } else if (isModerator() && !moderatorPanel.classList.contains('hidden')) {
    await refreshModeratorDashboard();
  }
});

saveToBoardBtn.addEventListener('click', async () => {
  if (!activeDetailPin || !saveBoardSelect.value) return;
  const res = await apiFetch(`/api/boards/${saveBoardSelect.value}/pins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinId: activeDetailPin.id })
  });
  const data = await res.json();
  if (data.ok) {
    detailStatusMsg.className = 'check-result approved';
    detailStatusMsg.textContent = data.message;
    await loadBoards();
    renderPins();
  }
});

function renderPins() {
  const visiblePins = activeBoard
    ? allPins.filter((p) => activeBoard.pinIds.includes(p.id))
    : allPins;

  pinsGrid.innerHTML = visiblePins
    .map(
      (pin) => `
      <article class="pin-card" data-id="${pin.id}">
        <img class="pin-image" src="${pin.imageUrl}" alt="${escapeHtml(pin.title)}"
             onerror="this.onerror=null;this.src='${fallbackSvg(pin.title)}'" />
        <div class="pin-body">
          <span class="pin-topic">${escapeHtml(pin.topic)}</span>
          <h3 class="pin-title">${escapeHtml(pin.title)}</h3>
          <p class="pin-desc">${escapeHtml(pin.description)}</p>
          <div class="pin-footer">
            <span class="pin-author">${escapeHtml(pin.author)}</span>
            <div class="pin-stats">
              <span class="comment-count-chip">💬 ${(pin.comments || []).length}</span>
              <button class="like-chip" data-like-id="${pin.id}">❤️ ${pin.likes || 0}</button>
            </div>
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
  params.set('sort', activeSort);

  const res = await apiFetch(`/api/pins?${params.toString()}`);
  const data = await res.json();

  if (data.topics && !allTopics.length) {
    allTopics = data.topics;
    renderTopics(allTopics);
  }

  if (data.safeSearchBlocked) {
    safeSearchReason.textContent = data.reason;
    safeSearchBanner.classList.remove('hidden');
    pinsGrid.innerHTML = '';
    if (isModerator() && !moderatorPanel.classList.contains('hidden')) {
      await refreshModeratorDashboard();
    }
    return;
  }

  safeSearchBanner.classList.add('hidden');
  allPins = data.pins || [];
  renderPins();
}

async function sendLike(id) {
  const res = await apiFetch(`/api/pins/${id}/like`, { method: 'POST' });
  const data = await res.json();
  if (data.ok) {
    await fetchPins();
    if (activeDetailPin && activeDetailPin.id === Number(id)) {
      activeDetailPin.likes = data.likes;
      detailLikeBtn.textContent = `❤️ Нравится (${data.likes})`;
    }
  }
}

async function loadComments(pinId) {
  const res = await apiFetch(`/api/pins/${pinId}/comments`);
  const data = await res.json();
  const list = data.comments || [];
  if (!list.length) {
    commentsList.innerHTML = '<p class="checker-hint">Пока нет комментариев — станьте первым!</p>';
    return;
  }
  commentsList.innerHTML = list
    .map((c) => `<div class="comment-item"><strong>${escapeHtml(c.author)}:</strong> ${escapeHtml(c.text)}</div>`)
    .join('');
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
  commentStatusMsg.className = 'check-result hidden';
    detailModal.classList.remove('hidden');
  loadComments(pin.id);
}

commentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeDetailPin) return;
  const payload = {
    author: commentAuthorInput.value,
    text: document.getElementById('commentText').value
  };
  const res = await apiFetch(`/api/pins/${activeDetailPin.id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  commentStatusMsg.className = `check-result ${data.ok ? 'approved' : 'rejected'}`;
  commentStatusMsg.textContent = data.reason;
  if (data.ok) {
    document.getElementById('commentText').value = '';
    await loadComments(activeDetailPin.id);
    await fetchPins();
  } else if (isModerator() && !moderatorPanel.classList.contains('hidden')) {
    await refreshModeratorDashboard();
  }
});

closeDetailModalBtn.addEventListener('click', () => detailModal.classList.add('hidden'));

detailLikeBtn.addEventListener('click', async () => {
  if (activeDetailPin) await sendLike(activeDetailPin.id);
});

detailReportBtn.addEventListener('click', async () => {
  if (!activeDetailPin) return;
  const res = await apiFetch(`/api/pins/${activeDetailPin.id}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Отправлено пользователем на проверку соответствия правилам РФ' })
  });
  const data = await res.json();
  if (data.ok) {
    detailStatusMsg.className = 'check-result pending';
    detailStatusMsg.textContent = data.message;
    await fetchPins();
    await refreshModeratorDashboard();
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

toggleCheckerBtn.addEventListener('click', () => {
  if (!isModerator()) return;
  checkerPanel.classList.toggle('hidden');
});

runCheckBtn.addEventListener('click', async () => {
  if (!isModerator()) return;
  const payload = {
    title: document.getElementById('checkTitle').value,
    description: document.getElementById('checkDesc').value,
    fileName: document.getElementById('checkFile').value
  };
  const res = await apiFetch('/api/moderate-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await res.json();
  if (!res.ok) {
    checkResult.className = 'check-result rejected';
    checkResult.textContent = result.reason || 'Доступ разрешён только модераторам.';
    return;
  }
  checkResult.className = `check-result ${result.status}`;
  checkResult.textContent = `[Статус: ${result.status.toUpperCase()}] ${result.reason}`;
});

function closeCreateModal() {
  createModal.classList.add('hidden');
  createPinStatus.className = 'check-result hidden';
}

openCreateModalBtn.addEventListener('click', () => {
    createModal.classList.remove('hidden');
});
closeCreateModalBtn.addEventListener('click', closeCreateModal);
cancelCreateBtn.addEventListener('click', closeCreateModal);

createPinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData();
  formData.append('title', document.getElementById('pinTitle').value);
  formData.append('description', document.getElementById('pinDesc').value);
  formData.append('topic', pinTopicSelect.value);
  formData.append('author', pinAuthorInput.value);
  formData.append('tags', document.getElementById('pinTags').value);
  formData.append('imageUrl', document.getElementById('pinImageUrl').value);

  const fileInput = document.getElementById('pinFile');
  if (fileInput.files && fileInput.files[0]) {
    formData.append('image', fileInput.files[0]);
  }

  const res = await apiFetch('/api/pins', { method: 'POST', body: formData });
  const result = await res.json();

  createPinStatus.className = `check-result ${result.status}`;
  createPinStatus.textContent = result.reason;

  if (result.status === 'approved') {
    createPinForm.reset();
        await fetchPins();
    await refreshModeratorDashboard();
    setTimeout(closeCreateModal, 1100);
  } else if (result.status === 'pending') {
    createPinForm.reset();
        await refreshModeratorDashboard();
  } else {
    await refreshModeratorDashboard();
  }
});

async function loadModerationStats() {
  if (!isModerator()) return;
  try {
    const res = await apiFetch('/api/moderation/stats');
    if (!res.ok) return;
    const data = await res.json();
    const s = data.stats || {};
    statTotalEvents.textContent = s.totalEvents || 0;
    statBlockedCount.textContent = s.blockedCount || 0;
    statSpamCount.textContent = s.spamBlockedCount || 0;
    statPendingReports.textContent = `${s.pendingPins || 0} / ${s.totalReports || 0}`;
  } catch {
    // Безопасный fallback
  }
}

async function loadAuditLog() {
  if (!isModerator()) return;
  try {
    const params = new URLSearchParams({ limit: '25' });
    if (auditActionFilter.value) params.set('action', auditActionFilter.value);
    const res = await apiFetch(`/api/moderation/audit?${params.toString()}`);
    if (!res.ok) {
      auditLogList.innerHTML = '<p class="checker-hint">Журнал аудита доступен только модераторам.</p>';
      return;
    }
    const data = await res.json();
    const logs = data.logs || [];
    if (!logs.length) {
      auditLogList.innerHTML = '<p class="checker-hint">Записей по выбранному фильтру пока нет.</p>';
      return;
    }

    auditLogList.innerHTML = logs
      .map((item) => {
        const formattedTime = new Date(item.timestamp).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        const actionLabel = ACTION_LABELS[item.action] || item.action;
        const sourceLabel = SOURCE_LABELS[item.source] || item.source;
        return `
          <div class="audit-row">
            <div class="audit-row-top">
              <div class="audit-badges">
                <span class="audit-badge ${escapeHtml(item.action)}">${escapeHtml(actionLabel)}</span>
                <span class="audit-badge source">${escapeHtml(sourceLabel)}</span>
                <strong>${escapeHtml(item.categoryLabel || 'Проверка контента')}</strong>
                <span>— ${escapeHtml(item.target)}</span>
              </div>
              <span class="audit-time">${escapeHtml(formattedTime)}</span>
            </div>
            <div class="audit-reason">${escapeHtml(item.reason)}</div>
          </div>
        `;
      })
      .join('');
  } catch {
    auditLogList.innerHTML = '<p class="checker-hint">Не удалось загрузить журнал аудита.</p>';
  }
}

async function loadPendingQueue() {
  if (!isModerator()) return;
  const res = await apiFetch('/api/moderation/pending');
  if (!res.ok) return;
  const data = await res.json();
  const items = data.pins || [];
  pendingBadge.textContent = items.length;

  if (!items.length) {
    pendingList.innerHTML = '<p class="checker-hint">Очередь пуста — все спорные публикации проверены!</p>';
    return;
  }

  pendingList.innerHTML = items
    .map(
      (pin) => `
      <div class="pending-item">
        <img src="${pin.imageUrl}" alt="${escapeHtml(pin.title)}"
             onerror="this.onerror=null;this.src='${fallbackSvg(pin.title)}'" />
        <div>
          <strong>${escapeHtml(pin.title)}</strong> <span class="pin-author">(${escapeHtml(pin.author)})</span>
          <p class="pin-desc">${escapeHtml(pin.description)}</p>
          <div class="pending-note">Причина проверки: ${escapeHtml(pin.moderationNote || 'Серый список фильтра')}</div>
        </div>
        <div class="pending-actions">
          <button class="btn-approve" data-decide="approved" data-id="${pin.id}">✅ Одобрить</button>
          <button class="btn-reject" data-decide="rejected" data-id="${pin.id}">❌ Отклонить</button>
        </div>
      </div>
    `
    )
    .join('');

  pendingList.querySelectorAll('button[data-decide]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await apiFetch(`/api/moderation/${btn.dataset.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: btn.dataset.decide })
      });
      await refreshModeratorDashboard();
      await fetchPins();
    });
  });
}

async function refreshModeratorDashboard() {
  if (!isModerator()) return;
  await Promise.all([loadPendingQueue(), loadModerationStats(), loadAuditLog()]);
}

refreshModBtn.addEventListener('click', refreshModeratorDashboard);
auditActionFilter.addEventListener('change', loadAuditLog);

toggleModBtn.addEventListener('click', () => {
  if (!isModerator()) return;
  moderatorPanel.classList.toggle('hidden');
  if (!moderatorPanel.classList.contains('hidden')) {
    refreshModeratorDashboard();
  }
});

function formatUptime(seconds) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) {
    return 'Сервер активен';
  }
  if (seconds < 60) return `${seconds} сек.`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин. ${seconds % 60} сек.`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч. ${minutes % 60} мин.`;
}

async function loadSystemHealth() {
  try {
    const res = await apiFetch('/api/health');
    if (!res.ok) throw new Error('Health endpoint unavailable');
    const data = await res.json();
    const versionText = data.version ? `v${data.version}` : 'v1.1.0';
    const modeLabel = data.moderationLabel || 'Словарная фильтрация РФ (без ИИ)';

    healthPill.classList.remove('offline');
    healthStatusText.textContent = `Онлайн • ${modeLabel} • ${versionText}`;

    sysHealthState.textContent = data.status === 'ok' ? 'Онлайн (200 OK)' : 'Проверка...';
    sysVersion.textContent = versionText;
    sysUptime.textContent = formatUptime(data.uptimeSeconds);
    sysModerationMode.textContent = modeLabel;
  } catch {
    healthPill.classList.add('offline');
    healthStatusText.textContent = 'Автономный режим • Защита РФ активна';
    sysHealthState.textContent = 'Ожидание ответа API';
  }
}

function openAboutModal() {
  aboutModal.classList.remove('hidden');
  loadSystemHealth();
}

function closeAboutModal() {
  aboutModal.classList.add('hidden');
}

openAboutModalBtn.addEventListener('click', openAboutModal);
footerAboutBtn.addEventListener('click', openAboutModal);
closeAboutModalBtn.addEventListener('click', closeAboutModal);
okAboutModalBtn.addEventListener('click', closeAboutModal);
refreshHealthBtn.addEventListener('click', loadSystemHealth);

restoreSession();
fetchPins();
loadBoards();
loadSystemHealth();
