import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/app/providers/StoreProvider';

// Типизированная версия useDispatch — использовать вместо обычного useDispatch
export const useAppDispatch = () => useDispatch<AppDispatch>();
