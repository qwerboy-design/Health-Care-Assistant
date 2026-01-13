export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          臨床助手 AI
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          智能臨床分析助手，為您提供專業的醫療數據分析
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            登入
          </a>
          <a
            href="/register"
            className="inline-block px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition"
          >
            註冊
          </a>
        </div>
      </div>
    </div>
  );
}
