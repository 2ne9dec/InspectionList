import { memo } from 'react';
import { Button, FormField, Input, Modal, Textarea } from '@/shared/ui';
import cls from './MasterConclusionModal.module.scss';

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

      <FormField label='Мероприятия по устранению' htmlFor='mc-conclusion'>
        <Textarea id='mc-conclusion' name='mc-conclusion'
          className={cls.textarea} rows={2}
          value={conclusion} onChange={(e) => setConclusion(e.target.value)}
          placeholder='Описание мероприятий…'
        />
      </FormField>

      <div className={cls.row2}>
        <FormField label='Срок устранения' htmlFor='mc-deadline'>
          <Input id='mc-deadline' name='mc-deadline' type='date'
            value={deadline} onChange={setDeadline} />
        </FormField>
        <FormField label='Эл. подпись мастера (Ф.И.О.)' htmlFor='mc-master-name'>
          <Input id='mc-master-name' name='mc-master-name' autoComplete='off'
            value={masterName} title={masterName || undefined}
            onChange={setMasterName} placeholder='Фамилия И.О.' />
        </FormField>
      </div>

      <div className={cls.row2}>
        <FormField label='Дата устранения' htmlFor='mc-date-fixed'>
          <Input id='mc-date-fixed' name='mc-date-fixed' type='date'
            value={dateFixed} onChange={setDateFixed} />
        </FormField>
        <FormField label='Ф.И.О. производителя работ' htmlFor='mc-inspector-fix'>
          <Input id='mc-inspector-fix' name='mc-inspector-fix' autoComplete='off'
            value={inspectorFix} title={inspectorFix || undefined}
            onChange={setInspectorFix} placeholder='Фамилия И.О.' />
        </FormField>
      </div>

      <FormField label='Объём выполненных работ' htmlFor='mc-work-volume'>
        <Textarea id='mc-work-volume' name='mc-work-volume'
          className={cls.textarea} rows={2}
          value={workVolume} onChange={(e) => setWorkVolume(e.target.value)}
          placeholder='Описание работ…'
        />
      </FormField>
    </div>
  </Modal>
));

MasterConclusionModal.displayName = 'MasterConclusionModal';
