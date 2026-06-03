import { memo } from 'react';
import { LoginForm } from '@/features/Auth';
import { VStack } from '@/shared/ui/Stack';
import cls from './LoginPage.module.scss';

const LoginPage = () => (
  <div className={cls.page}>
    <VStack align='center'>
      <LoginForm />
    </VStack>
  </div>
);

export default memo(LoginPage);
