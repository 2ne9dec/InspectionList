import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { makeDefect } from '@tests/factories';
import { useDefectTableView } from './useDefectTableView';

type PoleGroup = [string, DefectRecordFull[]];

const makeGroups = (count: number): PoleGroup[] =>
  Array.from(
    { length: count },
    (_, i) => [`pole-${i}`, [makeDefect({ id: i + 1, poleNumber: i + 1 })]] as PoleGroup,
  );

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = '';
  thresholds = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  emit(isIntersecting = true) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

let latest: ReturnType<typeof useDefectTableView>;
const originalMatchMedia = window.matchMedia;

function Harness({
  groups,
  filtersKey = 'filters',
  onFix,
}: {
  groups: PoleGroup[];
  filtersKey?: string;
  onFix: (locationKey: string) => void;
}) {
  latest = useDefectTableView({ groupedByPole: groups, filtersKey, onFix });
  return (
    <div ref={latest.tableWrapperRef}>
      <div ref={latest.sentinelRef} data-testid="sentinel" />
    </div>
  );
}

describe('useDefectTableView', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.unstubAllGlobals();
  });

  it('показывает первые 50 опор и сообщает о наличии остальных', () => {
    render(<Harness groups={makeGroups(60)} onFix={vi.fn()} />);

    expect(latest.visibleGroups).toHaveLength(50);
    expect(latest.visibleGroups[0][0]).toBe('pole-0');
    expect(latest.hasMore).toBe(true);
  });

  it('не считает, что есть ещё, если опор не больше страницы', () => {
    render(<Harness groups={makeGroups(50)} onFix={vi.fn()} />);

    expect(latest.visibleGroups).toHaveLength(50);
    expect(latest.hasMore).toBe(false);
  });

  it('раскрывает и сворачивает опору', () => {
    render(<Harness groups={makeGroups(3)} onFix={vi.fn()} />);

    act(() => latest.handleToggleExpand('pole-1'));
    expect(latest.expandedPoles.has('pole-1')).toBe(true);
    expect(latest.anyExpanded).toBe(true);

    act(() => latest.handleToggleExpand('pole-2'));
    expect(latest.expandedPoles.size).toBe(2);

    act(() => latest.handleToggleExpand('pole-1'));
    expect(latest.expandedPoles.has('pole-1')).toBe(false);
    expect(latest.expandedPoles.has('pole-2')).toBe(true);

    act(() => latest.resetExpanded());
    expect(latest.expandedPoles.size).toBe(0);
    expect(latest.anyExpanded).toBe(false);
  });

  it('передаёт ключ места при устранении дефекта и игнорирует неизвестный id', () => {
    const onFix = vi.fn();
    const groups: PoleGroup[] = [
      ['pole-1', [makeDefect({ id: 11, poleNumber: 1 })]],
      ['pole-2', [makeDefect({ id: 22, poleNumber: 2 })]],
    ];
    render(<Harness groups={groups} onFix={onFix} />);

    act(() => latest.handleFixOne(22));
    expect(onFix).toHaveBeenCalledWith('pole-2');

    act(() => latest.handleFixOne(999));
    expect(onFix).toHaveBeenCalledTimes(1);
  });

  it('догружает опоры по IntersectionObserver и останавливается на конце', () => {
    render(<Harness groups={makeGroups(120)} onFix={vi.fn()} />);

    expect(latest.hasMore).toBe(true);
    const observer = MockIntersectionObserver.instances[0];
    expect(observer).toBeDefined();

    act(() => observer.emit());
    expect(latest.visibleGroups).toHaveLength(100);
    expect(latest.hasMore).toBe(true);

    act(() => observer.emit());
    expect(latest.visibleGroups).toHaveLength(120);
    expect(latest.hasMore).toBe(false);
  });

  it('сбрасывает раскрытие и пагинацию при смене фильтров', () => {
    const groups = makeGroups(120);
    const { rerender } = render(<Harness groups={groups} filtersKey="a" onFix={vi.fn()} />);

    act(() => MockIntersectionObserver.instances[0].emit());
    act(() => latest.handleToggleExpand('pole-3'));
    expect(latest.visibleGroups).toHaveLength(100);
    expect(latest.anyExpanded).toBe(true);

    rerender(<Harness groups={groups} filtersKey="b" onFix={vi.fn()} />);

    expect(latest.visibleGroups).toHaveLength(50);
    expect(latest.expandedPoles.size).toBe(0);
    expect(latest.anyExpanded).toBe(false);
  });

  it('показывает все опоры, если после загрузки появилась новая опора за пределами окна', () => {
    const { rerender } = render(<Harness groups={makeGroups(50)} onFix={vi.fn()} />);

    expect(latest.hasMore).toBe(false);

    rerender(<Harness groups={makeGroups(51)} onFix={vi.fn()} />);

    expect(latest.visibleGroups).toHaveLength(51);
  });
});
