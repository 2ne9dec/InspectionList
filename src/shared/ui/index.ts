// shared/ui — публичный барель.
// Использование: import { Button, Modal, Input } from '@/shared/ui';

// Контролы
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';

export { Input } from './Input';
export type { InputProps, InputSize } from './Input';

export { Select } from './Select';
export type { SelectProps, SelectOption, SelectSize } from './Select';

export { MultiSelect } from './MultiSelect';
export type { MultiSelectProps } from './MultiSelect';

export { Combobox } from './Combobox';
export type { ComboboxProps, ComboboxOption } from './Combobox';

export { SearchInput } from './SearchInput';
export type { SearchInputProps } from './SearchInput';

export { FormField } from './FormField';
export type { FormFieldProps } from './FormField';

// Контейнеры / layout
export { Card } from './Card';
export type { CardProps, CardVariant, CardPadding } from './Card';

export { Flex, HStack, VStack } from './Stack';
export type {
  FlexProps, FlexJustify, FlexAlign, FlexDirection, FlexGap, FlexWrap,
  HStackProps, VStackProps,
} from './Stack';

// Оверлеи
export { Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

export { Portal } from './Portal';
export type { PortalProps } from './Portal';

export { Overlay } from './Overlay';
export type { OverlayProps } from './Overlay';

export { Dropdown } from './Dropdown';
export type { DropdownProps } from './Dropdown';

export { KebabMenu } from './KebabMenu';
export type { KebabMenuProps, KebabMenuItem } from './KebabMenu';

// Состояния
export { Loader } from './Loader';
export type { LoaderProps } from './Loader';

export { Spinner } from './Spinner';
export type { SpinnerProps, SpinnerSize } from './Spinner';

export { Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge';

// Доменные визуалы (severity)
export { SeverityDot } from './SeverityDot';
export type { SeverityDotProps } from './SeverityDot';
export { SeverityBadge } from './SeverityBadge';
export { ConfidenceBadge } from './ConfidenceBadge';
export type { SeverityBadgeProps } from './SeverityBadge';

// Типография
export { Text } from './Text';
export type { TextProps, TextVariant, TextAlign, TextSize, TextWeight } from './Text';

// Таблица
export { ThSort } from './ThSort';
export type { ThSortProps, SortDir } from './ThSort';
export { ThFilter } from './ThFilter';
export type { ThFilterProps, FilterOption } from './ThFilter';
// Вкладки
export { Tabs } from './Tabs';
export type { TabsProps, TabItem } from './Tabs';

export { ProgressRing } from './ProgressRing';

// Уведомления

export { Toaster } from './Toaster';

export { ConfirmModal, useConfirm } from './ConfirmModal';
export type { ConfirmModalProps, ConfirmVariant, UseConfirmOptions } from './ConfirmModal';

export * from './Icons';

export { SelectMenu } from './SelectMenu';
export type { SelectMenuOption } from './SelectMenu';
