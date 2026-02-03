'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { DebugInfo } from './debug-info';

export default function TestRealtimePage() {
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' }>({
    message: '⏳ 正在連接...',
    type: 'info',
  });
  const [logs, setLogs] = useState<Array<{ time: string; msg: string }>>([
    { time: '[啟動中]', msg: '等待事件...' },
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('zh-TW');
    setLogs((prev) => [...prev, { time, msg }]);
    console.log(`[${time}] ${msg}`);
  };

  const updateStatus = (message: string, type: 'success' | 'error' | 'info') => {
    setStatus({ message, type });
  };

  useEffect(() => {
    addLog('🔌 開始建立 Realtime 連接（使用 .env 環境變數）...');

    const channel = supabase
      .channel('model_pricing_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'model_pricing',
        },
        (payload) => {
          addLog(`🎯 收到 ${payload.eventType} 事件`);
          addLog(`📦 資料: ${JSON.stringify(payload.new || payload.old)}`);
          updateStatus('✅ Realtime 運作正常 - 剛收到事件！', 'success');
        }
      )
      .subscribe((subStatus) => {
        addLog(`📡 訂閱狀態: ${subStatus}`);

        if (subStatus === 'SUBSCRIBED') {
          updateStatus('✅ Realtime 已連接並訂閱成功', 'success');
          addLog('✅ 成功訂閱 model_pricing 表格變更');
          addLog('💡 現在可以在後台更新模型，這裡會即時顯示變更');
        } else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') {
          updateStatus(`❌ 連接失敗：${subStatus}`, 'error');
          addLog('❌ 訂閱失敗，請檢查：');
          addLog('  1. 執行 migration 005：model_pricing 是否已加入 supabase_realtime publication');
          addLog('  2. Supabase Dashboard → Database → Publications 確認');
          addLog('  3. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 是否正確');
        } else {
          updateStatus(`⏳ 連接中：${subStatus}`, 'info');
        }
      });

    addLog('📖 測試讀取 model_pricing 表格...');
    supabase
      .from('model_pricing')
      .select('*')
      .then(({ data, error }) => {
        if (error) {
          addLog(`❌ 讀取失敗: ${error.message}`);
        } else {
          addLog(`✅ 成功讀取 ${data?.length ?? 0} 個模型`);
          data?.forEach((m: { display_name: string; model_name: string; credits_cost: number }) => {
            addLog(`  - ${m.display_name} (${m.model_name}): ${m.credits_cost} Credits`);
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const statusColors = {
    success: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-bold text-gray-800 border-b-2 border-green-500 pb-2 mb-4">
          🔄 Supabase Realtime 連接測試
        </h1>
        <p className="text-sm text-gray-600 mb-2">
          本頁面使用專案 .env 的 NEXT_PUBLIC_SUPABASE_* 變數，無需手動更新憑證。
        </p>

        <div
          className={`p-4 rounded-lg border mb-4 font-medium ${statusColors[status.type]}`}
          data-testid="realtime-status"
        >
          {status.message}
        </div>

        <h2 className="text-lg font-semibold text-gray-700 mb-2">即時事件日誌</h2>
        <div className="bg-gray-50 border rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className="py-1 border-b border-gray-200 last:border-0">
              <span className="text-gray-500">[{log.time}]</span> {log.msg}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setLogs([{ time: '[清除]', msg: '日誌已清除' }])}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            清除日誌
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            重新連接
          </button>
          <Link
            href="/admin/models"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            後台模型管理
          </Link>
        </div>

        <h2 className="text-lg font-semibold text-gray-700 mt-6 mb-2">測試步驟</h2>
        <ol className="list-decimal list-inside space-y-1 text-gray-600">
          <li>確認上方狀態顯示為「✅ Realtime 已連接並訂閱成功」</li>
          <li>開啟後台管理頁面：/admin/models（需先登入管理員帳號）</li>
          <li>更新任何模型的定價或狀態</li>
          <li>觀察本頁面的日誌是否即時顯示變更事件</li>
        </ol>

        <p className="mt-4 text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
          ⚠️ 若狀態為「連接失敗」，請在 Supabase 專案執行 migration{' '}
          <code className="bg-amber-100 px-1 rounded">005_add_realtime_publication.sql</code>，
          或於 Dashboard → Database → Publications → supabase_realtime 勾選 model_pricing。
        </p>

        <DebugInfo />
      </div>
    </div>
  );
}
