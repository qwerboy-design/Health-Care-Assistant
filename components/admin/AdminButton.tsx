'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/providers/LocaleProvider';

export function AdminButton() {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 先調用 admin-check API 進行驗證
      const response = await fetch('/api/auth/admin-check', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        // 驗證通過，導向後台
        router.push('/admin');
      } else {
        // 驗證失敗，顯示錯誤訊息
        const data = await response.json();
        alert(data.error || t('admin.permissionOrLoginFailed'));
      }
    } catch (error) {
      console.error('Admin check error:', error);
      alert(t('admin.checkPermissionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <a
      href="/admin"
      onClick={handleClick}
      className={`text-terracotta hover:text-terracotta-deep px-3 py-2 rounded-md text-sm font-medium font-semibold transition-colors ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {loading ? t('admin.checking') : t('admin.backendManagement')}
    </a>
  );
}
