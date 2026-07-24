import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { usePatchDefectBasicMutation, usePatchDefectNotesMutation } from '@/entities/DefectRecord';
import { Button, Input } from '@/shared/ui';
import { IconClose, IconTasks, IconCheck, IconTrash } from '@/shared/ui/Icons';
import cls from './DefectSidebar.module.scss';

interface DefectSidebarProps {
  defect: DefectRecordFull | null;
  /** Порядковый номер дефекта в листке (1-based). Если не передан — показывается id. */
  onClose: () => void;
  onFix?: (id: number) => void;
  onDelete?: (id: number) => void;
  /** Вызывается после успешного сохранения inspectorFind — чтобы родитель обновил состояние */
  onSaveInspector?: (id: number, value: string) => void;
}

export const DefectSidebar = memo(({ defect, onClose, onFix, onDelete, onSaveInspector }: DefectSidebarProps) => {
  const isOpen = !!defect;
  const sidebarRef = useRef<HTMLElement>(null);

  const [editingInspector, setEditingInspector] = useState(false);
  const [inspectorDraft,   setInspectorDraft]   = useState('');

  const [patchBasic,  { isLoading: saving }]      = usePatchDefectBasicMutation();
  const [patchNotes,  { isLoading: savingNotes }] = usePatchDefectNotesMutation();

  const [editingNotes,  setEditingNotes]  = useState(false);
  const [notesDraft,    setNotesDraft]    = useState('');
  const [currentNotes,  setCurrentNotes]  = useState<string | null | undefined>(undefined);

  // При смене дефекта — сбросить режим редактирования
  useEffect(() => {
    setEditingInspector(false);
    setInspectorDraft('');
    setEditingNotes(false);
    setNotesDraft('');
    setCurrentNotes(undefined);
  }, [defect?.id]);

  const handleEditInspector = useCallback(() => {
    setInspectorDraft(defect?.inspectorFind ?? '');
    setEditingInspector(true);
  }, [defect?.inspectorFind]);

  const handleSaveInspector = useCallback(async () => {
    if (!defect) return;
    const trimmed = inspectorDraft.trim();
    await patchBasic({ id: defect.id, inspectorFind: trimmed });
    onSaveInspector?.(defect.id, trimmed);
    setEditingInspector(false);
  }, [defect, inspectorDraft, patchBasic, onSaveInspector]);

  const handleEditNotes = useCallback(() => {
    setNotesDraft(defect?.notes ?? '');
    setEditingNotes(true);
  }, [defect?.notes]);

  const handleSaveNotes = useCallback(async () => {
    if (!defect) return;
    const trimmed = notesDraft.trim();
    await patchNotes({ id: defect.id, notes: trimmed });
    setCurrentNotes(trimmed || null);
    setEditingNotes(false);
  }, [defect, notesDraft, patchNotes]);

  // Закрытие по Esc
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingInspector) { setEditingInspector(false); return; }
        onClose();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose, editingInspector]);

  // Закрытие при клике вне сайдбара
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
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
                {formatDate(defect.dateFound)}
                {' · '}
                {editingInspector ? (
                  <span className={cls.inspectorEdit}>
                    <Input
                      size='s'
                      value={inspectorDraft}
                      onChange={setInspectorDraft}
                      placeholder='Фамилия И.О.'
                      autoFocus
                    />
                    <Button size='s' variant='primary' onClick={handleSaveInspector} loading={saving}>
                      ОК
                    </Button>
                    <Button size='s' variant='ghost' onClick={() => setEditingInspector(false)}>
                      ✕
                    </Button>
                  </span>
                ) : (
                  <span className={cls.inspectorValue}>
                    {defect.inspectorFind}
                    <button type='button' className={cls.editInspectorBtn} onClick={handleEditInspector}>Изменить</button>
                  </span>
                )}
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
              <dt>Примечание</dt>
              <dd className={cls.noteField}>
                {editingNotes ? (
                  <span className={cls.noteEditRow}>
                    <textarea
                      className={cls.notesTextarea}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder='Необязательно…'
                      rows={3}
                      autoFocus
                    />
                    <span className={cls.noteEditActions}>
                      <Button size='s' variant='primary' onClick={handleSaveNotes} loading={savingNotes}>ОК</Button>
                      <Button size='s' variant='ghost' onClick={() => setEditingNotes(false)}>✕</Button>
                    </span>
                  </span>
                ) : (
                  <span className={cls.noteValue}>
                    {(currentNotes !== undefined ? currentNotes : defect.notes)
                      ? <span>{currentNotes !== undefined ? currentNotes : defect.notes}</span>
                      : <span className={cls.notePlaceholder}>Добавить…</span>}
                    <button type='button' className={cls.editNoteBtn} onClick={handleEditNotes}>Изменить</button>
                  </span>
                )}
              </dd>
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
