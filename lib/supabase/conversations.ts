import { supabaseAdmin } from './client';
import { Conversation } from '@/types';

/**
 * 建立對話
 */
export async function createConversation(
  customerId: string,
  title: string,
  workloadLevel: 'instant' | 'basic' | 'standard' | 'professional',
  selectedFunction?: string,
  modelName?: string
): Promise<Conversation> {
  const { data, error } = await supabaseAdmin
    .from('chat_conversations')
    .insert({
      customer_id: customerId,
      title,
      workload_level: workloadLevel,
      selected_function: selectedFunction,
      model_name: modelName,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`建立對話失敗: ${error.message}`);
  }

  return data as Conversation;
}

/**
 * 獲取客戶的所有對話
 */
export async function getConversationsByCustomerId(
  customerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Conversation[]> {
  const { data, error } = await supabaseAdmin
    .from('chat_conversations')
    .select('*')
    .eq('customer_id', customerId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    throw new Error(`獲取對話失敗: ${error.message}`);
  }
  
  return (data as Conversation[]) || [];
}

/**
 * 根據 ID 獲取對話
 */
export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  const { data, error } = await supabaseAdmin
    .from('chat_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data as Conversation;
}

/**
 * 更新對話標題
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  await supabaseAdmin
    .from('chat_conversations')
    .update({ title })
    .eq('id', conversationId);
}

/**
 * 刪除對話
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  await supabaseAdmin
    .from('chat_conversations')
    .delete()
    .eq('id', conversationId);
}
