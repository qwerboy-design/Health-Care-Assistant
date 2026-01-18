import { NextRequest, NextResponse } from 'next/server';

/**
 * 測試 Anthropic API 的簡單端點
 * GET /api/test-anthropic-direct
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'ANTHROPIC_API_KEY not found',
      }, { status: 500 });
    }

    console.log('[Test] Starting Anthropic API test...');
    console.log('[Test] API Key prefix:', apiKey.substring(0, 15));
    console.log('[Test] Environment:', {
      VERCEL: process.env.VERCEL,
      VERCEL_REGION: process.env.VERCEL_REGION,
      NODE_ENV: process.env.NODE_ENV,
    });

    // 測試請求 - 使用最簡單的配置
    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: 'Hello, respond with just "API works"'
      }]
    };

    console.log('[Test] Request body:', JSON.stringify(requestBody));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };

    console.log('[Test] Request headers (without API key):', {
      'Content-Type': headers['Content-Type'],
      'anthropic-version': headers['anthropic-version'],
      'x-api-key': apiKey.substring(0, 15) + '...',
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    console.log('[Test] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Test] Error response:', errorText);

      return NextResponse.json({
        success: false,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        environment: {
          VERCEL: process.env.VERCEL,
          VERCEL_REGION: process.env.VERCEL_REGION,
          VERCEL_ENV: process.env.VERCEL_ENV,
        },
        apiKeyInfo: {
          prefix: apiKey.substring(0, 15),
          length: apiKey.length,
        }
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('[Test] Success! Response:', JSON.stringify(data).substring(0, 200));

    return NextResponse.json({
      success: true,
      response: {
        model: data.model,
        content: data.content[0]?.text,
        usage: data.usage,
      },
      environment: {
        VERCEL: process.env.VERCEL,
        VERCEL_REGION: process.env.VERCEL_REGION,
        VERCEL_ENV: process.env.VERCEL_ENV,
      }
    });

  } catch (error: any) {
    console.error('[Test] Exception:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack?.substring(0, 500),
    }, { status: 500 });
  }
}
