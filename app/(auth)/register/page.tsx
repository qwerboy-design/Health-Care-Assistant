'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { OTPInput } from '@/components/auth/OTPInput';
import { CountdownTimer } from '@/components/auth/CountdownTimer';

export default function RegisterPage() {
  const router = useRouter();
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

    const payload = registerMethod === 'password'
      ? formData
      : { email: formData.email, name: formData.name, phone: formData.phone };

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
          alert('註冊成功！您的帳號已建立，請等待管理員審核。審核通過後即可登入使用。');
          router.push('/login');
          router.refresh();
        }
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/(auth)/register/page.tsx:60', message: 'Registration failed', data: { error: data.error }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H' }) }).catch(() => { });
        // #endregion
        setError(data.error || '註冊失敗');
      }
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/(auth)/register/page.tsx:56', message: 'handleRegister catch error', data: { errorMessage: err instanceof Error ? err.message : String(err), errorStack: err instanceof Error ? err.stack : undefined }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'I' }) }).catch(() => { });
      // #endregion
      setError('網路錯誤，請稍後再試');
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
        // OTP 驗證成功，告知等待審核
        setError('');
        alert('驗證成功！您的帳號已建立，請等待管理員審核。審核通過後，系統將寄送預設密碼至您的 Email。');
        router.push('/login');
        router.refresh();
      } else {
        const errorMsg = data.error || '驗證失敗';
        setError(errorMsg);
        setOtp('');

        // 如果是審核相關錯誤，顯示更詳細的提示
        if (errorMsg.includes('待審核')) {
          setError('您的帳號正在等待管理員審核，審核通過後即可登入使用');
        } else if (errorMsg.includes('已拒絕')) {
          setError('您的帳號已被拒絕，如有疑問請聯繫管理員');
        }
      }
    } catch (err) {
      setError('網路錯誤，請稍後再試');
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
        setError(data.error || '發送失敗');
      }
    } catch (err) {
      setError('網路錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            註冊臨床助手 AI
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            或{' '}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              已有帳號？登入
            </a>
          </p>
        </div>

        {step === 'input' && (
          <>
            {/* Google 註冊 */}
            <div>
              <GoogleLoginButton onError={(err) => setError(err)} />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或使用 Email</span>
              </div>
            </div>

            {/* 註冊方式選擇 */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRegisterMethod('otp');
                  setError('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${registerMethod === 'otp'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                OTP 註冊
              </button>
              <button
                onClick={() => {
                  setRegisterMethod('password');
                  setError('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${registerMethod === 'password'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                密碼註冊
              </button>
            </div>

            {/* 註冊表單 */}
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  姓名
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="您的姓名"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  電話（選填）
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0912345678"
                />
              </div>

              {registerMethod === 'password' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    密碼
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="至少 8 個字元"
                  />
                  <p className="mt-1 text-xs text-gray-500">密碼至少需要 8 個字元</p>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? '處理中...' : '註冊'}
              </button>
            </form>
          </>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 text-center mb-4">
                驗證碼已發送到 <strong>{formData.email}</strong>
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
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? '驗證中...' : '驗證並完成註冊'}
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center mt-2">{error}</p>
            )}

            <div className="text-center text-sm text-gray-600">
              {canResend ? (
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  重新發送驗證碼
                </button>
              ) : (
                <span>
                  重新發送驗證碼 (<CountdownTimer seconds={120} onComplete={() => setCanResend(true)} />)
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setStep('input');
                setOtp('');
                setError('');
              }}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              返回
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
