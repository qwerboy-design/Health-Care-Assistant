import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function TestRealtimePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow">
        <h1 className="mb-4 border-b-2 border-green-500 pb-2 text-xl font-bold text-gray-800">
          Supabase Realtime 測試頁已停用
        </h1>
        <p className="text-sm text-gray-600">
          model_pricing 已改為僅伺服器與管理後台可存取；此頁不再使用 browser anon client
          直接讀取或訂閱模型定價。
        </p>
        <Link
          href="/admin/models"
          className="mt-4 inline-block rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800"
        >
          前往後台模型管理
        </Link>
      </div>
    </div>
  );
}
