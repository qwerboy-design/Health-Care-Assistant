import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/session';
import { getCustomerSettings, updateCustomerSettings } from '@/lib/supabase/customer-settings';

/**
 * GET /api/customer-settings
 * 取得當前用戶的 UI 設定
 */
export async function GET(request: NextRequest) {
  try {
    // 驗證 JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授權' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyJWT(token);

    if (!payload || !payload.customerId) {
      return NextResponse.json(
        { success: false, error: '無效的認證令牌' },
        { status: 401 }
      );
    }

    // 取得客戶設定
    const settings = await getCustomerSettings(payload.customerId);

    return NextResponse.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    console.error('取得客戶設定錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '取得設定失敗',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer-settings
 * 更新當前用戶的 UI 設定
 */
export async function POST(request: NextRequest) {
  try {
    // 驗證 JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授權' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyJWT(token);

    if (!payload || !payload.customerId) {
      return NextResponse.json(
        { success: false, error: '無效的認證令牌' },
        { status: 401 }
      );
    }

    // 解析請求 body
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, error: '無效的設定資料' },
        { status: 400 }
      );
    }

    // 只允許更新特定欄位
    const allowedFields = ['show_function_selector', 'show_workload_selector', 'show_screenshot'];
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (field in settings && typeof settings[field] === 'boolean') {
        updateData[field] = settings[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '沒有有效的設定資料' },
        { status: 400 }
      );
    }

    // 更新設定
    await updateCustomerSettings(payload.customerId, updateData);

    // 取得更新後的設定
    const updatedSettings = await getCustomerSettings(payload.customerId);

    return NextResponse.json({
      success: true,
      data: { settings: updatedSettings },
      message: '設定已更新',
    });
  } catch (error) {
    console.error('更新客戶設定錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新設定失敗',
      },
      { status: 500 }
    );
  }
}
