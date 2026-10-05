import { Resend } from 'resend';
import { getSafeErrorDetails } from '@/lib/errors';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export interface SendOTPEmailParams {
  to: string;
  name: string;
  otp: string;
}

export class EmailDeliveryError extends Error {
  constructor(
    public readonly code: string,
    public readonly status?: number
  ) {
    super('郵件服務暫時無法寄送');
    this.name = 'EmailDeliveryError';
  }
}

function toEmailDeliveryError(error: unknown): EmailDeliveryError {
  const candidate = error as { name?: unknown; code?: unknown; status?: unknown; statusCode?: unknown } | null;
  const details = getSafeErrorDetails(error);
  const code =
    typeof candidate?.code === 'string'
      ? candidate.code
      : typeof candidate?.name === 'string' && candidate.name !== 'Error'
        ? candidate.name
        : 'RESEND_REQUEST_FAILED';
  const status =
    typeof candidate?.status === 'number'
      ? candidate.status
      : typeof candidate?.statusCode === 'number'
        ? candidate.statusCode
        : details.status;

  return new EmailDeliveryError(code, status);
}

function logResendFailure(kind: string, error: unknown): void {
  console.error(`[Resend] ${kind} delivery failed`, getSafeErrorDetails(error));
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

    if (data.error) {
      const deliveryError = toEmailDeliveryError(data.error);
      logResendFailure('OTP', deliveryError);
      throw deliveryError;
    }

    console.log('Email sent successfully', { messageId: data.data?.id });
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    logResendFailure('OTP', error);
    throw toEmailDeliveryError(error);
  }
}
/**
 * 發送預設密碼 Email
 */
export async function sendDefaultPasswordEmail({ to, name, password }: { to: string; name: string; password: string }): Promise<void> {
  try {
    const data = await resend.emails.send({
      from: `Clinical Assistant <${FROM_EMAIL}>`,
      to,
      subject: '您的帳號已啟用 - 臨床助手 AI',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .password-box { font-size: 24px; font-weight: bold; text-align: center; background: white; padding: 15px; border-radius: 8px; margin: 20px 0; color: #667eea; border: 1px dashed #667eea; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header"><h1>臨床助手 AI</h1></div>
              <div class="content">
                <p>親愛的 ${name}，</p>
                <p>您的帳號已通過審核並成功啟用！</p>
                <p>請使用以下預設密碼進行首次登入：</p>
                <div class="password-box">${password}</div>
                <p>為了安全起見，<strong>登入後系統將要求您立即修改密碼。</strong></p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://hca.qwerboy.com'}/login" class="btn">立即登入</a>
                <p>祝好，<br>臨床助手 AI 團隊</p>
              </div>
              <div class="footer"><p>這是一封自動發送的郵件，請勿回復。</p></div>
            </div>
          </body>
        </html>
      `,
    });

    if (data.error) {
      const deliveryError = toEmailDeliveryError(data.error);
      logResendFailure('default password', deliveryError);
      throw deliveryError;
    }

    console.log('Default password email sent successfully', { messageId: data.data?.id });
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    logResendFailure('default password', error);
    throw toEmailDeliveryError(error);
  }
}
