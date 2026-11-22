const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET_DIRS = ['server', 'public', 'tests', 'scripts'];

function collectJsFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function collectJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(dirPath, entry.name));
}

let checkedJs = 0;
for (const folder of TARGET_DIRS) {
  const jsFiles = collectJsFiles(path.join(ROOT, folder));
  for (const file of jsFiles) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    checkedJs += 1;
  }
}

const jsonFiles = [
  path.join(ROOT, 'package.json'),
  ...collectJsonFiles(path.join(ROOT, 'server'))
];

let checkedJson = 0;
for (const jsonFile of jsonFiles) {
  JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  checkedJson += 1;
}

const dockerfilePath = path.join(ROOT, 'Dockerfile');
if (fs.existsSync(dockerfilePath) && fs.readFileSync(dockerfilePath, 'utf8').trim().length === 0) {
  throw new Error('Ошибка проверки инфраструктуры: файл Dockerfile пуст (забыли нажать Ctrl+S)!');
}

console.log(`Проверка RuBin завершена успешно: JS-файлов (${checkedJs}), JSON-словарей (${checkedJson}).`);