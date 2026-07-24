import { memo, useState, useCallback } from 'react';
import { Button, Input, Modal, VStack, Text } from '@/shared/ui';
import { syncService } from '@/shared/lib/sync/syncService';
import { getApiUrl, setApiUrl } from '@/shared/lib/api/apiUrl';
import cls from './SyncButton.module.scss';

type SyncStatus = 'idle' | 'loading' | 'success' | 'error';

export const SyncButton = memo(() => {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [showSettings, setShowSettings] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleOpenSettings = useCallback(() => {
    setUrlInput(getApiUrl());
    setShowSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => setShowSettings(false), []);

  const handleSaveUrl = useCallback(() => {
    if (urlInput.trim()) {
      setApiUrl(urlInput.trim());
      window.location.reload();
    }
  }, [urlInput]);

  const handleSync = useCallback(async () => {
    setStatus('loading');
    try {
      await syncService.sync();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, []);

  const label =
    status === 'loading' ? 'Синхронизация...' :
    status === 'success' ? 'Синхронизировано ✓' :
    status === 'error'   ? 'Ошибка ✗' : 'Синхронизировать';

  return (
    <>
      <Button
        variant='secondary'
        size='s'
        onClick={handleSync}
        disabled={status === 'loading'}
      >
        {label}
      </Button>

      <Button variant='ghost' size='s' onClick={handleOpenSettings}>
        ⚙
      </Button>

      <Modal
        isOpen={showSettings}
        onClose={handleCloseSettings}
        title='Адрес сервера'
        size='s'
        footer={
          <>
            <Button variant='secondary' size='s' onClick={handleCloseSettings}>
              Отмена
            </Button>
            <Button variant='primary' size='s' onClick={handleSaveUrl}>
              Сохранить и перезагрузить
            </Button>
          </>
        }
      >
        <VStack gap='3'>
          <Input
            name='api-url'
            value={urlInput}
            onChange={setUrlInput}
            placeholder='http://192.168.100.12:8443'
          />
          <Text
            text={`Текущий: ${getApiUrl()}`}
            variant='muted'
            size='xs'
            className={cls.hint}
          />
        </VStack>
      </Modal>
    </>
  );
});

SyncButton.displayName = 'SyncButton';
