import { cookies } from 'next/headers';
import { getT, DEFAULT_LOCALE, type Locale } from '@/lib/i18n/translations';

async function getLocaleFromCookie(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get('locale')?.value;
  if (value === 'zh-TW' || value === 'en') return value;
  return DEFAULT_LOCALE;
}

export default async function Home() {
  const locale = await getLocaleFromCookie();
  const t = getT(locale);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t('home.title')}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {t('home.description')}
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {t('home.login')}
          </a>
          <a
            href="/register"
            className="inline-block px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition"
          >
            {t('home.register')}
          </a>
        </div>
      </div>
    </div>
  );
}
