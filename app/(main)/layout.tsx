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
  
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const localeValue = cookieStore.get('locale')?.value;
  const locale: Locale = localeValue === 'zh-TW' || localeValue === 'en' ? localeValue : DEFAULT_LOCALE;
  const t = getT(locale);

  if (!sessionToken) {
    redirect('/login');
  }

  const session = await verifySession(sessionToken);
  
  if (!session) {
    redirect('/login');
  }

  // 瑼Ｘ?臬??admin
  
  const userIsAdmin = await isAdmin(session.customerId);

  // ??瑼Ｘ customer 鞈?隞仿?霅?role
  
  const customer = await findCustomerById(session.customerId);

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

