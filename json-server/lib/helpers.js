const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

const DATA_DIR   = path.resolve(__dirname, '..', 'store', 'data');
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR,    { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Хеш пароля (bcrypt) ───────────────────────────────────────────────────────
// hashPass — синхронный (используется только при первичной инициализации БД).
// verifyPass — async, используется в routes/auth.js при логине.
// Миграция: если сохранён старый SHA-256 хэш (64 hex-символа), при успешном
// входе он автоматически перехешируется в bcrypt (lazy migration).
function hashPass(s) {
  return bcrypt.hashSync(s, BCRYPT_ROUNDS);
}

async function verifyPass(plain, storedHash) {
  // Определяем старый SHA-256 формат (64 hex-символа, не bcrypt $2a/$2b)
  const isSha256 = /^[a-f0-9]{64}$/.test(storedHash);
  if (isSha256) {
    const sha = crypto.createHash('sha256').update(plain).digest('hex');
    return sha === storedHash;
  }
  return bcrypt.compare(plain, storedHash);
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

// ── Обход файлов lists/ (листки осмотра) ─────────────────────────────────────
// Намеренно ограничен папкой lists/ — глобальные коллекции (users, tasks …)
// лежат в корне DATA_DIR и к листкам отношения не имеют.
const LISTS_DIR = path.join(DATA_DIR, 'lists');

function iterAllFiles(callback) {
  if (!fs.existsSync(LISTS_DIR)) return;
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
  walk(LISTS_DIR);
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

// ── Декодирование имени файла latin1 → utf8 (Windows/Node/multer) ─────────────
function fixEncoding(name) {
  try {
    const buf  = Buffer.from(name, 'latin1');
    const utf8 = buf.toString('utf8');
    return /[-�]/.test(utf8) ? utf8 : name;
  } catch { return name; }
}

module.exports = {
  DATA_DIR,
  UPLOADS_DIR,
  BCRYPT_ROUNDS,
  hashPass,
  verifyPass,
  safeName,
  getLinePath,
  getLineDb,
  saveLineDb,
  iterAllFiles,
  findFileBySheetId,
  fixEncoding,
};
