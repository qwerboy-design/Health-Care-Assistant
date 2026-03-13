import { supabaseAdmin } from './client';
import { CustomerSettings } from '@/types';

/**
 * 取得客戶設定
 * 若不存在則自動建立預設設定
 */
export async function getCustomerSettings(customerId: string): Promise<CustomerSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customer_settings')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (error) {
      // 如果找不到記錄，建立預設設定
      if (error.code === 'PGRST116') {
        return await createDefaultSettings(customerId);
      }
      throw new Error(`取得客戶設定失敗: ${error.message}`);
    }

    return data as CustomerSettings;
  } catch (error) {
    // 如果 Supabase 未配置，返回預設設定
    if (!process.env.SUPABASE_URL || (error instanceof Error && (error.message.includes('fetch failed') || error.message.includes('Invalid API key')))) {
      return {
        id: `mock-${customerId}`,
        customer_id: customerId,
        show_function_selector: false,
        show_workload_selector: false,
        show_screenshot: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    throw error;
  }
}

/**
 * 建立預設客戶設定
 * 預設所有功能都隱藏
 */
export async function createDefaultSettings(customerId: string): Promise<CustomerSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customer_settings')
      .insert({
        customer_id: customerId,
        show_function_selector: false,
        show_workload_selector: false,
        show_screenshot: false,
      })
      .select()
      .single();

    if (error) {
      // 如果 Supabase 未配置，返回模擬數據
      if (!process.env.SUPABASE_URL || error.message?.includes('Invalid API key') || error.message?.includes('fetch failed')) {
        return {
          id: `mock-${customerId}`,
          customer_id: customerId,
          show_function_selector: false,
          show_workload_selector: false,
          show_screenshot: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      throw new Error(`建立客戶設定失敗: ${error.message}`);
    }

    return data as CustomerSettings;
  } catch (error) {
    if (!process.env.SUPABASE_URL || (error instanceof Error && (error.message.includes('fetch failed') || error.message.includes('Invalid API key')))) {
      return {
        id: `mock-${customerId}`,
        customer_id: customerId,
        show_function_selector: false,
        show_workload_selector: false,
        show_screenshot: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    throw error;
  }
}

/**
 * 更新客戶設定
 * 支援部分更新
 */
export async function updateCustomerSettings(
  customerId: string,
  settings: Partial<Pick<CustomerSettings, 'show_function_selector' | 'show_workload_selector' | 'show_screenshot'>>
): Promise<void> {
  try {
    // 先確保設定記錄存在
    await getCustomerSettings(customerId);

    const { error } = await supabaseAdmin
      .from('customer_settings')
      .update(settings)
      .eq('customer_id', customerId);

    if (error) {
      throw new Error(`更新客戶設定失敗: ${error.message}`);
    }
  } catch (error) {
    // 如果 Supabase 未配置，靜默失敗（開發模式）
    if (!process.env.SUPABASE_URL || (error instanceof Error && (error.message.includes('fetch failed') || error.message.includes('Invalid API key')))) {
      return;
    }
    throw error;
  }
}

/**
 * 批次取得多個客戶的設定
 * 用於後台管理介面
 */
export async function getMultipleCustomerSettings(customerIds: string[]): Promise<Record<string, CustomerSettings>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customer_settings')
      .select('*')
      .in('customer_id', customerIds);

    if (error) {
      throw new Error(`批次取得客戶設定失敗: ${error.message}`);
    }

    // 轉換為 Map 格式
    const settingsMap: Record<string, CustomerSettings> = {};
    if (data) {
      data.forEach((setting: any) => {
        settingsMap[setting.customer_id] = setting as CustomerSettings;
      });
    }

    // 為沒有設定的客戶建立預設值
    for (const customerId of customerIds) {
      if (!settingsMap[customerId]) {
        settingsMap[customerId] = {
          id: '',
          customer_id: customerId,
          show_function_selector: false,
          show_workload_selector: false,
          show_screenshot: false,
          created_at: '',
          updated_at: '',
        };
      }
    }

    return settingsMap;
  } catch (error) {
    // 如果 Supabase 未配置，返回空物件
    if (!process.env.SUPABASE_URL || (error instanceof Error && (error.message.includes('fetch failed') || error.message.includes('Invalid API key')))) {
      const settingsMap: Record<string, CustomerSettings> = {};
      customerIds.forEach(customerId => {
        settingsMap[customerId] = {
          id: `mock-${customerId}`,
          customer_id: customerId,
          show_function_selector: false,
          show_workload_selector: false,
          show_screenshot: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });
      return settingsMap;
    }
    throw error;
  }
}
