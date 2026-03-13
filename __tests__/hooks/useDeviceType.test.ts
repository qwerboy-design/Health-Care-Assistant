import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDeviceType } from '@/hooks/useDeviceType';

describe('useDeviceType', () => {
  const originalInnerWidth = window.innerWidth;
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: originalUserAgent,
    });
  });

  it('should detect mobile by screen width (<768px)', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const { result } = renderHook(() => useDeviceType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('should detect desktop by screen width (>=768px)', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useDeviceType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it('should detect mobile by User-Agent (iPhone)', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024, // Desktop width
    });

    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    });

    const { result } = renderHook(() => useDeviceType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should be mobile due to User-Agent
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('should detect mobile by User-Agent (Android)', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 11; SM-G991B)',
    });

    const { result } = renderHook(() => useDeviceType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isMobile).toBe(true);
  });

  it('should detect desktop when both checks fail', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });

    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });

    const { result } = renderHook(() => useDeviceType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it('should update on window resize', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024, // Desktop
    });

    const { result, rerender } = renderHook(() => useDeviceType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isMobile).toBe(false);

    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
    rerender();

    await waitFor(() => {
      expect(result.current.isMobile).toBe(true);
    });
  });

  it('should handle edge case at 768px boundary', async () => {
    // Exactly at boundary should be desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useDeviceType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it('should handle edge case at 767px', async () => {
    // One pixel below boundary should be mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 767,
    });

    const { result } = renderHook(() => useDeviceType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });
});
