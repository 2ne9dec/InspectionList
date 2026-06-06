import { memo, useEffect, useRef } from 'react';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { SEVERITY_LABELS, SEVERITY_COLORS } from '@/shared/const/severity';
import { Button } from '@/shared/ui';
import { IconClose, IconTasks, IconCheck, IconTrash } from '@/shared/ui/Icons';
import cls from './DefectSidebar.module.scss';

interface DefectSidebarProps {
  defect: DefectRecordFull | null;
  onClose: () => void;
  onFix?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export const DefectSidebar = memo(({ defect, onClose, onFix, onDelete }: DefectSidebarProps) => {
  const isOpen = !!defect;
  const sidebarRef = useRef<HTMLElement>(null);

  // Закрытие по Esc
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  // Закрытие при клике вне сайдбара
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // setTimeout чтобы не поймать тот же клик, который открыл панель
    const t = setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', h);
    };
  }, [isOpen, onClose]);

  return (
    <aside
      ref={sidebarRef}
      className={[cls.sidebar, isOpen ? cls.sidebarOpen : ''].join(' ')}
      aria-label='Детали дефекта'
    >
      {defect && (
        <>
          <div className={cls.header}>
            <div>
              <div className={cls.title}>Дефект #{defect.id}</div>
              <div className={cls.subtitle}>
                {defect.spanRange ? `Пролёты ${defect.spanRange}` : `Опора ${defect.poleNumber}`}
                {' · '}
                {defect.elementName}
              </div>
            </div>
            <Button variant='ghost' size='s' square onClick={onClose}
              aria-label='Закрыть'>
              <IconClose size={15} />
            </Button>
          </div>

          <div className={cls.body}>
            <span className={cls.severityBadge} style={{ background: SEVERITY_COLORS[defect.severity] }}>
              {SEVERITY_LABELS[defect.severity]}
            </span>

            <dl className={cls.fields}>
              <dt>Вид дефекта</dt>
              <dd>{defect.defectName}</dd>
              <dt>Элемент</dt>
              <dd>{defect.elementName}</dd>
              {defect.phaseName && (
                <>
                  <dt>Фаза</dt>
                  <dd>{defect.phaseName}</dd>
                </>
              )}
              {defect.insulatorCount != null && (
                <>
                  <dt>Изоляторов</dt>
                  <dd>{defect.insulatorCount} шт.</dd>
                </>
              )}
              <dt>Обнаружен</dt>
              <dd>
                {formatDate(defect.dateFound)} · {defect.inspectorFind}
              </dd>
              <dt>Статус</dt>
              <dd>
                {defect.isFixed ? (
                  <span className={cls.statusFixed}>
                    <IconTasks size={13} /> Устранён {defect.dateFixed ? `(${formatDate(defect.dateFixed)})` : ''}
                  </span>
                ) : (
                  <span className={cls.statusActive}>Активный</span>
                )}
              </dd>
              {defect.notes && (
                <>
                  <dt>Заметка</dt>
                  <dd className={cls.noteText}>{defect.notes}</dd>
                </>
              )}
            </dl>

            {!defect.isFixed && (
              <div className={cls.actions}>
                <Button variant='primary' size='s' fullWidth
                  leftIcon={<IconCheck size={13} />}
                  onClick={() => onFix?.(defect.id)}>
                  Отметить устранённым
                </Button>
                <Button
                  variant='danger'
                  size='s'
                  fullWidth
                  leftIcon={<IconTrash size={13} />}
                  onClick={() => {
                    onDelete?.(defect.id);
                    onClose();
                  }}
                >
                  Удалить дефект
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
});

DefectSidebar.displayName = 'DefectSidebar';
