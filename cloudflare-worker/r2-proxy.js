/**
 * Cloudflare Worker for R2 Custom Domain Proxy
 * 
 * 此 Worker 作為代理層，將請求轉發到 R2 Bucket
 * 解決 Cloudflare Proxy（橘色）無法直接連接到 R2 的問題
 * 
 * 部署步驟：
 * 1. 在 Cloudflare Dashboard → Workers & Pages → Create Worker
 * 2. 貼上此程式碼
 * 3. 在 Variables and Secrets 中綁定 R2 Bucket（變數名：R2_BUCKET）
 * 4. 在 Triggers → Routes 中設定路由：hca.qwerboy.com/*
 * 5. Deploy
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 取得物件路徑（移除開頭的 /）
    const objectKey = url.pathname.slice(1);
    
    // 如果路徑為空，返回說明頁面
    if (!objectKey || objectKey === '') {
      return new Response(
        JSON.stringify({
          message: 'R2 Proxy Worker is running',
          usage: 'Access files at: https://hca.qwerboy.com/your-file-path',
          bucket: env.R2_BUCKET ? 'Bound' : 'Not bound',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    try {
      // 從 R2 Bucket 讀取物件
      const object = await env.R2_BUCKET.get(objectKey);
      
      if (object === null) {
        return new Response('Object not found', { 
          status: 404,
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      }
      
      // 設定回應標頭
      const headers = new Headers();
      
      // 複製 R2 物件的 HTTP 元數據
      object.writeHttpMetadata(headers);
      
      // 設定 ETag
      headers.set('etag', object.httpEtag);
      
      // 設定快取標頭（可選，根據需求調整）
      headers.set('Cache-Control', 'public, max-age=3600');
      
      // 設定 CORS 標頭（如果需要）
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      
      // 處理 OPTIONS 請求（CORS preflight）
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers,
        });
      }
      
      // 返回物件內容
      return new Response(object.body, {
        headers,
      });
    } catch (error) {
      // 錯誤處理
      console.error('R2 Proxy Error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error.message,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};
