import { memo } from 'react';
import { Flex } from '../Flex/Flex';
import type { FlexProps } from '../Flex/Flex';

export type HStackProps = Omit<FlexProps, 'direction'>;

/** Горизонтальный стек элементов (alias for Flex direction=row). */
export const HStack = memo((props: HStackProps) => <Flex {...props} direction="row" />);

HStack.displayName = 'HStack';
