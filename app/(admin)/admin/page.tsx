'use client';

import { useState, useEffect } from 'react';
import { Customer } from '@/types';

interface CustomerListItem extends Omit<Customer, 'password_hash'> {}

export default function AdminPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);

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
        setError(data.error || '載入失敗');
      }
    } catch (err) {
      setError('網路錯誤，請稍後再試');
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
        alert(data.error || '審核失敗');
      }
    } catch (err) {
      alert('網路錯誤，請稍後再試');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (customerId: string) => {
    if (!confirm('確定要拒絕此帳號嗎？')) {
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
        alert(data.error || '拒絕失敗');
      }
    } catch (err) {
      alert('網路錯誤，請稍後再試');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: '待審核',
      approved: '已通過',
      rejected: '已拒絕',
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
        管理員
      </span>
    ) : (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        一般用戶
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">帳號審核管理</h1>
        <p className="text-gray-600">管理用戶帳號的審核狀態</p>
      </div>

      {/* 篩選器 */}
      <div className="mb-6 flex space-x-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          待審核 ({customers.filter((c) => c.approval_status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'approved'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          已通過
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'rejected'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          已拒絕
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          全部
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
          <p className="mt-2 text-gray-600">載入中...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">目前沒有用戶</p>
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
                        <span className="font-medium">Email:</span> {customer.email}
                      </p>
                      {customer.phone && (
                        <p>
                          <span className="font-medium">電話:</span> {customer.phone}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">註冊時間:</span>{' '}
                        {new Date(customer.created_at).toLocaleString('zh-TW')}
                      </p>
                      {customer.last_login_at && (
                        <p>
                          <span className="font-medium">最後登入:</span>{' '}
                          {new Date(customer.last_login_at).toLocaleString('zh-TW')}
                        </p>
                      )}
                    </div>
                  </div>
                  {customer.approval_status === 'pending' && (
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleApprove(customer.id)}
                        disabled={processing === customer.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {processing === customer.id ? '處理中...' : '通過'}
                      </button>
                      <button
                        onClick={() => handleReject(customer.id)}
                        disabled={processing === customer.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {processing === customer.id ? '處理中...' : '拒絕'}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
