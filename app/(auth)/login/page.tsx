'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { OTPInput } from '@/components/auth/OTPInput';
import { CountdownTimer } from '@/components/auth/CountdownTimer';
import { useLocale } from '@/components/providers/LocaleProvider';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, setLocale, t } = useLocale();

  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [step, setStep] = useState<'input' | 'verify' | 'set-password'>('input');

  // 表單狀態
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  // UI 狀態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const s = searchParams.get('step');
    const e = searchParams.get('email');
    if (s === 'set-password') {
      setStep('set-password');
    }
    if (e) {
      setEmail(e);
    }
  }, [searchParams]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        // 儲存 token 到 localStorage（用於 API 呼叫）
        if (data.data.token) {
          localStorage.setItem('token', data.data.token);
        }
        
        if (data.data.requiresPasswordReset) {
          setStep('set-password');
          setError('');
          alert(t('login.firstTimeSetPassword'));
        } else {
          router.push('/chat');
          router.refresh();
        }
      } else {
        const errorMsg = data.error || t('login.errorLoginFailed');
        if (errorMsg.includes('待審核')) {
          setError(t('login.pendingApproval'));
        } else if (errorMsg.includes('已拒絕')) {
          setError(t('login.rejected'));
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      setError(t('login.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setStep('verify');
        setCanResend(false);
      } else {
        setError(data.error || t('login.errorSendFailed'));
      }
    } catch (err) {
      setError(t('login.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: otp }),
      });

      const data = await res.json();

      if (data.success) {
        // 儲存 token 到 localStorage
        if (data.data.token) {
          localStorage.setItem('token', data.data.token);
        }
        
        // OTP 登入成功，直接進入聊天室
        router.push('/chat');
        router.refresh();
      } else {
        const errorMsg = data.error || t('login.errorVerifyFailed');
        setOtp('');
        if (errorMsg.includes('待審核')) {
          setError(t('login.pendingApproval'));
        } else if (errorMsg.includes('已拒絕')) {
          setError(t('login.rejected'));
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      setError(t('login.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t('login.errorPasswordMismatch'));
      return;
    }
    if (password.length < 8) {
      setError(t('login.errorPasswordLength'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      const data = await res.json();

      if (data.success) {
        alert(t('login.setPasswordSuccess'));
        setStep('input');
        setLoginMethod('password');
        setPassword('');
        setConfirmPassword('');
        setError('');
      } else {
        setError(data.error || t('login.errorSetFailed'));
      }
    } catch (err) {
      setError(t('login.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-paper border border-paper-gray100 p-8 rounded-xl shadow-card relative">
        <div className="absolute top-4 right-4 flex gap-1">
          <button
            type="button"
            onClick={() => setLocale('zh-TW')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${locale === 'zh-TW' ? 'bg-terracotta text-white' : 'bg-paper-gray100 text-paper-gray700 hover:bg-paper-gray200'}`}
          >
            ZW
          </button>
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${locale === 'en' ? 'bg-terracotta text-white' : 'bg-paper-gray100 text-paper-gray700 hover:bg-paper-gray200'}`}
          >
            EN
          </button>
        </div>
        <div>
          <h2 className="text-center text-3xl font-bold text-paper-gray900 heading-serif">
            {step === 'set-password' ? t('login.titleSetPassword') : t('login.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-paper-gray700">
            {step === 'set-password' ? (
              t('login.subtitleSetPassword')
            ) : (
              <>
                {t('login.subtitle')}{' '}
                <a href="/register" className="font-medium text-terracotta hover:text-terracotta-deep">
                  {t('login.createAccount')}
                </a>
              </>
            )}
          </p>
        </div>

        {step !== 'set-password' && (
          <>
            {/* Google 登入 */}
            <div>
              <GoogleLoginButton
                onError={(err) => setError(err)}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-paper-gray100" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-paper text-paper-gray700">{t('login.orUse')}</span>
              </div>
            </div>

            {/* 登入方式選擇 */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setLoginMethod('password');
                  setStep('input');
                  setError('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${loginMethod === 'password'
                  ? 'bg-terracotta text-white'
                  : 'bg-paper-gray100 text-paper-gray900 hover:bg-paper-gray200'
                  }`}
              >
                {t('login.passwordLogin')}
              </button>
              <button
                onClick={() => {
                  setLoginMethod('otp');
                  setStep('input');
                  setError('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${loginMethod === 'otp'
                  ? 'bg-terracotta text-white'
                  : 'bg-paper-gray100 text-paper-gray900 hover:bg-paper-gray200'
                  }`}
              >
                {t('login.otpLogin')}
              </button>
            </div>
          </>
        )}

        {/* 密碼登入表單 */}
        {step === 'input' && loginMethod === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-paper-gray900">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field mt-1 block w-full"
                placeholder={t('login.placeholderEmail')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-paper-gray900">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field mt-1 block w-full"
                placeholder={t('login.placeholderPassword')}
              />
            </div>

            {error && (
              <p className="text-sm text-error text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? t('login.loggingIn') : t('login.submit')}
            </button>
          </form>
        )}

        {/* OTP 登入/驗證流程 */}
        {loginMethod === 'otp' && step !== 'set-password' && (
          <div className="space-y-4">
            {step === 'input' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label htmlFor="email-otp" className="block text-sm font-medium text-paper-gray900">
                    {t('login.email')}
                  </label>
                  <input
                    id="email-otp"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field mt-1 block w-full"
                    placeholder={t('login.placeholderEmail')}
                  />
                </div>

                {error && (
                  <p className="text-sm text-error text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? t('login.sending') : t('login.sendCode')}
                </button>
              </form>
            )}

            {step === 'verify' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-paper-gray700 text-center mb-4">
                    {t('login.codeSentTo')} <strong>{email}</strong>
                  </p>
                  <OTPInput
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      if (val.length === 6) {
                        handleVerifyOTP();
                      }
                    }}
                    error={!!error}
                  />
                </div>

                <div className="mt-4">
                  <button
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.length !== 6}
                    className="btn-primary w-full"
                  >
                    {loading ? t('login.verifying') : t('login.verifyAndContinue')}
                  </button>
                </div>

                {error && (
                  <p className="text-sm text-error text-center mt-2">{error}</p>
                )}

                <div className="text-center text-sm text-paper-gray700">
                  {canResend ? (
                    <button
                      onClick={handleSendOTP}
                      disabled={loading}
                      className="text-terracotta hover:text-terracotta-deep font-medium"
                    >
                      {t('login.resendCode')}
                    </button>
                  ) : (
                    <span>
                      {t('login.resendCode')} (<CountdownTimer seconds={120} onComplete={() => setCanResend(true)} />)
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    setStep('input');
                    setOtp('');
                    setError('');
                  }}
                  className="w-full py-2 text-sm text-paper-gray700 hover:text-paper-gray900"
                >
                  {t('login.back')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 新增密碼表單 */}
        {step === 'set-password' && (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <p className="text-sm text-paper-gray700 mb-4">
                {t('login.settingPasswordFor')} <strong>{email}</strong> {t('login.setPassword')}
              </p>
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-paper-gray900">
                {t('login.newPassword')}
              </label>
              <input
                id="new-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field mt-1 block w-full"
                placeholder={t('login.placeholderNewPassword')}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-paper-gray900">
                {t('login.confirmPassword')}
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field mt-1 block w-full"
                placeholder={t('login.placeholderConfirm')}
              />
            </div>

            {error && (
              <p className="text-sm text-error text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? t('login.processing') : t('login.setPasswordAndDone')}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('input');
                setLoginMethod('password');
                setError('');
              }}
              className="w-full py-2 text-sm text-paper-gray700 hover:text-paper-gray900"
            >
              {t('login.cancelBackToLogin')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function LoginLoadingFallback() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen flex items-center justify-center">
      {t('common.loading')}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}
