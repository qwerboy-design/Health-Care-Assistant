'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        // 重定向到登入頁面
        router.push('/login');
        router.refresh();
      } else {
        console.error('登出失敗');
        // 即使失敗也重定向
        router.push('/login');
      }
    } catch (error) {
      console.error('登出錯誤:', error);
      // 即使錯誤也重定向
      router.push('/login');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
    >
      登出
    </button>
  );
}
