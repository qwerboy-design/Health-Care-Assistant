import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { Errors } from '@/lib/errors';
import { redactUploadMetadata } from '@/lib/privacy/redaction';
import { sanitizeFileName, sanitizePathSegment } from '@/lib/storage/upload-security';

// 甇方楝?曹蝙??cookies() ?脰?頨思遢撽?嚗????葡??export const dynamic = 'force-dynamic';

/**
 * POST /api/upload - ??瑼?銝??
 * 雿輻 Vercel Blob ??handleUpload() 璅??孵?
 */
export async function POST(request: NextRequest): Promise<NextResponse> {

  try {
    // 撽? Session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: Errors.UNAUTHORIZED.message },
        { status: 401 }
      );
    }

    const session = await verifySession(sessionToken);

    if (!session) {
      return NextResponse.json(
        { error: Errors.UNAUTHORIZED.message },
        { status: 401 }
      );
    }

    const body = (await request.json()) as HandleUploadBody;


    // 雿輻 Vercel Blob ??皞?handleUpload
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        // 撽?瑼?憿?
        const ALLOWED_TYPES = [
          'image/jpeg',
          'image/png',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ];

        // 敺?pathname ??clientPayload ?脣?瑼?憿?
        let fileType: string | undefined;
        if (clientPayload) {
          try {
            const payload = JSON.parse(clientPayload as string);
            fileType = payload.fileType;
          } catch {
            // 敹賜閫???航炊
          }
        }
        const MAX_FILE_SIZE = 500 * 1024 * 1024;
        if (multipart && typeof multipart === 'object' && 'totalSize' in multipart) {
          const totalSize = (multipart as { totalSize: number }).totalSize;
          if (totalSize > MAX_FILE_SIZE) {
            throw new Error(`瑼?憭批?銝頞? ${MAX_FILE_SIZE / 1024 / 1024}MB`);
          }
        }
        const timestamp = Date.now();
        const redactedMetadata = redactUploadMetadata({ pathname });
        const safePathname = sanitizeFileName(redactedMetadata.pathname || pathname);
        const userPathname = `${sanitizePathSegment(session.customerId)}/${timestamp}-${safePathname}`;

        const tokenConfig = {
          allowedContentTypes: fileType && ALLOWED_TYPES.includes(fileType) 
            ? [fileType] 
            : ALLOWED_TYPES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            customerId: session.customerId,
            pathname: safePathname,
            fileType,
          }),
          pathname: userPathname,
        };
        return tokenConfig;
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // 銝摰?敺??矽嚗?賂??湔鞈?摨怒?蝑?
        console.log('瑼?銝摰?:', blob.url);
      },
    });


    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error('銝???航炊:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '?⊥???銝隢?' },
      { status: 400 }
    );
  }
}

