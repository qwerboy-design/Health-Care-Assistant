'use client';

import { useState, useEffect } from 'react';
import { CustomerSettings } from '@/types';

/**
 * 自訂 Hook 用於管理客戶 UI 設定
 */
export function useCustomerSettings() {
  const [settings, setSettings] = useState<CustomerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 從 API 取得客戶設定
   */
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未找到認證令牌');
      }

      const res = await fetch('/api/customer-settings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || '取得設定失敗');
      }

      setSettings(data.data.settings);
    } catch (err) {
      console.error('取得客戶設定錯誤:', err);
      setError(err instanceof Error ? err.message : '取得設定失敗');
      // 設定預設值（全部隱藏）
      setSettings({
        id: '',
        customer_id: '',
        show_function_selector: false,
        show_workload_selector: false,
        show_screenshot: false,
        created_at: '',
        updated_at: '',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 更新客戶設定
   */
  const updateSettings = async (
    newSettings: Partial<Pick<CustomerSettings, 'show_function_selector' | 'show_workload_selector' | 'show_screenshot'>>
  ) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未找到認證令牌');
      }

      const res = await fetch('/api/customer-settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: newSettings }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || '更新設定失敗');
      }

      setSettings(data.data.settings);
      return true;
    } catch (err) {
      console.error('更新客戶設定錯誤:', err);
      setError(err instanceof Error ? err.message : '更新設定失敗');
      return false;
    }
  };

  // 初始化載入設定
  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
  };
}
