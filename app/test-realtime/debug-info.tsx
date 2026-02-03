'use client';

import { useEffect, useState } from 'react';

/**
 * Debug 資訊元件：顯示 Supabase 環境變數和連線資訊
 * 用於排查 Realtime 連線問題
 */
export function DebugInfo() {
  const [envCheck, setEnvCheck] = useState<{
    url: string | undefined;
    anonKey: string | undefined;
    urlValid: boolean;
    keyValid: boolean;
  }>({
    url: undefined,
    anonKey: undefined,
    urlValid: false,
    keyValid: false,
  });

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    setEnvCheck({
      url,
      anonKey: anonKey ? `${anonKey.slice(0, 20)}...` : undefined,
      urlValid: !!url && url.startsWith('https://'),
      keyValid: !!anonKey && anonKey.length > 50,
    });
  }, []);

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-300">
      <h3 className="text-md font-semibold text-gray-800 mb-3">🔍 Debug 資訊</h3>
      
      <div className="space-y-2 text-sm font-mono">
        <div className="flex items-start gap-2">
          <span className={envCheck.urlValid ? 'text-green-600' : 'text-red-600'}>
            {envCheck.urlValid ? '✅' : '❌'}
          </span>
          <div>
            <div className="font-semibold text-gray-700">NEXT_PUBLIC_SUPABASE_URL:</div>
            <div className="text-gray-600 break-all">
              {envCheck.url || '❌ 未設定'}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <span className={envCheck.keyValid ? 'text-green-600' : 'text-red-600'}>
            {envCheck.keyValid ? '✅' : '❌'}
          </span>
          <div>
            <div className="font-semibold text-gray-700">NEXT_PUBLIC_SUPABASE_ANON_KEY:</div>
            <div className="text-gray-600">
              {envCheck.anonKey || '❌ 未設定'}
            </div>
          </div>
        </div>
      </div>

      {(!envCheck.urlValid || !envCheck.keyValid) && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          <p className="font-semibold mb-1">⚠️ 環境變數設定錯誤</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>檢查 .env.local 是否包含正確的 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            <li>確認變數名稱有 NEXT_PUBLIC_ 前綴（客戶端才能讀取）</li>
            <li>修改後需要重啟 dev server：Ctrl+C 然後 npm run dev</li>
          </ol>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        <p>💡 提示：若環境變數正確但仍無法連線，請檢查：</p>
        <ul className="list-disc list-inside ml-2 space-y-0.5">
          <li>Supabase Dashboard → Settings → API → Realtime 是否啟用</li>
          <li>網路防火牆是否阻擋 WebSocket 連線</li>
          <li>瀏覽器 Console 是否有錯誤訊息</li>
        </ul>
      </div>
    </div>
  );
}
