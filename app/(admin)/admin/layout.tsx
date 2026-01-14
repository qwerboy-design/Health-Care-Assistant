import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { findCustomerById } from '@/lib/supabase/customers';
import { LogoutButton } from '@/components/auth/LogoutButton';

/**
 * AdminLayout - 後台管理頁面保護
 * 每次請求都必須通過以下檢查：
 * 1. Session 是否存在
 * 2. Session 是否過期
 * 3. User 是否存在
 * 4. User role 是否為 admin
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 步驟 1: 檢查 Session 是否存在
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
    redirect('/login');
  }

  // 步驟 2: 驗證 Session 是否過期
  const session = await verifySession(sessionToken);
  
  if (!session) {
    redirect('/login');
  }

  // 步驟 3: 檢查 User 是否存在
  const customer = await findCustomerById(session.customerId);
  
  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">用戶不存在</h1>
          <p className="text-gray-600 mb-4">無法找到您的帳號資訊</p>
          <a
            href="/login"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            重新登入
          </a>
        </div>
      </div>
    );
  }

  // 步驟 4: 檢查 User role 是否為 admin
  if (customer.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">權限不足</h1>
          <p className="text-gray-600 mb-4">您沒有權限訪問此頁面。需要管理員權限。</p>
          <a
            href="/chat"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            返回首頁
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/admin" className="text-xl font-bold text-blue-600">
                後台管理系統
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/chat"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                返回前台
              </a>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
