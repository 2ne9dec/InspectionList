import { memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/shared/lib/hooks';
import { loginByUsername } from '../model/loginThunk';
import { getRouteSheets } from '@/shared/const/router';
import { Button, Input, PasswordInput, Select, VStack } from '@/shared/ui';
import { LOGIN_FILIALS } from '@/shared/const/filials';
import cls from './LoginForm.module.scss';

export const LoginForm = memo(() => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Филиал выбирают все, кроме администратора системы; при загрузке не выбран
  const [filial, setFilial] = useState('');

  const handleLogin = useCallback(async () => {
    if (!username.trim() || !password.trim()) {
      setError('Введите логин и пароль');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Без филиала входит только администратор системы — остальным сервер ответит «Выберите филиал»
      await dispatch(loginByUsername({ username: username.trim(), password, filialId: filial || undefined })).unwrap();
      navigate(getRouteSheets(), { replace: true });
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : 'Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  }, [dispatch, navigate, username, password, filial]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') void handleLogin();
    },
    [handleLogin],
  );

  return (
    <VStack gap='4' className={cls.form}>
      <div className={cls.brand}>
        <span className={cls.brandLine}>Листки</span><span className={cls.brandVision}>осмотра</span>
        <svg className={cls.brandIcon} viewBox="0 0 60 82" overflow="visible">
          {/* Центральная мачта */}
          <line className={`${cls.draw} ${cls.brandSteel} ${cls.sw22} ${cls.d1}`}
            x1="30" y1="78" x2="30" y2="6" />
          {/* Навершие Т */}
          <line className={`${cls.draw} ${cls.brandSteel} ${cls.sw18} ${cls.d1}`}
            x1="22" y1="7" x2="38" y2="7" />
          {/* Перекладина верхняя */}
          <line className={`${cls.draw} ${cls.brandSteel} ${cls.sw18} ${cls.d2}`}
            x1="8" y1="26" x2="52" y2="26" />
          {/* Перекладина нижняя */}
          <line className={`${cls.draw} ${cls.brandSteel} ${cls.sw16} ${cls.d2}`}
            x1="13" y1="40" x2="47" y2="40" />
          {/* Подкосы к верхней */}
          <line className={`${cls.draw} ${cls.brandSteelLight} ${cls.sw12} ${cls.d3}`}
            x1="30" y1="20" x2="8" y2="26" />
          <line className={`${cls.draw} ${cls.brandSteelLight} ${cls.sw12} ${cls.d3}`}
            x1="30" y1="20" x2="52" y2="26" />
          {/* Подкосы к нижней */}
          <line className={`${cls.draw} ${cls.brandSteelLight} ${cls.sw10} ${cls.d3}`}
            x1="30" y1="34" x2="13" y2="40" />
          <line className={`${cls.draw} ${cls.brandSteelLight} ${cls.sw10} ${cls.d3}`}
            x1="30" y1="34" x2="47" y2="40" />
          {/* Ноги */}
          <line className={`${cls.draw} ${cls.brandSteel} ${cls.sw16} ${cls.d4}`}
            x1="30" y1="54" x2="14" y2="78" />
          <line className={`${cls.draw} ${cls.brandSteel} ${cls.sw16} ${cls.d4}`}
            x1="30" y1="54" x2="46" y2="78" />
          {/* Основание */}
          <line className={`${cls.draw} ${cls.brandSteel} ${cls.sw20} ${cls.d4}`}
            x1="14" y1="78" x2="46" y2="78" />
          {/* Провода */}
          <path className={`${cls.draw} ${cls.brandWire} ${cls.sw14} ${cls.d5}`}
            d="M8,26 Q-4,34 -10,32" />
          <path className={`${cls.draw} ${cls.brandWire} ${cls.sw14} ${cls.d5}`}
            d="M52,26 Q64,34 70,32" />
          <path className={`${cls.draw} ${cls.brandWire} ${cls.sw12} ${cls.d5}`}
            d="M13,40 Q-1,47 -8,45" />
          <path className={`${cls.draw} ${cls.brandWire} ${cls.sw12} ${cls.d5}`}
            d="M47,40 Q61,47 68,45" />
          {/* Маяк-огонёк на вершине */}
          <circle className={`${cls.pulse} ${cls.brandBeacon}`}
            cx="30" cy="6" r="2.8" />
        </svg>
      </div>
      {error && (
        <div className={cls.error} role='alert'>
          {error}
        </div>
      )}
      <Select<string>
        id='login-filial'
        className={cls.filialSelect}
        name='filial'
        aria-label='Филиал'
        options={LOGIN_FILIALS}
        value={filial}
        placeholder='Филиал'
        onChange={(v) => {
          // Другой филиал — другая учётная запись: очищаем логин, пароль и ошибку
          setFilial(String(v));
          setUsername('');
          setPassword('');
          setError('');
        }}
      />

      <Input
        id='login-username'
        name='il-login'
        placeholder='Логин'
        value={username}
        onChange={setUsername}
        // Не подставлять сохранённые браузером логин и пароль при загрузке
        autoComplete='off'
        onKeyDown={handleKeyDown}
      />

      <PasswordInput
        id='login-password'
        name='il-secret'
        placeholder='Пароль'
        value={password}
        onChange={setPassword}
        autoComplete='new-password'
        onKeyDown={handleKeyDown}
      />
      <Button variant='primary' size='l' fullWidth loading={loading}
onClick={handleLogin} type='submit'>
        {loading ? 'Входим…' : 'Войти'}
      </Button>
    </VStack>
  );
});

LoginForm.displayName = 'LoginForm';
