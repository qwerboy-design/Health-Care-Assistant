import { supabaseAdmin } from './client';
import { Message } from '@/types';

/**
 * 建立訊息
 */
export async function createMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  fileUrl?: string,
  fileName?: string,
  fileType?: string
): Promise<Message> {
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`建立訊息失敗: ${error.message}`);
  }
  
  return data as Message;
}

/**
 * 獲取對話的所有訊息
 */
export async function getMessagesByConversationId(
  conversationId: string,
  limit: number = 100,
  offset: number = 0
): Promise<Message[]> {
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);
  
  if (error) {
    throw new Error(`獲取訊息失敗: ${error.message}`);
  }
  
  return (data as Message[]) || [];
}

/**
 * 刪除訊息
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await supabaseAdmin
    .from('chat_messages')
    .delete()
    .eq('id', messageId);
}
