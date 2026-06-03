/**
 * Библиотека SVG-иконок LineVision
 * Стиль: stroke-based, 24x24 viewBox, currentColor, strokeWidth=1.6, round caps/joins
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number): SVGProps<SVGSVGElement> => ({
  xmlns: 'http://www.w3.org/2000/svg',
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

// ── Навигация ────────────────────────────────────────────────────────────────

/** 🏠 Обзор / Dashboard */
export function IconHome({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

/** 📄 Листки осмотра */
export function IconSheet({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="4" y="2" width="16" height="20"
        rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="12" y2="16" />
    </svg>
  );
}

/** 🗺️ Карта */
export function IconMap({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

/** 📥 Загрузка фото */
export function IconUpload({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

/** 📷 Фото */
export function IconCamera({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

/** 🤖 AI / Обучение */
export function IconAI({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="7" width="18" height="13"
        rx="2" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2" />
      <circle cx="9" cy="13" r="1.2"
        fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="1.2"
        fill="currentColor" stroke="none" />
      <path d="M9 17c1 .8 2.2 1 3 1s2-.2 3-1" />
    </svg>
  );
}

/** ⚡ Линии ЛЭП — опора */
export function IconTower({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      {/* мачта */}
      <line x1="12" y1="22" x2="12" y2="3" />
      {/* верхняя поперечина */}
      <line x1="5" y1="7" x2="19" y2="7" />
      {/* нижняя поперечина */}
      <line x1="7" y1="11" x2="17" y2="11" />
      {/* подкосы верхней */}
      <line x1="12" y1="5" x2="5" y2="7" />
      <line x1="12" y1="5" x2="19" y2="7" />
      {/* ноги */}
      <line x1="12" y1="22" x2="7"  y2="22" />
      <line x1="12" y1="22" x2="17" y2="22" />
      <line x1="12" y1="17" x2="7"  y2="22" />
      <line x1="12" y1="17" x2="17" y2="22" />
      {/* провода */}
      <path d="M5 7 Q8.5 9 12 8.5 Q15.5 8 19 7" strokeWidth="1" opacity="0.7" />
      <path d="M7 11 Q9.5 13 12 12.5 Q14.5 12 17 11" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

/** ✅ Задачи */
export function IconTasks({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

// ── Действия ─────────────────────────────────────────────────────────────────

/** 🔍 Поиск */
export function IconSearch({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/** ✕ Закрыть */
export function IconClose({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/** ✓ Подтвердить / готово */
export function IconCheck({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/** ✏️ Редактировать */
export function IconEdit({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/** 🗑 Удалить */
export function IconTrash({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

/** 💾 Сохранить */
export function IconSave({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

/** 🔒 Пароль / безопасность */
export function IconLock({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="11" width="18" height="11"
        rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/** 📊 Статистика */
export function IconChart({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

/** ⚠️ Предупреждение / дефект */
export function IconWarning({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/** 📍 Опора / геолокация */
export function IconPin({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/** 📋 Буфер / листок / clipboard */
export function IconClipboard({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4"
        rx="1" ry="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}

/** 🔧 Инструмент / в работу */
export function IconWrench({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

/** 🌐 Все / глобально */
export function IconGlobe({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/** 📥 Экспорт / скачать */
export function IconDownload({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/** 🔗 Связь / insulator_string */
export function IconLink({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/** ➕ Добавить / crossarm */
export function IconPlus({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/** ⛶ / ↕ Полный экран */
export function IconFullscreen({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

/** ↙ Свернуть экран */
export function IconExitFullscreen({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

/** ⬆ Загрузка (прогресс) */
export function IconUploadProgress({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

/** 🔴 Активный дефект (circle) */
export function IconDot({ size = 8, color = 'currentColor', ...p }: IconProps & { color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" {...p}>
      <circle cx="4" cy="4" r="4" fill={color} />
    </svg>
  );
}

/** Выйти / logout */
export function IconLogout({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

/** Пользователь / профиль */
export function IconUser({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconCalendar({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="4" width="18" height="18"
        rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function IconChevron({ size = 10, open = true, ...p }: IconProps & { open?: boolean }) {
  return (
    <svg
      {...base(size)} {...p}
      style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .15s', ...(p as React.SVGProps<SVGSVGElement>).style }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
