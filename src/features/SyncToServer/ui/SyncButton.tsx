import { memo, useState, useCallback } from 'react';
import { Button, Input, Modal, VStack, Text } from '@/shared/ui';
import { syncService } from '@/shared/lib/sync/syncService';
import { getPbServerUrl, setPbServerUrl } from '@/shared/lib/pocketbase/pbClient';
import cls from './SyncButton.module.scss';

type SyncStatus = 'idle' | 'loading' | 'success' | 'error';

export const SyncButton = memo(() => {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [showSettings, setShowSettings] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // Инициализируем при открытии чтобы всегда показывать актуальный URL
  const handleOpenSettings = useCallback(() => {
    setUrlInput(getPbServerUrl());
    setShowSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => setShowSettings(false), []);

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

  const handleSaveUrl = useCallback(() => {
    if (urlInput.trim()) {
      setPbServerUrl(urlInput.trim());
    }
  }, [urlInput]);

  const label =
    status === 'loading' ? 'Синхронизация...' :
    status === 'success' ? 'Синхронизировано ✓' :
    status === 'error'   ? 'Ошибка ✗' :
    'Синхронизировать';

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

      <Button
        variant='secondary'
        size='s'
        onClick={handleOpenSettings}
        title='Настройки сервера'
      >
        ⚙
      </Button>

      <Modal
        isOpen={showSettings}
        onClose={handleCloseSettings}
        title='Настройки сервера'
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
            name='pb-url'
            value={urlInput}
            onChange={setUrlInput}
            placeholder='http://192.168.X.X:8090'
          />
          <Text
            text={`Текущий: ${getPbServerUrl()}`}
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
