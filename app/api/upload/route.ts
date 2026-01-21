import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { Errors } from '@/lib/errors';

/**
 * POST /api/upload - 處理檔案上傳授權
 * 使用 Vercel Blob 的 handleUpload() 標準方式
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/upload/route.ts:POST',message:'Upload endpoint called',data:{method:request.method,url:request.url,hasCookie:!!request.headers.get('cookie')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  try {
    // 驗證 Session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/upload/route.ts:POST',message:'Session check',data:{hasSessionToken:!!sessionToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    if (!sessionToken) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/upload/route.ts:POST',message:'No session token',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: Errors.UNAUTHORIZED.message },
        { status: 401 }
      );
    }

    const session = await verifySession(sessionToken);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/upload/route.ts:POST',message:'Session verification result',data:{sessionValid:!!session,customerId:session?.customerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (!session) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/upload/route.ts:POST',message:'Session invalid',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: Errors.UNAUTHORIZED.message },
        { status: 401 }
      );
    }

    const body = (await request.json()) as HandleUploadBody;
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/upload/route.ts:POST',message:'Request body parsed',data:{hasBody:!!body,bodyKeys:body?Object.keys(body):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/upload/route.ts:POST',message:'Before handleUpload call',data:{hasBlobToken:!!process.env.BLOB_READ_WRITE_TOKEN},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // 使用 Vercel Blob 的標準 handleUpload
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/upload/route.ts:onBeforeGenerateToken',message:'onBeforeGenerateToken called',data:{pathname,hasClientPayload:!!clientPayload,isMultipart:typeof multipart==='boolean'?multipart:!!multipart,multipartType:typeof multipart},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        // 驗證檔案類型
        const ALLOWED_TYPES = [
          'image/jpeg',
          'image/png',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ];

        // 從 pathname 或 clientPayload 獲取檔案類型
        let fileType: string | undefined;
        if (clientPayload) {
          try {
            const payload = JSON.parse(clientPayload as string);
            fileType = payload.fileType;
          } catch {
            // 忽略解析錯誤
          }
        }

        // 驗證檔案大小（最大 500MB）
        const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
        if (multipart && typeof multipart === 'object' && 'totalSize' in multipart) {
          const totalSize = (multipart as { totalSize: number }).totalSize;
          if (totalSize > MAX_FILE_SIZE) {
            throw new Error(`檔案大小不能超過 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
          }
        }

        // 構建上傳路徑（按用戶 ID 組織）
        const timestamp = Date.now();
        const sanitizedPathname = pathname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const userPathname = `${session.customerId}/${timestamp}-${sanitizedPathname}`;

        const tokenConfig = {
          allowedContentTypes: fileType && ALLOWED_TYPES.includes(fileType) 
            ? [fileType] 
            : ALLOWED_TYPES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            customerId: session.customerId,
            originalPathname: pathname,
            fileType,
          }),
          pathname: userPathname,
        };
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/upload/route.ts:onBeforeGenerateToken',message:'Returning token config',data:{pathname:tokenConfig.pathname,allowedTypes:tokenConfig.allowedContentTypes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        return tokenConfig;
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/upload/route.ts:onUploadCompleted',message:'Upload completed callback',data:{blobUrl:blob.url,hasTokenPayload:!!tokenPayload},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // 上傳完成後的回調（可選：更新資料庫、發送通知等）
        console.log('檔案上傳完成:', blob.url);
        if (tokenPayload) {
          try {
            const payload = JSON.parse(tokenPayload);
            console.log('上傳元數據:', payload);
          } catch {
            // 忽略解析錯誤
          }
        }
      },
    });

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/upload/route.ts:POST',message:'handleUpload completed',data:{hasResponse:!!jsonResponse},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/upload/route.ts:POST',message:'Error caught in upload handler',data:{errorMessage:error?.message,errorName:error?.name,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.error('上傳處理錯誤:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '無法處理上傳請求' },
      { status: 400 }
    );
  }
}
