import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { getConversationById } from '@/lib/supabase/conversations';
import { getMessagesByConversationId } from '@/lib/supabase/messages';
import { generateMarkdownLog } from '@/lib/storage/log-generator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = (await cookies()).get('session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return new Response('Unauthorized', { status: 401 });
  const conversationId = new URL(request.url).searchParams.get('conversationId');
  if (!conversationId) return new Response('conversationId is required', { status: 400 });
  const conversation = await getConversationById(conversationId);
  if (!conversation || conversation.customer_id !== session.customerId) return new Response('Forbidden', { status: 403 });
  const messages = await getMessagesByConversationId(conversationId, 1000);
  const markdown = generateMarkdownLog(conversation, messages);
  return new Response(markdown, {
    status: 200,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="hca-${conversationId}.md"`, 'Cache-Control': 'no-store' },
  });
}
