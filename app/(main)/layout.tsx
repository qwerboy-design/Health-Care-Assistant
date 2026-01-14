import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';
import { findCustomerById } from '@/lib/supabase/customers';
import { AdminButton } from '@/components/admin/AdminButton';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // #region agent log
  const logData = {
    location: 'app/(main)/layout.tsx:5',
    message: 'MainLayout entry',
    data: {},
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'K'
  };
  await fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData) }).catch(() => {});
  // #endregion
  
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  // #region agent log
  const logData2 = {
    location: 'app/(main)/layout.tsx:12',
    message: 'Session token check',
    data: { hasToken: !!sessionToken },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'K'
  };
  await fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData2) }).catch(() => {});
  // #endregion

  if (!sessionToken) {
    redirect('/login');
  }

  const session = await verifySession(sessionToken);
  
  // #region agent log
  const logData3 = {
    location: 'app/(main)/layout.tsx:43',
    message: 'Session verification result',
    data: { hasSession: !!session, customerId: session?.customerId },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'A'
  };
  await fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData3) }).catch(() => {});
  // #endregion
  
  if (!session) {
    redirect('/login');
  }

  // 檢查是否為 admin
  // #region agent log
  const logData4 = {
    location: 'app/(main)/layout.tsx:58',
    message: 'Before isAdmin check',
    data: { customerId: session.customerId },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'B'
  };
  await fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData4) }).catch(() => {});
  // #endregion
  
  const userIsAdmin = await isAdmin(session.customerId);
  
  // #region agent log
  const logData5 = {
    location: 'app/(main)/layout.tsx:66',
    message: 'After isAdmin check',
    data: { userIsAdmin, customerId: session.customerId },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'B'
  };
  await fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData5) }).catch(() => {});
  // #endregion

  // 同時檢查 customer 資料以驗證 role
  // #region agent log
  const logData6 = {
    location: 'app/(main)/layout.tsx:75',
    message: 'Before findCustomerById',
    data: { customerId: session.customerId },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'C'
  };
  await fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData6) }).catch(() => {});
  // #endregion
  
  const customer = await findCustomerById(session.customerId);
  
  // #region agent log
  const logData7 = {
    location: 'app/(main)/layout.tsx:84',
    message: 'After findCustomerById',
    data: { 
      found: !!customer, 
      customerRole: customer?.role,
      customerId: customer?.id,
      isAdminResult: userIsAdmin
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'C'
  };
  await fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData7) }).catch(() => {});
  // #endregion

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/chat" className="text-xl font-bold text-blue-600">
                臨床助手 AI
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/conversations"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                對話記錄
              </a>
              {userIsAdmin && <AdminButton />}
              <form action="/api/auth/logout" method="POST" className="inline">
                <button
                  type="submit"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  登出
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
