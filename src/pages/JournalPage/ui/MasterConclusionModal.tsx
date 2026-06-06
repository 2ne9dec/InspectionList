import { memo } from 'react';
import { Button, Modal } from '@/shared/ui';
import cls from './MasterConclusionModal.module.scss';

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
}

interface MasterConclusionModalProps {
  isOpen:      boolean;
  saving:      boolean;
  targetCount: number;
  conclusion:   string; setConclusion:   (v: string) => void;
  deadline:     string; setDeadline:     (v: string) => void;
  masterName:   string; setMasterName:   (v: string) => void;
  dateFixed:    string; setDateFixed:    (v: string) => void;
  workVolume:   string; setWorkVolume:   (v: string) => void;
  inspectorFix: string; setInspectorFix: (v: string) => void;
  onClose: () => void;
  onSave:  () => void;
}

export const MasterConclusionModal = memo((
{
  isOpen, saving, targetCount,
  conclusion, setConclusion,
  deadline, setDeadline,
  masterName, setMasterName,
  dateFixed, setDateFixed,
  workVolume, setWorkVolume,
  inspectorFix, setInspectorFix,
  onClose, onSave,
}: MasterConclusionModalProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    size='m'
    title={
      targetCount > 1
        ? `Заключение мастера — ${targetCount} дефекта`
        : 'Заключение мастера'
    }
    footer={
      <>
        <Button variant='secondary' size='m' onClick={onClose}>Отмена</Button>
        <Button variant='primary' size='m' onClick={onSave} loading={saving}
          disabled={saving}>
          Сохранить
        </Button>
      </>
    }
  >
    <div className={cls.form}>
      {targetCount > 1 && (
        <p className={cls.hint}>
          Заполненные поля применятся ко всем выбранным дефектам. Пустые поля останутся без изменений.
        </p>
      )}

      <div className={cls.field}>
        <label htmlFor='mc-conclusion' className={cls.label}>Мероприятия по устранению</label>
        <textarea id='mc-conclusion' name='mc-conclusion'
          className={cls.textarea} rows={2}
          value={conclusion} onChange={(e) => setConclusion(e.target.value)}
          placeholder='Описание мероприятий…'
        />
      </div>

      <div className={cls.row2}>
        <div className={cls.field}>
          <label htmlFor='mc-deadline' className={cls.label}>Срок устранения</label>
          <input id='mc-deadline' name='mc-deadline'
            className={`${cls.input} ${cls.dateField}`} type='date'
            value={deadline} onChange={(e) => setDeadline(e.target.value)}
            onClick={openPicker}
          />
        </div>
        <div className={cls.field}>
          <label htmlFor='mc-master-name' className={cls.label}>Эл. подпись мастера (Ф.И.О.)</label>
          <input id='mc-master-name' name='mc-master-name'
            className={cls.input} type='text' autoComplete='off'
            value={masterName} onChange={(e) => setMasterName(e.target.value)}
            placeholder='Фамилия И.О.'
          />
        </div>
      </div>

      <div className={cls.row2}>
        <div className={cls.field}>
          <label htmlFor='mc-date-fixed' className={cls.label}>Дата устранения</label>
          <input id='mc-date-fixed' name='mc-date-fixed'
            className={`${cls.input} ${cls.dateField}`} type='date'
            value={dateFixed} onChange={(e) => setDateFixed(e.target.value)}
            onClick={openPicker}
          />
        </div>
        <div className={cls.field}>
          <label htmlFor='mc-inspector-fix' className={cls.label}>Ф.И.О. производителя работ</label>
          <input id='mc-inspector-fix' name='mc-inspector-fix'
            className={cls.input} type='text' autoComplete='off'
            value={inspectorFix} onChange={(e) => setInspectorFix(e.target.value)}
            placeholder='Фамилия И.О.'
          />
        </div>
      </div>

      <div className={cls.field}>
        <label htmlFor='mc-work-volume' className={cls.label}>Объём выполненных работ</label>
        <textarea id='mc-work-volume' name='mc-work-volume'
          className={cls.textarea} rows={2}
          value={workVolume} onChange={(e) => setWorkVolume(e.target.value)}
          placeholder='Описание работ…'
        />
      </div>
    </div>
  </Modal>
));

MasterConclusionModal.displayName = 'MasterConclusionModal';
