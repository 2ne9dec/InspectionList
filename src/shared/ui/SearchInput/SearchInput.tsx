import { memo } from 'react';
import { Input } from '../Input';
import type { InputProps } from '../Input';
import { IconSearch } from '../Icons';

export interface SearchInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {
  /** Иконка слева (по-умолчанию SVG-лупа). */
  icon?: React.ReactNode;
}

/**
 * Удобный пресет для поисковых полей.
 */
export const SearchInput = memo((props: SearchInputProps) => {
  const { icon = <IconSearch size={14} />, placeholder = 'Поиск...', ...rest } = props;
  return <Input {...rest} type="search" leftIcon={icon} placeholder={placeholder} />;
});

SearchInput.displayName = 'SearchInput';
