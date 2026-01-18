import { NextRequest, NextResponse } from 'next/server';

/**
 * API 路由用於診斷 Anthropic API Key 設定
 * GET /api/diagnose-api-key
 */
export async function GET(request: NextRequest) {
  try {
    // 獲取環境變數
    const rawAnthropicKey = process.env.ANTHROPIC_API_KEY;
    const rawMCPKey = process.env.MCP_API_KEY;
    const apiKeyRaw = rawAnthropicKey || rawMCPKey;
    const apiKey = apiKeyRaw?.trim() || '';

    // 診斷信息
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        isVercel: !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        region: process.env.VERCEL_REGION,
      },
      apiKey: {
        exists: !!apiKey,
        source: rawAnthropicKey ? 'ANTHROPIC_API_KEY' : (rawMCPKey ? 'MCP_API_KEY' : 'none'),
        length: apiKey.length,
        // 只顯示前 15 個字元以保護完整 Key
        prefix: apiKey.substring(0, 15),
        hasCorrectPrefix: apiKey.startsWith('sk-ant-api'),
        isAdminKey: apiKey.startsWith('sk-ant-admin'),
        hasWhitespace: apiKeyRaw ? (apiKeyRaw !== apiKeyRaw.trim() || /\n|\r/.test(apiKeyRaw)) : false,
      },
      rawKeyInfo: {
        anthropicKeyExists: !!rawAnthropicKey,
        anthropicKeyLength: rawAnthropicKey?.length || 0,
        mcpKeyExists: !!rawMCPKey,
        mcpKeyLength: rawMCPKey?.length || 0,
      },
      recommendation: getRecommendation(apiKey),
    };

    return NextResponse.json(diagnostics, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Diagnostic failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

function getRecommendation(apiKey: string): string {
  if (!apiKey) {
    return '❌ API Key 未設定。請在 Vercel Dashboard → Settings → Environment Variables 中設定 ANTHROPIC_API_KEY';
  }

  if (apiKey.startsWith('sk-ant-admin')) {
    return '❌ 您使用的是 Admin/Code Key，無法用於直接 API 調用。請創建標準 API Key (sk-ant-api03-)';
  }

  if (!apiKey.startsWith('sk-ant-')) {
    return '❌ API Key 格式不正確。標準格式應為 sk-ant-api03-...';
  }

  if (apiKey.startsWith('sk-ant-api')) {
    return '✅ API Key 格式正確！如果仍然收到 403 錯誤，請確認您的 Anthropic 帳戶狀態和付費設定';
  }

  return '⚠️ 無法判斷 API Key 類型，請檢查格式';
}
