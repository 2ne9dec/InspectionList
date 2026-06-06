import { memo, useEffect, useMemo, useState } from 'react';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { IconClose } from '@/shared/ui/Icons';
import cls from './DefectTimeline.module.scss';

// ── вспомогательные типы ──────────────────────────────────────────────────────
type EventKind = 'found' | 'note' | 'fixed';
interface TimelineEvent {
  kind: EventKind;
  date: string;
  createdAt?: string | null;
  label: string;
  actor?: string;
}

function buildEvents(d: DefectRecordFull): TimelineEvent[] {
  const evts: TimelineEvent[] = [];

  // 1. Найден
  evts.push({
    kind:      'found',
    date:      d.dateFound,
    createdAt: d.createdAt,
    label:     `${d.defectName} — опора ${d.poleNumber}`,
    actor:     d.inspectorFind,
  });

  // 2. Заметки (если есть)
  if (d.notes?.trim()) {
    evts.push({
      kind:  'note',
      date:  d.dateFound,        // заметки привязаны к дате находки
      label: d.notes.trim(),
      actor: d.inspectorFind,
    });
  }

  // 3. Исправлен
  if (d.isFixed && d.dateFixed) {
    evts.push({
      kind:  'fixed',
      date:  d.dateFixed,
      label: 'Дефект устранён',
      actor: d.inspectorFix ?? undefined,
    });
  }

  return evts;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

const KIND_LABEL: Record<EventKind, string> = {
  found: 'Обнаружен',
  note:  'Заметка',
  fixed: 'Устранён',
};

// ── компонент ─────────────────────────────────────────────────────────────────
interface DefectTimelineProps {
  defects: DefectRecordFull[];
  onClose: () => void;
}

export const DefectTimeline = memo(({ defects, onClose }: DefectTimelineProps) => {
  const [open, setOpen] = useState(false);

  // Анимация открытия
  useEffect(() => {
    const t = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Сортируем дефекты по дате нахождения
  const sorted = useMemo(
    () => [...defects].sort((a, b) => new Date(a.dateFound).getTime() - new Date(b.dateFound).getTime()),
    [defects],
  );

  return (
    <>
      <div className={cls.overlay} onClick={onClose} aria-hidden />
      <aside className={[cls.panel, open ? cls.panelOpen : ''].join(' ')} aria-label="Лента событий">

        <div className={cls.header}>
          <span className={cls.title}>Лента событий дефектов</span>
          <button className={cls.closeBtn} onClick={onClose} aria-label="Закрыть"><IconClose size={15} /></button>
        </div>

        <div className={cls.scroll}>
          {sorted.length === 0 ? (
            <p className={cls.empty}>Нет дефектов для отображения</p>
          ) : (
            <div className={cls.timeline}>
              {sorted.map((d) => {
                const events = buildEvents(d);
                return (
                  <div key={d.id} className={cls.defectBlock}>
                    <div className={cls.defectTitle}>
                      {d.elementName} · {d.defectName}
                      {d.phaseName ? ` · ${d.phaseName}` : ''}
                    </div>
                    <div className={cls.events}>
                      {events.map((ev, i) => (
                        <div
                          key={i}
                          className={[
                            cls.event,
                            ev.kind === 'found' ? cls.eventFound
                            : ev.kind === 'note' ? cls.eventNote
                            : cls.eventFixed,
                          ].join(' ')}
                        >
                          <div className={cls.eventKind}>{KIND_LABEL[ev.kind]}</div>
                          <div className={cls.eventDesc}>{ev.label}</div>
                          <div className={cls.eventMeta}>
                            {fmtDate(ev.date)}
                            {ev.createdAt ? ` · ${fmtTime(ev.createdAt)}` : ''}
                            {ev.actor ? ` · ${ev.actor}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </aside>
    </>
  );
});

DefectTimeline.displayName = 'DefectTimeline';
