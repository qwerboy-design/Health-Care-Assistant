import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import {
  getCustomerSettings,
  updateCustomerSettings,
  getMultipleCustomerSettings,
} from '@/lib/supabase/customer-settings';

/**
 * GET /api/admin/customer-settings?customerId=xxx
 * GET /api/admin/customer-settings?batch=true&customerIds=id1,id2
 */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const batchMode = searchParams.get('batch') === 'true';
    const customerIds = searchParams.get('customerIds');

    if (batchMode && customerIds) {
      const ids = customerIds.split(',').filter((id) => id.trim());
      const settings = await getMultipleCustomerSettings(ids);

      return NextResponse.json({
        success: true,
        data: { settings },
      });
    }

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: '缺少 customerId 參數' },
        { status: 400 }
      );
    }

    const settings = await getCustomerSettings(customerId);

    return NextResponse.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    console.error('[Admin Customer Settings API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '取得系統設定失敗',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/customer-settings
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

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
        { success: false, error: '缺少有效設定資料' },
        { status: 400 }
      );
    }

    const allowedFields = ['show_function_selector', 'show_workload_selector', 'show_screenshot'];
    const updateData: Record<string, boolean> = {};

    for (const field of allowedFields) {
      if (field in settings && typeof settings[field] === 'boolean') {
        updateData[field] = settings[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '沒有可更新的設定欄位' },
        { status: 400 }
      );
    }

    await updateCustomerSettings(customerId, updateData);

    const updatedSettings = await getCustomerSettings(customerId);

    return NextResponse.json({
      success: true,
      data: { settings: updatedSettings },
      message: '已更新系統設定',
    });
  } catch (error) {
    console.error('[Admin Customer Settings API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新系統設定失敗',
      },
      { status: 500 }
    );
  }
}
