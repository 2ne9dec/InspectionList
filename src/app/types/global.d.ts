/// <reference types="vite/client" />

// ── CSS Modules ──────────────────────────────────────────────────────────────
declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.scss';
declare module '*.css';

// ── Статические ассеты ──────────────────────────────────────────────────────
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.webp';

declare module '*.svg' {
  import type { FC, SVGProps } from 'react';
  const SVG: FC<SVGProps<SVGSVGElement>>;
  export default SVG;
}

// ── Глобальные define-переменные (vite.config.ts) ───────────────────────────
declare const __IS_DEV__: boolean;
declare const __API__: string;
declare const __PROJECT__: 'frontend' | 'storybook';

// ── Утилитарные типы ────────────────────────────────────────────────────────
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

type OptionalRecord<K extends keyof any, T> = {
  [P in K]?: T;
};

// Извлечь тип значения из union или массива.
type ValueOf<T> = T[keyof T];

// Сделать поля required.
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

declare module 'recharts';
