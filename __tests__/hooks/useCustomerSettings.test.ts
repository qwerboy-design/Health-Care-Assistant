import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCustomerSettings } from '@/hooks/useCustomerSettings';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

describe('useCustomerSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  it('should fetch customer settings on mount', async () => {
    const mockSettings = {
      id: '123',
      customer_id: 'user-123',
      show_function_selector: true,
      show_workload_selector: true,
      show_screenshot: false,
      created_at: '2026-03-12T00:00:00Z',
      updated_at: '2026-03-12T00:00:00Z',
    };

    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { settings: mockSettings } }),
    });

    const { result } = renderHook(() => useCustomerSettings());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.settings).toBeNull();

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.settings).toEqual(mockSettings);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCustomerSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should set default values on error
    expect(result.current.settings).toEqual({
      id: '',
      customer_id: '',
      show_function_selector: false,
      show_workload_selector: false,
      show_screenshot: false,
      created_at: '',
      updated_at: '',
    });
    expect(result.current.error).toBe('Network error');
  });

  it('should update settings successfully', async () => {
    const mockSettings = {
      id: '123',
      customer_id: 'user-123',
      show_function_selector: false,
      show_workload_selector: false,
      show_screenshot: false,
      created_at: '2026-03-12T00:00:00Z',
      updated_at: '2026-03-12T00:00:00Z',
    };

    const updatedSettings = {
      ...mockSettings,
      show_function_selector: true,
    };

    // Mock initial fetch
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { settings: mockSettings } }),
    });

    const { result } = renderHook(() => useCustomerSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mock update fetch
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { settings: updatedSettings } }),
    });

    let updateResult: boolean = false;
    await act(async () => {
      updateResult = await result.current.updateSettings({
        show_function_selector: true,
      });
    });

    expect(updateResult).toBe(true);
    expect(result.current.settings).toEqual(updatedSettings);
  });

  it('should handle update error', async () => {
    const mockSettings = {
      id: '123',
      customer_id: 'user-123',
      show_function_selector: false,
      show_workload_selector: false,
      show_screenshot: false,
      created_at: '2026-03-12T00:00:00Z',
      updated_at: '2026-03-12T00:00:00Z',
    };

    // Mock initial fetch
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { settings: mockSettings } }),
    });

    const { result } = renderHook(() => useCustomerSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mock failed update
    (global.fetch as any).mockRejectedValueOnce(new Error('Update failed'));

    let updateResult: boolean = false;
    await act(async () => {
      updateResult = await result.current.updateSettings({
        show_function_selector: true,
      });
    });

    expect(updateResult).toBe(false);
    expect(result.current.error).toBe('Update failed');
  });

  it('should use default values when token is missing', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useCustomerSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should set default values when no token
    expect(result.current.settings).toEqual({
      id: '',
      customer_id: '',
      show_function_selector: false,
      show_workload_selector: false,
      show_screenshot: false,
      created_at: '',
      updated_at: '',
    });
  });
});
