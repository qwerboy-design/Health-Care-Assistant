'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Power, PowerOff } from 'lucide-react';

interface Model {
  id: string;
  model_name: string;
  display_name: string;
  credits_cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    model_name: '',
    display_name: '',
    credits_cost: 0,
  });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/models', { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        setModels(data.data.models || []);
      } else {
        setError(data.error || '載入失敗');
      }
    } catch (err) {
      setError('網路錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        await fetchModels();
        setShowCreateModal(false);
        setFormData({ model_name: '', display_name: '', credits_cost: 0 });
        alert('模型創建成功');
      } else {
        alert(data.error || '創建失敗');
      }
    } catch (err) {
      alert('網路錯誤，請稍後再試');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: selectedModel.model_name,
          credits_cost: formData.credits_cost,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchModels();
        setShowEditModal(false);
        setSelectedModel(null);
        alert('定價更新成功');
      } else {
        alert(data.error || '更新失敗');
      }
    } catch (err) {
      alert('網路錯誤，請稍後再試');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeactivate = async (modelName: string) => {
    if (!confirm('確定要停用此模型嗎？')) {
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/models?model_name=${encodeURIComponent(modelName)}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        await fetchModels();
        alert('模型已停用');
      } else {
        alert(data.error || '停用失敗');
      }
    } catch (err) {
      alert('網路錯誤，請稍後再試');
    } finally {
      setProcessing(false);
    }
  };

  const handleActivate = async (modelName: string) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: modelName,
          is_active: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchModels();
        alert('模型已啟用');
      } else {
        alert(data.error || '啟用失敗');
      }
    } catch (err) {
      alert('網路錯誤，請稍後再試');
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (model: Model) => {
    setSelectedModel(model);
    setFormData({
      model_name: model.model_name,
      display_name: model.display_name,
      credits_cost: model.credits_cost,
    });
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    setFormData({ model_name: '', display_name: '', credits_cost: 0 });
    setShowCreateModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">模型管理</h1>
          <p className="text-gray-600">管理 AI 模型和定價</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus size={18} />
          新增模型
        </button>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 模型列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">載入中...</p>
        </div>
      ) : models.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">目前沒有模型</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {models.map((model) => (
              <li key={model.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {model.display_name}
                      </h3>
                      {model.is_active ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                          <Power size={12} />
                          啟用中
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 flex items-center gap-1">
                          <PowerOff size={12} />
                          已停用
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">模型名稱:</span> {model.model_name}
                      </p>
                      <p>
                        <span className="font-medium">Credits 費用:</span>{' '}
                        <span className="text-blue-600 font-semibold">{model.credits_cost}</span> Credits
                      </p>
                      <p>
                        <span className="font-medium">創建時間:</span>{' '}
                        {new Date(model.created_at).toLocaleString('zh-TW')}
                      </p>
                      <p>
                        <span className="font-medium">更新時間:</span>{' '}
                        {new Date(model.updated_at).toLocaleString('zh-TW')}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => openEditModal(model)}
                      disabled={processing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                    >
                      <Edit2 size={16} />
                      編輯定價
                    </button>
                    {model.is_active ? (
                      <button
                        onClick={() => handleDeactivate(model.model_name)}
                        disabled={processing}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                      >
                        <PowerOff size={16} />
                        停用
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(model.model_name)}
                        disabled={processing}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                      >
                        <Power size={16} />
                        啟用
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 創建模型 Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">新增模型</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    模型名稱 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.model_name}
                    onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如: claude-sonnet-4-20250514"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    顯示名稱 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如: Claude Sonnet 4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credits 費用 *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.credits_cost}
                    onChange={(e) => setFormData({ ...formData, credits_cost: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={processing}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? '創建中...' : '創建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 編輯定價 Modal */}
      {showEditModal && selectedModel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">編輯定價</h2>
            <form onSubmit={handleUpdatePricing}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    模型名稱
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedModel.model_name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    顯示名稱
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedModel.display_name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credits 費用 *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.credits_cost}
                    onChange={(e) => setFormData({ ...formData, credits_cost: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedModel(null);
                  }}
                  disabled={processing}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? '更新中...' : '更新'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
