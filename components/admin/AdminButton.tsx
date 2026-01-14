'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminButton() {
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
        alert(data.error || '權限不足或登入失效');
      }
    } catch (error) {
      console.error('Admin check 錯誤:', error);
      alert('檢查權限時發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <a
      href="/admin"
      onClick={handleClick}
      className={`text-red-600 hover:text-red-900 px-3 py-2 rounded-md text-sm font-medium font-semibold ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {loading ? '檢查中...' : '後台管理'}
    </a>
  );
}
