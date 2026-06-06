import { memo, useState, useCallback, useRef } from 'react';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import type { DefectRecordFull } from '../model/types';
import { usePatchDefectNotesMutation } from '../api/defectsApi';
import { isOverdue, daysSince } from '@/shared/lib/helpers/isOverdue';
import { SEVERITY_LABELS, SEVERITY_COLORS } from '@/shared/const/severity';
import { IconWarning, IconClose, IconSave } from '@/shared/ui/Icons';
import cls from './DefectRow.module.scss';

interface DefectRowProps {
  record: DefectRecordFull;
  index: number;
  onFix?: (id: number) => void;
  onCopy?: (poleNumber: number) => void;
  onDelete?: (id: number) => void;
  onRowClick?: (defect: DefectRecordFull) => void;
}

export const DefectRow = memo((props: DefectRowProps) => {
  const { record, index, onFix, onCopy, onDelete, onRowClick } = props;

  const [editingNote, setEditingNote] = useState(false);
  const [noteVal, setNoteVal]         = useState(record.notes ?? '');
  const [patchNotes, { isLoading }]   = usePatchDefectNotesMutation();
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);

  const overdue       = !record.isFixed && isOverdue(record.dateFound);
  const days          = overdue ? daysSince(record.dateFound) : 0;
  const severityColor = SEVERITY_COLORS[record.severity];
  const severityLabel = SEVERITY_LABELS[record.severity];

  const handleNoteClick = useCallback(() => {
    setNoteVal(record.notes ?? '');
    setEditingNote(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [record.notes]);

  const handleNoteSave = useCallback(async () => {
    await patchNotes({ id: record.id, notes: noteVal });
    setEditingNote(false);
  }, [noteVal, patchNotes, record.id]);

  const handleNoteKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setEditingNote(false); setNoteVal(record.notes ?? ''); }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleNoteSave();
  }, [handleNoteSave, record.notes]);

  const colSpanFull = record.isFixed ? 9 : 8;

  return (
    <>
      <tr className={[cls.row, overdue ? cls.rowOverdue : ''].join(' ')} onClick={() => onRowClick?.(record)} style={onRowClick ? { cursor: 'pointer' } : undefined} title={onRowClick ? 'Нажмите для просмотра деталей' : undefined}>
        <td className={cls.cell}>{index}</td>
        <td className={cls.cell}>
          {record.poleNumber}
          {overdue && <span className={cls.overdueBadge} title={`Не устранён ${days} дней`}><IconWarning size={11} />{days}д</span>}
        </td>
        <td className={cls.cell}>{record.elementName}</td>
        <td className={cls.cell}>{record.defectName}</td>
        <td className={cls.cell}>
          <span className={cls.severityBadge} style={{ background: severityColor }}>
            {severityLabel}
          </span>
        </td>
        <td className={cls.cell}>{formatDate(record.dateFound)}</td>
        <td className={cls.cell}>{record.inspectorFind}</td>
        {record.isFixed && (
          <>
            <td className={cls.cell}>{record.dateFixed ? formatDate(record.dateFixed) : '—'}</td>
            <td className={cls.cell}>{record.inspectorFix ?? '—'}</td>
          </>
        )}
        {!record.isFixed && (
          <td className={cls.cell}>
            <div className={cls.actions}>
              <button className={cls.btnFix}    onClick={() => onFix?.(record.id)}>Устранить</button>
              <button className={cls.btnCopy}   onClick={() => onCopy?.(record.poleNumber)}>Копировать</button>
              <button className={cls.btnDelete} onClick={() => onDelete?.(record.id)}><IconClose size={13} /></button>
            </div>
          </td>
        )}
      </tr>

      {/* Строка с заметкой */}
      <tr className={cls.noteRow}>
        <td colSpan={colSpanFull} className={cls.noteCell}>
          {editingNote ? (
            <div className={cls.noteEditor}>
              <textarea
                ref={textareaRef}
                id='defect-note'
                name='defect-note'
                className={cls.noteTextarea}
                value={noteVal}
                onChange={(e) => setNoteVal(e.target.value)}
                onKeyDown={handleNoteKeyDown}
                placeholder="Введите заметку... (Ctrl+Enter — сохранить, Esc — отмена)"
                rows={2}
              />
              <div className={cls.noteEditorBtns}>
                <button className={cls.noteSaveBtn} onClick={handleNoteSave} disabled={isLoading}>
                  {isLoading ? '...' : <><IconSave size={13} /> Сохранить</>}
                </button>
                <button className={cls.noteCancelBtn} onClick={() => setEditingNote(false)}>Отмена</button>
              </div>
            </div>
          ) : (
            <button className={cls.noteToggle} onClick={handleNoteClick}>
              {record.notes
                ? <span className={cls.noteText}>{record.notes}</span>
                : <span className={cls.noteAdd}>+ заметка</span>}
            </button>
          )}
        </td>
      </tr>
    </>
  );
});

DefectRow.displayName = 'DefectRow';
