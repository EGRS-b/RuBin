const fs = require('fs');
const path = require('path');
const http = require('http');

const DATA_DIR = path.join(__dirname, '..', '..', 'server', 'data');
const DATA_FILES = ['pins.json', 'boards.json', 'auditLog.json', 'users.json', 'sessions.json'];

function snapshotDataFiles() {
  const backup = {};
  for (const name of DATA_FILES) {
    const fullPath = path.join(DATA_DIR, name);
    backup[name] = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : null;
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
  return backup;
}

function restoreDataFiles(backup = {}) {
  for (const name of DATA_FILES) {
    const fullPath = path.join(DATA_DIR, name);
    const savedContent = backup[name];
    if (savedContent === null || savedContent === undefined) {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } else {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(fullPath, savedContent, 'utf8');
    }
  }
}

async function startTestServer() {
  const backup = snapshotDataFiles();
  const app = require('../../server/index');

  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function requestJson(urlPath, options = {}) {
    const headers = { ...(options.headers || {}) };
    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof Buffer)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const response = await fetch(`${baseUrl}${urlPath}`, {
      method: options.method || 'GET',
      headers,
      body
    });
    const data = await response.json().catch(() => ({}));
    return {
      status: response.status,
      headers: response.headers,
      data
    };
  }

  async function close() {
    await new Promise((resolve) => server.close(() => resolve()));
    restoreDataFiles(backup);
  }

  return { baseUrl, requestJson, close };
}

module.exports = { startTestServer };
