'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/providers/LocaleProvider';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });

        const buttonDiv = document.getElementById('google-signin-button');
        if (buttonDiv) {
          window.google.accounts.id.renderButton(buttonDiv, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            locale: locale === 'en' ? 'en' : 'zh_TW',
          });
        }
      }
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [locale]);

  const handleCredentialResponse = async (response: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });

      const data = await res.json();

      if (data.success) {
        // 儲存 token 到 localStorage
        if (data.data.token) {
          localStorage.setItem('token', data.data.token);
        }
        
        onSuccess?.();
        router.push('/chat');
        router.refresh();
      } else {
        const errorMsg = data.error || t('common.googleLoginFailed');
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = t('common.errorNetwork');
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div id="google-signin-button" className="w-full" />
      {isLoading && (
        <p className="text-sm text-paper-gray700 text-center mt-2">{t('common.googleLoginLoading')}</p>
      )}
      {error && (
        <p className="text-sm text-error text-center mt-2">{error}</p>
      )}
    </div>
  );
}
