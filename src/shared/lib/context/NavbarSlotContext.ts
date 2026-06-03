import { createContext } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';

/**
 * Контекст для инжекции слота в Navbar.
 * Страница сама регистрирует своё содержимое через useEffect,
 * App.tsx перестаёт знать о конкретных страницах — FSD соблюдён.
 *
 * Использование:
 *   // В странице:
 *   const setNavbarSlot = useContext(NavbarSlotContext);
 *   useEffect(() => {
 *     setNavbarSlot(<MySlot />);
 *     return () => setNavbarSlot(null);
 *   }, [setNavbarSlot]);
 */
export const NavbarSlotContext = createContext<Dispatch<SetStateAction<ReactNode>>>(() => {});
