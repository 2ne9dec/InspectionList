import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Flex } from './Flex/Flex';
import { HStack } from './HStack/HStack';
import { VStack } from './VStack/VStack';

describe('Stack', () => {
  it('рендерит Flex с содержимым и дополнительными атрибутами', () => {
    render(
      <Flex gap='4' justify='between' data-testid='flex'>
        <span>Первый</span>
        <span>Второй</span>
      </Flex>,
    );

    const flex = screen.getByTestId('flex');
    expect(flex).toHaveTextContent('Первый');
    expect(flex).toHaveTextContent('Второй');
    expect(flex.className).toMatch(/direction_row/);
    expect(flex.className).toMatch(/gap_4/);
  });

  it('VStack задаёт колонку', () => {
    render(<VStack data-testid='vstack'>Контент</VStack>);
    expect(screen.getByTestId('vstack').className).toMatch(/direction_column/);
  });

  it('HStack задаёт строку', () => {
    render(<HStack data-testid='hstack'>Контент</HStack>);
    expect(screen.getByTestId('hstack').className).toMatch(/direction_row/);
  });
});
