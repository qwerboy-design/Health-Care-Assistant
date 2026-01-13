import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';

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
    location: 'app/(main)/layout.tsx:21',
    message: 'Session verification result',
    data: { hasSession: !!session, customerId: session?.customerId },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'K'
  };
  await fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData3) }).catch(() => {});
  // #endregion
  
  if (!session) {
    redirect('/login');
  }

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
