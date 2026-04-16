'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { OTPInput } from '@/components/auth/OTPInput';
import { CountdownTimer } from '@/components/auth/CountdownTimer';
import { useLocale } from '@/components/providers/LocaleProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [registerMethod, setRegisterMethod] = useState<'password' | 'otp'>('otp');
  const [step, setStep] = useState<'input' | 'verify'>('input');

  // 表單狀態
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    password: '',
  });
  const [otp, setOtp] = useState('');

  // UI 狀態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const trimmedEmail = formData.email.trim();

    const payload =
      registerMethod === 'password'
        ? trimmedEmail.length > 0
          ? { ...formData, email: trimmedEmail }
          : { name: formData.name, phone: formData.phone, password: formData.password }
        : { email: trimmedEmail, name: formData.name, phone: formData.phone };

    try {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/(auth)/register/page.tsx:37', message: 'Before fetch to /api/auth/register', data: { payload }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H' }) }).catch(() => { });
      // #endregion
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/(auth)/register/page.tsx:44', message: 'Fetch response received', data: { status: res.status, statusText: res.statusText, ok: res.ok }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H' }) }).catch(() => { });
      // #endregion
      const data = await res.json();
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/(auth)/register/page.tsx:46', message: 'Response data parsed', data: { success: data.success, error: data.error, authProvider: data.data?.authProvider }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H' }) }).catch(() => { });
      // #endregion

      if (data.success) {
        if (registerMethod === 'otp') {
          // OTP 註冊：切換到驗證步驟
          setStep('verify');
          setError('');
        } else {
          // 密碼註冊：顯示成功訊息並導向登入
          setError('');
          alert(t('register.registerSuccess'));
          router.push('/login');
          router.refresh();
        }
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/(auth)/register/page.tsx:60', message: 'Registration failed', data: { error: data.error }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H' }) }).catch(() => { });
        // #endregion
        setError(data.error || t('register.errorRegisterFailed'));
      }
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/(auth)/register/page.tsx:56', message: 'handleRegister catch error', data: { errorMessage: err instanceof Error ? err.message : String(err), errorStack: err instanceof Error ? err.stack : undefined }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'I' }) }).catch(() => { });
      // #endregion
      setError(t('register.errorNetwork'));
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
        body: JSON.stringify({ email: formData.email, token: otp }),
      });

      const data = await res.json();

      if (data.success) {
        setError('');
        alert(t('register.verifySuccess'));
        router.push('/login');
        router.refresh();
      } else {
        const errorMsg = data.error || t('register.errorVerifyFailed');
        setOtp('');
        if (errorMsg.includes('待審核')) {
          setError(t('register.pendingApproval'));
        } else if (errorMsg.includes('已拒絕')) {
          setError(t('register.rejected'));
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      setError(t('register.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await res.json();

      if (data.success) {
        setCanResend(false);
      } else {
        setError(data.error || t('register.errorSendFailed'));
      }
    } catch (err) {
      setError(t('register.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-paper border border-paper-gray100 p-8 rounded-xl shadow-card">
        <div>
          <h2 className="text-center text-3xl font-bold text-paper-gray900 heading-serif">
            {t('register.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-paper-gray700">
            {t('register.subtitle')}{' '}
            <a href="/login" className="font-medium text-terracotta hover:text-terracotta-deep">
              {t('register.haveAccount')}
            </a>
          </p>
        </div>

        {step === 'input' && (
          <>
            <div>
              <GoogleLoginButton onError={(err) => setError(err)} />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-paper-gray100" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-paper text-paper-gray700">{t('register.orUseEmail')}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRegisterMethod('otp');
                  setError('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${registerMethod === 'otp'
                  ? 'bg-terracotta text-white'
                  : 'bg-paper-gray100 text-paper-gray900 hover:bg-paper-gray200'
                  }`}
              >
                {t('register.otpRegister')}
              </button>
              <button
                onClick={() => {
                  setRegisterMethod('password');
                  setError('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${registerMethod === 'password'
                  ? 'bg-terracotta text-white'
                  : 'bg-paper-gray100 text-paper-gray900 hover:bg-paper-gray200'
                  }`}
              >
                {t('register.passwordRegister')}
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-paper-gray900">
                  {t('register.name')}
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field mt-1 block w-full"
                  placeholder={t('register.placeholderName')}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-paper-gray900">
                  {t('register.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  required={registerMethod === 'otp'}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field mt-1 block w-full"
                  placeholder={t('register.placeholderEmail')}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-paper-gray900">
                  {t('register.phone')}
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field mt-1 block w-full"
                  placeholder={t('register.placeholderPhone')}
                />
              </div>

              {registerMethod === 'password' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-paper-gray900">
                    {t('register.password')}
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field mt-1 block w-full"
                    placeholder={t('register.placeholderPassword')}
                  />
                  <p className="mt-1 text-xs text-paper-gray700">{t('register.passwordHint')}</p>
                </div>
              )}

              {error && (
                <p className="text-sm text-error text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? t('register.processing') : t('register.submit')}
              </button>
            </form>
          </>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-paper-gray700 text-center mb-4">
                {t('register.codeSentTo')} <strong>{formData.email}</strong>
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
                {loading ? t('register.verifying') : t('register.verifyAndComplete')}
              </button>
            </div>

            {error && (
              <p className="text-sm text-error text-center mt-2">{error}</p>
            )}

            <div className="text-center text-sm text-paper-gray700">
              {canResend ? (
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-terracotta hover:text-terracotta-deep font-medium"
                >
                  {t('register.resendCode')}
                </button>
              ) : (
                <span>
                  {t('register.resendCode')} (<CountdownTimer seconds={120} onComplete={() => setCanResend(true)} />)
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
              {t('register.back')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
