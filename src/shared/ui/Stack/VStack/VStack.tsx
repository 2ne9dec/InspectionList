import { memo } from 'react';
import { Flex } from '../Flex/Flex';
import type { FlexProps } from '../Flex/Flex';

export type VStackProps = Omit<FlexProps, 'direction'>;

/** Вертикальный стек элементов (alias for Flex direction=column). */
export const VStack = memo((props: VStackProps) => {
  const { align = 'start', ...rest } = props;
  return <Flex {...rest} direction="column" align={align} />;
});

VStack.displayName = 'VStack';
