'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { OTPInput } from '@/components/auth/OTPInput';
import { CountdownTimer } from '@/components/auth/CountdownTimer';

export default function LoginPage() {
  const [isAdminAccessible, setIsAdminAccessible] = useState(false);

  useEffect(() => {
    // 預先檢查 session 是否存在以及角色是否為 admin 可以導向後台，但這裡僅提供按鈕狀態控制
    // 後端實際授權由按鈕觸發時再驗證
  }, []);

  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [step, setStep] = useState<'input' | 'verify'>('input');
  
  // 表單狀態
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  // UI 狀態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(false);

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
        router.push('/chat');
        router.refresh();
      } else {
        const errorMsg = data.error || '登入失敗';
        setError(errorMsg);
        
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
        setError(data.error || '發送失敗');
      }
    } catch (err) {
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
        body: JSON.stringify({ email, token: otp }),
      });

      const data = await res.json();

      if (data.success) {
        router.push('/chat');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            登入臨床助手 AI
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            或{' '}
            <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              建立新帳號
            </a>
          </p>
        </div>

        {/* Google 登入 */}
        <div>
          <GoogleLoginButton 
            onError={(err) => setError(err)}
          />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">或使用</span>
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
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              loginMethod === 'password'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            密碼登入
          </button>
          <button
            onClick={() => {
              setLoginMethod('otp');
              setStep('input');
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              loginMethod === 'otp'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            OTP 登入
          </button>
        </div>

        {/* 密碼登入表單 */}
        {loginMethod === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密碼
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>
        )}

        {/* OTP 登入表單 */}
        {loginMethod === 'otp' && (
          <div className="space-y-4">
            {step === 'input' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label htmlFor="email-otp" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email-otp"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? '發送中...' : '發送驗證碼'}
                </button>
              </form>
            )}

            {step === 'verify' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 text-center mb-4">
                    驗證碼已發送到 <strong>{email}</strong>
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

                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}

                <div className="text-center text-sm text-gray-600">
                  {canResend ? (
                    <button
                      onClick={handleSendOTP}
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
        )}
      </div>
    </div>
  );
}
