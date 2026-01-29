import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export interface SendOTPEmailParams {
  to: string;
  name: string;
  otp: string;
}

/**
 * 發送 OTP 驗證碼 Email
 */
export async function sendOTPEmail({ to, name, otp }: SendOTPEmailParams): Promise<void> {
  try {
    const data = await resend.emails.send({
      from: `Clinical Assistant <${FROM_EMAIL}>`,
      to,
      subject: '您的驗證碼 - 臨床助手 AI',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .otp-code {
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                text-align: center;
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                color: #667eea;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>臨床助手 AI</h1>
              </div>
              <div class="content">
                <p>親愛的 ${name}，</p>
                <p>感謝您註冊臨床助手 AI。請使用以下驗證碼完成註冊：</p>
                <div class="otp-code">${otp}</div>
                <p><strong>此驗證碼將在 10 分鐘後過期。</strong></p>
                <p>如果您沒有請求此驗證碼，請忽略此郵件。</p>
                <p>祝好，<br>臨床助手 AI 團隊</p>
              </div>
              <div class="footer">
                <p>這是一封自動發送的郵件，請勿回復。</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Email sent successfully:', {
      to,
      messageId: data.data?.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('發送 OTP Email 失敗:', error);
    throw new Error('發送驗證碼失敗');
  }
}
