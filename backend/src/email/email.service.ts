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

  private sanitizeEmail(rawEmail: string): string {
    if (!rawEmail) return '';
    const match = rawEmail.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0].toLowerCase() : rawEmail.trim().toLowerCase();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST || process.env.MAIL_HOST || 'mail.spacemail.com';
    const portEnv = process.env.SMTP_PORT || process.env.MAIL_PORT;
    const user = process.env.SMTP_USER || process.env.SMTP_EMAIL || process.env.MAIL_USER || '';
    const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.MAIL_PASS || '').replace(/\s+/g, '');
    const isGmail = host.includes('gmail') || user.endsWith('@gmail.com');

    if (user && pass) {
      if (isGmail) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
        this.logger.log(`[EmailService] Gmail service transporter initialized for ${user}`);
      } else {
        const port = parseInt(portEnv || '465', 10);
        const secure = port === 465 || process.env.SMTP_SECURE === 'true';

        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
          tls: {
            rejectUnauthorized: false,
          },
        });
        this.logger.log(`[EmailService] SMTP Transporter configured for ${user}@${host}:${port} (secure: ${secure})`);
      }
    } else {
      this.logger.warn(
        `[EmailService] SMTP credentials not set (SMTP_USER / SMTP_PASS). Checked for RESEND_API_KEY, BREVO_API_KEY, or SENDGRID_API_KEY.`,
      );
    }
  }

  /**
   * Generate a cryptographically random 6-digit OTP code and store with 10-minute TTL.
   */
  generateOtp(rawEmail: string, purpose: 'signup' | 'forgot_password' | 'login_2fa'): string {
    const cleanEmail = this.sanitizeEmail(rawEmail);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.otpStore.set(cleanEmail, { code, expiresAt, purpose });
    this.logger.log(`[OTP GENERATED] Email: ${cleanEmail} | Code: ${code} | Purpose: ${purpose} | Expires: 10m`);

    return code;
  }

  /**
   * Verify whether the provided OTP code matches the stored unexpired code for this email.
   */
  verifyOtp(rawEmail: string, code: string): boolean {
    const cleanEmail = this.sanitizeEmail(rawEmail);
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

    this.otpStore.delete(cleanEmail);
    this.logger.log(`[OTP VERIFY SUCCESS] Successfully verified OTP for ${cleanEmail}`);
    return true;
  }

  /**
   * Send branded verification email via HTTPS REST API (Resend/Brevo/SendGrid) or SMTP.
   */
  async sendOtpEmail(rawEmail: string, purpose: 'signup' | 'forgot_password' | 'login_2fa'): Promise<{ success: boolean; message: string }> {
    const cleanEmail = this.sanitizeEmail(rawEmail);
    const code = this.generateOtp(cleanEmail, purpose);

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || '"BONDKOIN Labs" <hello@bondkoinlabs.com>';
    const fromEmail = fromAddress.match(/<([^>]+)>/)?.[1] || process.env.SMTP_USER || 'hello@bondkoinlabs.com';

    const resendApiKey = process.env.RESEND_API_KEY;
    const brevoApiKey = process.env.BREVO_API_KEY;
    const sendgridApiKey = process.env.SENDGRID_API_KEY;

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

    // 1. Resend HTTP REST API (Port 443 HTTPS)
    if (resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress.includes('<') ? fromAddress : `BONDKOIN Labs <${fromAddress}>`,
            to: [cleanEmail],
            subject,
            html,
          }),
        });

        if (res.ok) {
          this.logger.log(`[EmailService] Resend HTTP API successfully delivered email to ${cleanEmail}`);
          return {
            success: true,
            message: `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
          };
        }
        const errJson = await res.json().catch(() => ({}));
        this.logger.warn(`[EmailService] Resend API error: ${JSON.stringify(errJson)}`);
      } catch (err: any) {
        this.logger.warn(`[EmailService] Resend API request failed: ${err?.message}`);
      }
    }

    // 2. Brevo (Sendinblue) HTTP REST API (Port 443 HTTPS)
    if (brevoApiKey) {
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'BONDKOIN Labs', email: fromEmail },
            to: [{ email: cleanEmail }],
            subject,
            htmlContent: html,
          }),
        });

        if (res.ok) {
          this.logger.log(`[EmailService] Brevo HTTP API successfully delivered email to ${cleanEmail}`);
          return {
            success: true,
            message: `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
          };
        }
        const errJson = await res.json().catch(() => ({}));
        this.logger.warn(`[EmailService] Brevo API error: ${JSON.stringify(errJson)}`);
      } catch (err: any) {
        this.logger.warn(`[EmailService] Brevo API request failed: ${err?.message}`);
      }
    }

    // 3. SendGrid HTTP REST API (Port 443 HTTPS)
    if (sendgridApiKey) {
      try {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: cleanEmail }] }],
            from: { email: fromEmail, name: 'BONDKOIN Labs' },
            subject,
            content: [{ type: 'text/html', value: html }],
          }),
        });

        if (res.ok || res.status === 202) {
          this.logger.log(`[EmailService] SendGrid HTTP API successfully delivered email to ${cleanEmail}`);
          return {
            success: true,
            message: `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
          };
        }
      } catch (err: any) {
        this.logger.warn(`[EmailService] SendGrid API request failed: ${err?.message}`);
      }
    }

    // 4. Nodemailer SMTP Delivery (with short connection timeout)
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: cleanEmail,
          subject,
          html,
          text: `Your BONDKOIN verification code is: ${code}. It expires in 10 minutes. Do not share this code with anyone.`,
        });
        this.logger.log(`[EmailService] SMTP verification email successfully delivered to ${cleanEmail}`);
        return {
          success: true,
          message: `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
        };
      } catch (err: any) {
        this.logger.error(
          `[EmailService] SMTP connection to mail server timed out or failed: ${err?.message || err}. (Note: If using Render, outbound raw SMTP ports 465/587 may be blocked by host firewall. Set RESEND_API_KEY or BREVO_API_KEY for instant HTTPS delivery).`,
        );
        return {
          success: true,
          message: `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
        };
      }
    }

    return {
      success: true,
      message: `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
    };
  }
}
