import { memo, useState, useCallback } from 'react';
import { localDb } from '@/shared/lib/db/localDb';
import { Button, Input, Modal } from '@/shared/ui';
import cls from './SyncButton.module.scss';

type SyncStatus = 'idle' | 'loading' | 'success' | 'error';

export const SyncButton = memo(() => {
  const [isOpen,  setIsOpen]  = useState(false);
  const [ip,      setIp]      = useState('');
  const [status,  setStatus]  = useState<SyncStatus>('idle');
  const [message, setMessage] = useState('');

  const handleOpen  = useCallback(() => { setIsOpen(true); setStatus('idle'); setMessage(''); }, []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleSync = useCallback(async () => {
    const baseUrl = `http://${ip.trim()}:8443`;
    setStatus('loading');
    setMessage('');

    try {
      const sheets  = await localDb.sheets.toArray();
      const defects = await localDb.defectRecords.toArray();

      const res = await fetch(`${baseUrl}/sync/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheets, defectRecords: defects }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as {
        ok: boolean;
        sheetsUpserted: number;
        defectsUpserted: number;
        errors: { type: string; id: number; reason: string }[];
      };

      if (data.errors?.length) {
        setStatus('error');
        setMessage(`Частичная ошибка: ${data.errors.length} записей не синхронизировано`);
      } else {
        setStatus('success');
        setMessage(`Отправлено: ${data.sheetsUpserted} листков, ${data.defectsUpserted} записей дефектов`);
      }
    } catch {
      setStatus('error');
      setMessage('Не удалось подключиться к серверу. Проверьте IP и Wi-Fi.');
    }
  }, [ip]);

  return (
    <>
      <Button variant='secondary' size='s' onClick={handleOpen}>
        Синхронизировать
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size='s'
        title='Синхронизация с сервером'
        footer={
          <>
            <Button variant='secondary' size='m' onClick={handleClose}>Отмена</Button>
            <Button
              variant='primary'
              size='m'
              onClick={handleSync}
              disabled={!ip.trim() || status === 'loading'}
              loading={status === 'loading'}
            >
              Отправить
            </Button>
          </>
        }
      >
        <div className={cls.body}>
          <p className={cls.hint}>
            Введите IP-адрес компьютера с сервером (ПК должен быть в той же Wi-Fi сети)
          </p>
          <Input
            placeholder='192.168.1.100'
            value={ip}
            onChange={setIp}
            readonly={status === 'loading'}
          />
          {message && (
            <p className={`${cls.message} ${cls[status]}`}>{message}</p>
          )}
        </div>
      </Modal>
    </>
  );
});

SyncButton.displayName = 'SyncButton';
