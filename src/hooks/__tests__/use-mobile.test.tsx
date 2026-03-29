import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';

function createMatchMediaMock(matches: boolean) {
  return (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useIsMobile', () => {
  it('returns false for desktop viewport (> 768px)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: createMatchMediaMock(false),
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('returns true for mobile viewport (<= 768px)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: createMatchMediaMock(true),
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });
});
