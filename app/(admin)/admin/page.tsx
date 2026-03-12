'use client';

import { useState, useEffect } from 'react';
import { Customer } from '@/types';
import { useLocale } from '@/components/providers/LocaleProvider';

interface CustomerListItem extends Omit<Customer, 'password_hash'> {}

export default function AdminPage() {
  const { t } = useLocale();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  
  // 密碼重設相關狀態
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [passwordCustomerName, setPasswordCustomerName] = useState('');
  const [passwordCustomerEmail, setPasswordCustomerEmail] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [filter]);

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filter === 'pending') {
        params.append('pending_only', 'true');
      } else if (filter !== 'all') {
        params.append('status', filter);
      }

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setCustomers(data.data.customers || []);
      } else {
        setError(data.error || t('admin.loadFailed'));
      }
    } catch (err) {
      setError(t('common.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (customerId: string) => {
    setProcessing(customerId);
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: customerId }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchCustomers();
      } else {
        alert(data.error || t('admin.approveFailed'));
      }
    } catch (err) {
      alert(t('common.errorNetwork'));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (customerId: string) => {
    if (!confirm(t('admin.confirmReject'))) {
      return;
    }

    setProcessing(customerId);
    try {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: customerId }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchCustomers();
      } else {
        alert(data.error || t('admin.rejectFailed'));
      }
    } catch (err) {
      alert(t('common.errorNetwork'));
    } finally {
      setProcessing(null);
    }
  };

  const handleResetPassword = async (customerId: string, customerName: string, customerEmail: string) => {
    if (!confirm(t('admin.confirmResetPassword'))) {
      return;
    }

    setProcessing(customerId);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });

      const data = await res.json();

      if (data.success) {
        setTempPassword(data.data.temporaryPassword);
        setPasswordCustomerName(customerName);
        setPasswordCustomerEmail(customerEmail);
        setShowPasswordModal(true);
        setCopySuccess(false);
      } else {
        alert(data.error || t('admin.resetPasswordFailed'));
      }
    } catch (err) {
      alert(t('common.errorNetwork'));
    } finally {
      setProcessing(null);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: t('admin.statusPending'),
      approved: t('admin.statusApproved'),
      rejected: t('admin.statusRejected'),
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    return role === 'admin' ? (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        {t('admin.roleAdmin')}
      </span>
    ) : (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {t('admin.roleUser')}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.reviewTitle')}</h1>
        <p className="text-gray-600">{t('admin.reviewDesc')}</p>
      </div>

      <div className="mb-6 flex space-x-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('admin.filterPending')} ({customers.filter((c) => c.approval_status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'approved'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('admin.filterApproved')}
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'rejected'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('admin.filterRejected')}
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('admin.filterAll')}
        </button>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 用戶列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">{t('admin.loading')}</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">{t('admin.noUsers')}</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {customers.map((customer) => (
              <li key={customer.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {customer.name}
                      </h3>
                      {getStatusBadge(customer.approval_status)}
                      {getRoleBadge(customer.role)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">{t('admin.email')}:</span> {customer.email}
                      </p>
                      {customer.phone && (
                        <p>
                          <span className="font-medium">{t('admin.phone')}:</span> {customer.phone}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">{t('admin.registeredAt')}:</span>{' '}
                        {new Date(customer.created_at).toLocaleString('zh-TW')}
                      </p>
                      {customer.last_login_at && (
                        <p>
                          <span className="font-medium">{t('admin.lastLogin')}:</span>{' '}
                          {new Date(customer.last_login_at).toLocaleString('zh-TW')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 ml-4">
                    {/* 重設密碼按鈕（所有狀態都可用） */}
                    <button
                      onClick={() => handleResetPassword(customer.id, customer.name, customer.email)}
                      disabled={processing === customer.id}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                    >
                      {processing === customer.id ? t('admin.processing') : t('admin.resetPassword')}
                    </button>
                    
                    {/* 審核按鈕（僅 pending 狀態顯示） */}
                    {customer.approval_status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(customer.id)}
                          disabled={processing === customer.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {processing === customer.id ? t('admin.processing') : t('admin.approve')}
                        </button>
                        <button
                          onClick={() => handleReject(customer.id)}
                          disabled={processing === customer.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {processing === customer.id ? t('admin.processing') : t('admin.reject')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 密碼 Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t('admin.resetPasswordSuccess')}
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">{t('admin.email')}:</span> {passwordCustomerEmail}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-medium">姓名:</span> {passwordCustomerName}
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800 mb-2">
                  ⚠️ {t('admin.resetPasswordHint')}
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                <p className="text-xs text-gray-600 mb-2 font-medium">{t('admin.temporaryPassword')}:</p>
                <p className="text-2xl font-mono font-bold text-blue-600 break-all">
                  {tempPassword}
                </p>
              </div>

              <button
                onClick={handleCopyPassword}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
              >
                {copySuccess ? `✓ ${t('admin.passwordCopied')}` : t('admin.copyPassword')}
              </button>
            </div>

            <button
              onClick={() => setShowPasswordModal(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition font-medium"
            >
              {t('admin.closeModal')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
