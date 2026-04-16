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
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="text-center">
        <h1 className="heading-serif text-4xl font-bold text-paper-gray900 mb-4">
          {t('home.title')}
        </h1>
        <p className="text-lg text-paper-gray700 mb-8">
          {t('home.description')}
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="btn-primary inline-block"
          >
            {t('home.login')}
          </a>
          <a
            href="/register"
            className="btn-secondary inline-block"
          >
            {t('home.register')}
          </a>
        </div>
      </div>
    </div>
  );
}
