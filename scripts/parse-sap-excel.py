"""
parse-sap-excel.py

Разбирает SAP-экспорт (1.XLSX + 2.XLSX) и генерирует два JSON-файла
для скрипта import-sap-direct.js.

Использование:
    python scripts/parse-sap-excel.py \
        --lines=path/to/2.XLSX \
        --poles=path/to/1.XLSX \
        --out-dir=.

По умолчанию ищет файлы в текущей папке.
"""

import sys
import os
import re
import json
import argparse
import collections

try:
    import openpyxl
except ImportError:
    print("Не установлен openpyxl. Выполните: pip install openpyxl")
    sys.exit(1)

# ── Аргументы ─────────────────────────────────────────────────────────────────
ap = argparse.ArgumentParser(description='Парсинг SAP Excel для импорта в Firebird')
ap.add_argument('--lines', default='2.XLSX', help='Путь к файлу линий (2.XLSX)')
ap.add_argument('--poles', default='1.XLSX', help='Путь к файлу опор (1.XLSX)')
ap.add_argument('--out-dir', default=os.path.dirname(os.path.abspath(__file__)), help='Папка для выходных JSON-файлов')
args = ap.parse_args()

LINES_FILE   = args.lines
POLES_FILE   = args.poles
OUT_DIR      = args.out_dir

if not os.path.exists(LINES_FILE):
    print(f'Файл не найден: {LINES_FILE}')
    sys.exit(1)
if not os.path.exists(POLES_FILE):
    print(f'Файл не найден: {POLES_FILE}')
    sys.exit(1)

# ── Маппинги ──────────────────────────────────────────────────────────────────
BE_TO_FILIAL = {'5000': 1, '5200': 2, '5300': 3, '5400': 4}
VOLT_CLASS_MAP = {
    'VL035': 'ВЛ-35 кВ',
    'VL110': 'ВЛ-110 кВ',
    'VL220': 'ВЛ-220 кВ',
    'VL330': 'ВЛ-330 кВ',
}
VOLT_ORDER = ['VL035', 'VL110', 'VL220', 'VL330']

# Существующие voltageId для Жлобина (filialId=2) — уже в БД
EXISTING_VOLT_IDS = {
    (2, 'VL035'): 1,
    (2, 'VL110'): 2,
    (2, 'VL220'): 3,
    (2, 'VL330'): 4,
}

def parse_volt_class(raw):
    """Извлекает код класса напряжения (VL035, VL110, VL220, VL330) из ячейки."""
    if not raw:
        return None
    m = re.match(r'(VL\d+)', str(raw))
    return m.group(1) if m else None

# ── Шаг 1: Читаем линии из 2.XLSX ────────────────────────────────────────────
print(f'Читаем линии: {LINES_FILE}')
wb2 = openpyxl.load_workbook(LINES_FILE, data_only=True, read_only=True)
ws2 = wb2.active
lines_dict = {}

for i, row in enumerate(ws2.iter_rows(min_row=2, values_only=True)):
    code     = row[1]   # Техническое место
    name     = row[2]   # Название технического места
    be_raw   = str(row[7]).strip() if row[7] else ''
    volt_raw = row[11]  # Индикатор структуры

    if not code or be_raw not in BE_TO_FILIAL:
        continue
    vc = parse_volt_class(volt_raw)
    if not vc or vc not in VOLT_CLASS_MAP:
        continue

    lines_dict[str(code).strip()] = {
        'name':      str(name).strip() if name else str(code),
        'filialId':  BE_TO_FILIAL[be_raw],
        'voltClass': vc,
        'poleCount': 0,
    }

wb2.close()
print(f'  Найдено линий: {len(lines_dict)}')

# ── Шаг 2: Считаем опоры из 1.XLSX ───────────────────────────────────────────
print(f'Читаем опоры: {POLES_FILE}')
wb1 = openpyxl.load_workbook(POLES_FILE, data_only=True, read_only=True)
ws1 = wb1.active
pole_counts = collections.Counter()

for row in ws1.iter_rows(min_row=2, values_only=True):
    code = row[1]  # VL035-000002-001-1001
    if not code:
        continue
    parts = str(code).strip().split('-')
    if len(parts) >= 2:
        pole_counts[f'{parts[0]}-{parts[1]}'] += 1

wb1.close()

# Записываем количество опор в линии
matched = 0
for code, cnt in pole_counts.items():
    if code in lines_dict:
        lines_dict[code]['poleCount'] = cnt
        matched += 1

print(f'  Опор: {sum(pole_counts.values())}, линий с опорами: {matched} / {len(lines_dict)}')

# ── Шаг 3: Формируем новые VOLTAGES ──────────────────────────────────────────
needed_volt = set()
for d in lines_dict.values():
    needed_volt.add((d['filialId'], d['voltClass']))

volt_id_map = dict(EXISTING_VOLT_IDS)
new_voltages = []
next_volt_id = 6  # ID 1-5 заняты (Жлобин)

for fid in sorted({fid for fid, _ in needed_volt}):
    for vc in VOLT_ORDER:
        if (fid, vc) not in needed_volt:
            continue
        if (fid, vc) in volt_id_map:
            continue
        volt_id_map[(fid, vc)] = next_volt_id
        new_voltages.append({
            'id':       next_volt_id,
            'name':     VOLT_CLASS_MAP[vc],
            'filialId': fid,
        })
        next_volt_id += 1

print(f'\nНовых VOLTAGES: {len(new_voltages)}')
for v in new_voltages:
    print(f'  ID={v["id"]} filialId={v["filialId"]} name={v["name"]}')

# ── Шаг 4: Формируем список LINES ─────────────────────────────────────────────
sap_lines = []
for sap_code, d in sorted(
    lines_dict.items(),
    key=lambda x: (x[1]['filialId'], x[1]['voltClass'], x[0])
):
    vid = volt_id_map.get((d['filialId'], d['voltClass']))
    if vid is None:
        print(f'  WARN: нет voltageId для filial={d["filialId"]} volt={d["voltClass"]}, пропускаем {sap_code}')
        continue
    sap_lines.append({
        'sapCode':   sap_code,
        'name':      d['name'],
        'filialId':  d['filialId'],
        'voltageId': vid,
        'poleCount': d['poleCount'],
    })

print(f'\nЛиний для импорта: {len(sap_lines)}')
by_filial = collections.Counter(l['filialId'] for l in sap_lines)
FILIAL_NAMES = {1: 'Гомельские ЭС', 2: 'Жлобинские ЭС', 3: 'Мозырские ЭС', 4: 'Речицкие ЭС'}
for fid, cnt in sorted(by_filial.items()):
    print(f'  Филиал {fid} ({FILIAL_NAMES[fid]}): {cnt} линий')

# ── Шаг 5: Сохраняем JSON ─────────────────────────────────────────────────────
volt_out  = os.path.join(OUT_DIR, 'sap_new_voltages.json')
lines_out = os.path.join(OUT_DIR, 'sap_lines.json')

with open(volt_out, 'w', encoding='utf-8') as f:
    json.dump(new_voltages, f, ensure_ascii=False, indent=2)

with open(lines_out, 'w', encoding='utf-8') as f:
    json.dump(sap_lines, f, ensure_ascii=False, indent=2)

print(f'\nСохранено:')
print(f'  {volt_out}')
print(f'  {lines_out}')
print('\nТеперь запустите:')
print('  node scripts/import-sap-direct.js --dry-run')
print('  node scripts/import-sap-direct.js')
