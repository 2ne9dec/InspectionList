const path = require('path');
const fs   = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.resolve(__dirname, '..', 'store', 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Хеш пароля ───────────────────────────────────────────────────────────────
function hashPass(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// ── Безопасное имя файла/папки ────────────────────────────────────────────────
function safeName(str) {
  return str.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim();
}

// ── Путь к файлу листка осмотра ───────────────────────────────────────────────
// Структура: store/data/lists/<Филиал>/<Напряжение>/<Линия>[_<date>].json
function getLinePath(filialId, voltageId, lineId, date, seedDb) {
  const filial  = seedDb.filials.find((f) => f.id === Number(filialId));
  const voltage = seedDb.voltages.find((v) => v.id === Number(voltageId));
  const line    = seedDb.lines.find((l) => l.id === Number(lineId));
  if (!filial || !voltage || !line) return null;
  const dir = path.join(DATA_DIR, 'lists', safeName(filial.name), safeName(voltage.name));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const dateSuffix = date ? `_${date}` : '';
  return path.join(dir, safeName(line.name) + dateSuffix + '.json');
}

// ── Читаем/создаём файл линии ─────────────────────────────────────────────────
function getLineDb(filepath) {
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify({ inspectionSheets: [], defectRecords: [] }, null, 2), 'utf8');
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

// ── Атомарная запись файла линии ──────────────────────────────────────────────
function saveLineDb(filepath, data) {
  const tmp = filepath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filepath);
}

// ── Обход всех файлов data/ ───────────────────────────────────────────────────
function iterAllFiles(callback) {
  if (!fs.existsSync(DATA_DIR)) return;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.json') && !entry.endsWith('.tmp')) {
        callback(fullPath);
      }
    }
  };
  walk(DATA_DIR);
}

// ── Найти файл по sheetId ─────────────────────────────────────────────────────
function findFileBySheetId(sheetId) {
  let result = null;
  iterAllFiles((fp) => {
    if (result) return;
    const db = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if ((db.inspectionSheets ?? []).some((s) => s.id === sheetId)) result = fp;
  });
  return result;
}

module.exports = {
  DATA_DIR,
  hashPass,
  safeName,
  getLinePath,
  getLineDb,
  saveLineDb,
  iterAllFiles,
  findFileBySheetId,
};
