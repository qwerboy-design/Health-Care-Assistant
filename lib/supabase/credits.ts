import { supabaseAdmin } from './client';

/**
 * 取得用戶的 Credits 分數
 * @param customerId 用戶 ID
 * @returns Credits 分數
 */
export async function getCustomerCredits(customerId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('credits')
    .eq('id', customerId)
    .single();

  if (error) {
    // 如果是找不到用戶，返回 0
    if (error.code === 'PGRST116' || error.message.includes('Not found')) {
      return 0;
    }
    // 其他錯誤拋出異常
    throw new Error(error.message);
  }

  return data?.credits ?? 0;
}

/**
 * 扣除用戶的 Credits 並記錄交易
 * @param customerId 用戶 ID
 * @param amount 扣除的 Credits 數量
 * @param modelName 使用的模型名稱
 * @param conversationId 對話 ID
 * @returns 扣除結果
 */
export async function deductCredits(
  customerId: string,
  amount: number,
  modelName: string,
  conversationId: string
): Promise<{
  success: boolean;
  creditsAfter?: number;
  creditsBefore?: number;
  transactionId?: string;
  error?: string;
}> {
  const { data, error } = await supabaseAdmin.rpc('deduct_customer_credits', {
    p_customer_id: customerId,
    p_credits_cost: amount,
    p_model_name: modelName,
    p_conversation_id: conversationId,
  });

  if (error) {
    throw new Error(error.message);
  }

  // RPC 函數返回 JSON 格式的結果
  if (!data.success) {
    return {
      success: false,
      error: data.error,
    };
  }

  return {
    success: true,
    creditsAfter: data.credits_after,
    creditsBefore: data.credits_before,
    transactionId: data.transaction_id,
  };
}

/**
 * 增加用戶的 Credits（管理員用）
 * @param customerId 用戶 ID
 * @param amount 增加的 Credits 數量
 * @param reason 充值原因（選填，用於記錄）
 * @returns 增加結果
 */
export async function addCredits(
  customerId: string,
  amount: number,
  reason?: string
): Promise<{
  success: boolean;
  creditsAfter?: number;
  creditsBefore?: number;
  transactionId?: string;
  error?: string;
}> {
  const { data, error } = await supabaseAdmin.rpc('add_customer_credits', {
    p_customer_id: customerId,
    p_credits_amount: amount,
  });

  if (error) {
    throw new Error(error.message);
  }

  // RPC 函數返回 JSON 格式的結果
  if (!data.success) {
    return {
      success: false,
      error: data.error,
    };
  }

  // 如果提供了 reason，記錄到 credits_transactions 表
  let transactionId: string | undefined;
  if (reason) {
    try {
      const { data: transaction, error: txError } = await supabaseAdmin
        .from('credits_transactions')
        .insert({
          customer_id: customerId,
          conversation_id: null,
          model_name: reason, // 暫時使用 model_name 欄位存儲原因
          credits_cost: amount,
          credits_before: data.credits_before,
          credits_after: data.credits_after,
        })
        .select('id')
        .single();

      if (!txError && transaction) {
        transactionId = transaction.id;
      }
    } catch (txError) {
      // 記錄失敗不影響主要操作
      console.error('記錄 Credits 交易失敗:', txError);
    }
  }

  return {
    success: true,
    creditsAfter: data.credits_after,
    creditsBefore: data.credits_before,
    transactionId,
  };
}

/**
 * 取得用戶的 Credits 消費歷史
 * @param customerId 用戶 ID
 * @param limit 限制返回的記錄數量（預設 50）
 * @returns Credits 消費歷史
 */
export async function getCreditsHistory(
  customerId: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  customer_id: string;
  conversation_id: string | null;
  model_name: string;
  credits_cost: number;
  credits_before: number;
  credits_after: number;
  created_at: string;
}>> {
  const { data, error } = await supabaseAdmin
    .from('credits_transactions')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
