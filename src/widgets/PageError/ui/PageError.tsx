import { memo } from 'react';
import { Button, Text, VStack } from '@/shared/ui';
import cls from './PageError.module.scss';

export const PageError = memo(() => (
  <div className={cls.page}>
    <VStack gap='4' align='center'>
      <Text title='Произошла непредвиденная ошибка' align='center' size='l' />
      <Button variant='secondary' onClick={() => window.location.reload()}>
        Обновить страницу
      </Button>
    </VStack>
  </div>
));

PageError.displayName = 'PageError';
