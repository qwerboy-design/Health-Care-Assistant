import { supabaseAdmin } from './client';

/**
 * 模型定價介面
 */
export interface ModelPricing {
  id: string;
  model_name: string;
  display_name: string;
  credits_cost: number;
  is_active: boolean;
  supports_vision: boolean; // 是否支持圖片/PDF
  created_at: string;
  updated_at: string;
}

/**
 * 取得模型列表
 * @param onlyActive 是否僅取得啟用的模型（預設 true）
 * @returns 模型列表
 */
export async function getAllModels(onlyActive: boolean = true): Promise<ModelPricing[]> {
  let query = supabaseAdmin
    .from('model_pricing')
    .select('*')
    .order('credits_cost', { ascending: true });

  if (onlyActive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * 取得特定模型的定價資訊
 * @param modelName 模型名稱
 * @returns 模型定價資訊，如果不存在則返回 null
 */
export async function getModelPricing(modelName: string): Promise<ModelPricing | null> {
  const { data, error } = await supabaseAdmin
    .from('model_pricing')
    .select('*')
    .eq('model_name', modelName)
    .eq('is_active', true)
    .single();

  if (error) {
    // 如果是找不到模型，返回 null
    if (error.code === 'PGRST116' || error.message.includes('Not found')) {
      return null;
    }
    // 其他錯誤拋出異常
    throw new Error(error.message);
  }

  return data;
}

/**
 * 建立新模型（管理員用）
 * @param model 模型資訊
 * @returns 建立的模型
 */
export async function createModel(model: {
  model_name: string;
  display_name: string;
  credits_cost: number;
}): Promise<ModelPricing> {
  const { data, error } = await supabaseAdmin
    .from('model_pricing')
    .insert(model)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * 更新模型定價（管理員用）
 * @param modelName 模型名稱
 * @param creditsCost 新的 Credits 消耗
 * @returns 更新後的模型，如果不存在則返回 null
 */
export async function updateModelPricing(
  modelName: string,
  creditsCost: number
): Promise<ModelPricing | null> {
  const { data, error } = await supabaseAdmin
    .from('model_pricing')
    .update({ credits_cost: creditsCost })
    .eq('model_name', modelName)
    .select()
    .single();

  if (error) {
    // 如果是找不到模型，返回 null
    if (error.code === 'PGRST116' || error.message.includes('Not found')) {
      return null;
    }
    // 其他錯誤拋出異常
    throw new Error(error.message);
  }

  return data;
}

/**
 * 停用模型（管理員用）
 * @param modelName 模型名稱
 * @returns 停用後的模型，如果不存在則返回 null
 */
export async function deactivateModel(modelName: string): Promise<ModelPricing | null> {
  const { data, error } = await supabaseAdmin
    .from('model_pricing')
    .update({ is_active: false })
    .eq('model_name', modelName)
    .select()
    .single();

  if (error) {
    // 如果是找不到模型，返回 null
    if (error.code === 'PGRST116' || error.message.includes('Not found')) {
      return null;
    }
    // 其他錯誤拋出異常
    throw new Error(error.message);
  }

  return data;
}

/**
 * 啟用模型（管理員用）
 * @param modelName 模型名稱
 * @returns 啟用後的模型，如果不存在則返回 null
 */
export async function activateModel(modelName: string): Promise<ModelPricing | null> {
  const { data, error } = await supabaseAdmin
    .from('model_pricing')
    .update({ is_active: true })
    .eq('model_name', modelName)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('Not found')) {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
}
