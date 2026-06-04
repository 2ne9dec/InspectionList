import { memo, useState, useCallback } from 'react';
import { localDb } from '@/shared/lib/db/localDb';
import { Button } from '@/shared/ui';
import cls from './SyncButton.module.scss';

type SyncStatus = 'idle' | 'loading' | 'success' | 'error';

export const SyncButton = memo(() => {
  const [showModal, setShowModal] = useState(false);
  const [ip, setIp]               = useState('');
  const [status, setStatus]       = useState<SyncStatus>('idle');
  const [message, setMessage]     = useState('');

  const handleOpen  = useCallback(() => { setShowModal(true); setStatus('idle'); setMessage(''); }, []);
  const handleClose = useCallback(() => setShowModal(false), []);

  const handleSync = useCallback(async () => {
    const baseUrl = `http://${ip.trim()}:8443`;
    setStatus('loading');
    setMessage('');

    try {
      // 1. Отправляем листки осмотра
      const sheets = await localDb.sheets.toArray();
      for (const sheet of sheets) {
        await fetch(`${baseUrl}/inspectionSheets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sheet),
        });
      }

      // 2. Отправляем записи дефектов
      const defects = await localDb.defectRecords.toArray();
      for (const defect of defects) {
        await fetch(`${baseUrl}/defectRecords`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defect),
        });
      }

      setStatus('success');
      setMessage(`Отправлено: ${sheets.length} листков, ${defects.length} записей дефектов`);
    } catch {
      setStatus('error');
      setMessage('Не удалось подключиться к серверу. Проверьте IP и Wi-Fi.');
    }
  }, [ip]);

  return (
    <>
      <Button variant="secondary" size="s" onClick={handleOpen}>
        ⇅ Синхронизировать
      </Button>

      {showModal && (
        <div className={cls.overlay} onClick={handleClose}>
          <div className={cls.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={cls.title}>Синхронизация с сервером</h3>
            <p className={cls.hint}>Введите IP-адрес компьютера с сервером (ПК должен быть в той же Wi-Fi сети)</p>

            <input
              className={cls.input}
              type="text"
              placeholder="192.168.1.100"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              disabled={status === 'loading'}
            />

            {message && (
              <p className={`${cls.message} ${cls[status]}`}>{message}</p>
            )}

            <div className={cls.actions}>
              <Button variant="secondary" size="m" onClick={handleClose}>
                Отмена
              </Button>
              <Button
                variant="primary"
                size="m"
                onClick={handleSync}
                disabled={!ip.trim() || status === 'loading'}
                loading={status === 'loading'}
              >
                Отправить
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

SyncButton.displayName = 'SyncButton';
