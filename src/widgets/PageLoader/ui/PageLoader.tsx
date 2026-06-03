import { classNames } from '@/shared/lib/classNames/classNames';
import { Loader } from '@/shared/ui/Loader';
import cls from './PageLoader.module.scss';

export const PageLoader = () => (
  <div className={classNames(cls.wrapper)}>
    <Loader />
  </div>
);
