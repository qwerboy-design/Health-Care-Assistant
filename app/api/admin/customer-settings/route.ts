import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, SessionPayload } from '@/lib/auth/session';
import { getCustomerSettings, updateCustomerSettings, getMultipleCustomerSettings, createDefaultSettings } from '@/lib/supabase/customer-settings';
import { findCustomerById } from '@/lib/supabase/customers';

/**
 * GET /api/admin/customer-settings?customerId=xxx
 * 取得指定用戶的 UI 設定（管理員專用）
 */
export async function GET(request: NextRequest) {
  console.log('[Admin Customer Settings API] GET request received');
  
  try {
    // 驗證 JWT token 與管理員權限
    const authHeader = request.headers.get('authorization');
    console.log('[Admin Customer Settings API] Has auth header:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Admin Customer Settings API] Missing or invalid auth header');
      return NextResponse.json(
        { success: false, error: '未授權' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyJWT(token);
    console.log('[Admin Customer Settings API] Token verified, payload:', payload);

    if (!payload || !payload.customerId) {
      console.log('[Admin Customer Settings API] Invalid token payload');
      return NextResponse.json(
        { success: false, error: '無效的認證令牌' },
        { status: 401 }
      );
    }

    // 檢查管理員權限
    const customer = await findCustomerById(payload.customerId);
    console.log('[Admin Customer Settings API] Customer found, role:', customer?.role);
    
    if (!customer || customer.role !== 'admin') {
      console.log('[Admin Customer Settings API] Not admin');
      return NextResponse.json(
        { success: false, error: '需要管理員權限' },
        { status: 403 }
      );
    }

    // 取得 query 參數
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const batchMode = searchParams.get('batch') === 'true';
    const customerIds = searchParams.get('customerIds');
    
    console.log('[Admin Customer Settings API] Batch mode:', batchMode, 'Customer IDs:', customerIds);

    if (batchMode && customerIds) {
      // 批次取得多個用戶的設定
      const ids = customerIds.split(',').filter(id => id.trim());
      console.log('[Admin Customer Settings API] Fetching settings for', ids.length, 'customers');
      
      const settings = await getMultipleCustomerSettings(ids);
      console.log('[Admin Customer Settings API] Retrieved', Object.keys(settings).length, 'settings');
      
      return NextResponse.json({
        success: true,
        data: { settings },
      });
    }

    if (!customerId) {
      console.log('[Admin Customer Settings API] Missing customerId');
      return NextResponse.json(
        { success: false, error: '缺少 customerId 參數' },
        { status: 400 }
      );
    }

    // 取得客戶設定
    const settings = await getCustomerSettings(customerId);
    console.log('[Admin Customer Settings API] Retrieved settings for customer:', customerId);

    return NextResponse.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    console.error('[Admin Customer Settings API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '取得設定失敗',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/customer-settings
 * 更新指定用戶的 UI 設定（管理員專用）
 */
export async function POST(request: NextRequest) {
  try {
    // 驗證 JWT token 與管理員權限
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

    // 檢查管理員權限
    const customer = await findCustomerById(payload.customerId);
    if (!customer || customer.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '需要管理員權限' },
        { status: 403 }
      );
    }

    // 解析請求 body
    const body = await request.json();
    const { customerId, settings } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: '缺少 customerId' },
        { status: 400 }
      );
    }

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
    await updateCustomerSettings(customerId, updateData);

    // 取得更新後的設定
    const updatedSettings = await getCustomerSettings(customerId);

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
