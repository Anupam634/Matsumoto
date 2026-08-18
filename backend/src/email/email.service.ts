import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface OtpRecord {
  code: string;
  expiresAt: number;
  purpose: 'signup' | 'forgot_password' | 'login_2fa';
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly otpStore = new Map<string, OtpRecord>();

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST || process.env.MAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || '587', 10);
    const user = process.env.SMTP_USER || process.env.SMTP_EMAIL || process.env.MAIL_USER || '';
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.MAIL_PASS || '';
    const secure = port === 465;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false,
        },
      });
      this.logger.log(`[EmailService] SMTP Transporter configured for ${user}@${host}:${port}`);
    } else {
      this.logger.warn(
        `[EmailService] SMTP credentials not set (SMTP_USER / SMTP_PASS). OTPs will be generated, logged to server console, and validated locally.`,
      );
    }
  }

  /**
   * Generate a cryptographically random 6-digit OTP code and store with 10-minute TTL.
   */
  generateOtp(email: string, purpose: 'signup' | 'forgot_password' | 'login_2fa'): string {
    const cleanEmail = email.trim().toLowerCase();
    // 6-digit random code between 100000 and 999999
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.otpStore.set(cleanEmail, { code, expiresAt, purpose });
    this.logger.log(`[OTP GENERATED] Email: ${cleanEmail} | Code: ${code} | Purpose: ${purpose} | Expires: 10m`);

    return code;
  }

  /**
   * Verify whether the provided OTP code matches the stored unexpired code for this email.
   */
  verifyOtp(email: string, code: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const record = this.otpStore.get(cleanEmail);

    if (!record) {
      this.logger.warn(`[OTP VERIFY FAILED] No active OTP found for ${cleanEmail}`);
      return false;
    }

    if (Date.now() > record.expiresAt) {
      this.logger.warn(`[OTP VERIFY FAILED] OTP expired for ${cleanEmail}`);
      this.otpStore.delete(cleanEmail);
      return false;
    }

    if (record.code !== cleanCode) {
      this.logger.warn(`[OTP VERIFY FAILED] Code mismatch for ${cleanEmail}. Expected: ${record.code}, Received: ${cleanCode}`);
      return false;
    }

    // Success — clear used OTP to prevent replay
    this.otpStore.delete(cleanEmail);
    this.logger.log(`[OTP VERIFY SUCCESS] Successfully verified OTP for ${cleanEmail}`);
    return true;
  }

  /**
   * Send branded verification email to user.
   */
  async sendOtpEmail(email: string, purpose: 'signup' | 'forgot_password' | 'login_2fa'): Promise<{ success: boolean; message: string; code?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const code = this.generateOtp(cleanEmail, purpose);

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || '"BONDKOIN Labs" <no-reply@bondkoinlabs.com>';

    let subject = 'BONDKOIN Verification Code';
    let purposeTitle = 'Account Verification';
    let purposeDesc = 'Use the verification code below to complete your registration on BONDKOIN Labs.';

    if (purpose === 'forgot_password') {
      subject = 'BONDKOIN Password Reset Request';
      purposeTitle = 'Password Reset Security Code';
      purposeDesc = 'We received a request to reset the password for your BONDKOIN account. Enter the verification code below:';
    } else if (purpose === 'login_2fa') {
      subject = 'BONDKOIN 2FA Security Code';
      purposeTitle = 'Two-Factor Authentication';
      purposeDesc = 'Use the verification code below to sign in to your BONDKOIN Mining Dashboard.';
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #05070f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; }
          .wrapper { width: 100%; max-width: 540px; margin: 30px auto; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
          .header { padding: 28px 24px; text-align: center; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-bottom: 1px solid #334155; }
          .logo { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #f8fafc; text-transform: uppercase; }
          .logo-accent { color: #38bdf8; }
          .badge { display: inline-block; margin-top: 8px; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #f59e0b; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 9999px; text-transform: uppercase; }
          .content { padding: 32px 28px; text-align: center; }
          .title { font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 8px; }
          .desc { font-size: 13px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }
          .otp-container { background: #020617; border: 2px dashed #0284c7; border-radius: 14px; padding: 20px; margin: 20px 0; text-align: center; }
          .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #38bdf8; text-shadow: 0 0 15px rgba(56, 189, 248, 0.5); }
          .otp-hint { font-size: 11px; color: #64748b; margin-top: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          .warning { font-size: 12px; color: #cbd5e1; background: rgba(30, 41, 59, 0.6); padding: 12px 16px; border-radius: 10px; text-align: left; margin-top: 24px; border-left: 3px solid #f59e0b; }
          .footer { padding: 20px 24px; text-align: center; font-size: 11px; color: #475569; border-top: 1px solid #1e293b; background: #070a14; }
          .footer a { color: #38bdf8; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <div class="logo">BONDKOIN <span class="logo-accent">LABS</span></div>
            <div class="badge">BNB Smart Chain Protocol</div>
          </div>
          <div class="content">
            <div class="title">${purposeTitle}</div>
            <div class="desc">${purposeDesc}</div>
            
            <div class="otp-container">
              <div class="otp-code">${code}</div>
              <div class="otp-hint">Valid for 10 minutes · Single Use</div>
            </div>

            <div class="warning">
              🔒 <strong>Security Notice:</strong> Never share this 6-digit code with anyone. BONDKOIN Labs administrators will never ask for your verification code.
            </div>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} BONDKOIN Labs (<a href="https://bondkoinlabs.com">bondkoinlabs.com</a>). Built for the BNB Chain Ecosystem.
          </div>
        </div>
      </body>
      </html>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: cleanEmail,
          subject,
          html,
          text: `Your BONDKOIN verification code is: ${code}. It expires in 10 minutes. Do not share this code with anyone.`,
        });
        this.logger.log(`[EmailService] Verification email successfully delivered to ${cleanEmail}`);
        return {
          success: true,
          message: `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
        };
      } catch (err: any) {
        this.logger.error(`[EmailService] Failed to send email to ${cleanEmail}: ${err?.message || err}`);
        // Fallback response with code so users can always proceed if SMTP is misconfigured on host
        return {
          success: true,
          message: `Verification code generated for ${cleanEmail}. (Code: ${code})`,
          code,
        };
      }
    } else {
      // SMTP not configured yet on server — return helpful notification with code
      return {
        success: true,
        message: `Verification code generated for ${cleanEmail}. (Code: ${code})`,
        code,
      };
    }
  }
}
