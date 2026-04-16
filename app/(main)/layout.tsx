import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';
import { findCustomerById } from '@/lib/supabase/customers';
import { getT, DEFAULT_LOCALE, type Locale } from '@/lib/i18n/translations';
import { AdminButton } from '@/components/admin/AdminButton';
import { LogoutButton } from '@/components/auth/LogoutButton';

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
  const localeValue = cookieStore.get('locale')?.value;
  const locale: Locale = localeValue === 'zh-TW' || localeValue === 'en' ? localeValue : DEFAULT_LOCALE;
  const t = getT(locale);

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
    <div className="min-h-screen bg-paper-gray50">
      <nav className="bg-paper border-b border-paper-gray100 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/chat" className="heading-serif text-xl font-bold text-terracotta hover:text-terracotta-deep transition-colors">
                {t('nav.appName')}
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/conversations"
                className="text-paper-gray700 hover:text-paper-gray900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {t('nav.conversations')}
              </a>
              {userIsAdmin && <AdminButton />}
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
