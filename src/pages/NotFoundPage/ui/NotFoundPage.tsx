import { memo } from 'react';
import { Button } from '@/shared/ui';
import { useNavigate } from 'react-router-dom';
import { getRouteSheets } from '@/shared/const/router';
import cls from './NotFoundPage.module.scss';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className={cls.page}>
      <div className={cls.content}>
        <span className={cls.code}>404</span>
        <h1 className={cls.title}>Страница не найдена</h1>
        <p className={cls.subtitle}>Такой страницы не существует или она была удалена</p>
        <Button variant='primary' size='m' onClick={() => navigate(getRouteSheets())} className={cls.btn}>
          На главную
        </Button>
      </div>
    </div>
  );
};

export default memo(NotFoundPage);
