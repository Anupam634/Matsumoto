import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import * as nodemailer from 'nodemailer';
import { createOtpStore, OtpPurpose, OtpRecord, OtpStore } from './otp.store';

export type { OtpRecord, OtpPurpose } from './otp.store';

/** A single address may request this many codes per window. */
export const OTP_SENDS_PER_ADDRESS = 3;
export const OTP_SEND_WINDOW_MS = 10 * 60 * 1000;
/** Upper bound on how long a caller waits for SMTP before giving up. */
const SMTP_DEADLINE_MS = 12_000;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fallbackTransporter: nodemailer.Transporter | null = null;
  private readonly otpStore: OtpStore;

  constructor() {
    this.otpStore = createOtpStore(this.logger);
    this.initTransporter();
  }

  /**
   * Reject an SMTP attempt that outlives the deadline. Both transporters
   * have their own socket timeouts, but they stack: a primary that hangs
   * for 20s followed by a fallback that hangs for 20s left the caller
   * waiting the better part of a minute.
   */
  private withDeadline<T>(work: Promise<T>, label: string): Promise<T> {
    return Promise.race([
      work,
      new Promise<never>((_resolve, reject) =>
        setTimeout(
          () => reject(new Error(`${label} timed out after ${SMTP_DEADLINE_MS}ms`)),
          SMTP_DEADLINE_MS,
        ).unref(),
      ),
    ]);
  }

  private sanitizeEmail(rawEmail: string): string {
    if (!rawEmail) return '';
    const match = rawEmail.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0].toLowerCase() : rawEmail.trim().toLowerCase();
  }

  initTransporter() {
    const host = process.env.SMTP_HOST || process.env.MAIL_HOST || 'mail.spacemail.com';
    const portEnv = process.env.SMTP_PORT || process.env.MAIL_PORT;
    const user = process.env.SMTP_USER || process.env.SMTP_EMAIL || process.env.MAIL_USER || 'hello@bondkoinlabs.com';
    const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.MAIL_PASS || '').replace(/\s+/g, '');
    const isGmail = host.includes('gmail') || user.endsWith('@gmail.com');
    const isSpacemail = host.includes('spacemail') || user.includes('@bondkoinlabs.com');

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
      } else if (isSpacemail) {
        // Spacemail Primary: Port 465 (SSL)
        this.transporter = nodemailer.createTransport({
          host: 'mail.spacemail.com',
          port: 465,
          secure: true,
          auth: { user, pass },
          tls: {
            servername: 'mail.spacemail.com',
            rejectUnauthorized: false,
          },
          connectionTimeout: 15000,
          greetingTimeout: 10000,
          socketTimeout: 20000,
        });

        // Spacemail Secondary Fallback: Port 587 (STARTTLS)
        this.fallbackTransporter = nodemailer.createTransport({
          host: 'mail.spacemail.com',
          port: 587,
          secure: false,
          requireTLS: true,
          auth: { user, pass },
          tls: {
            servername: 'mail.spacemail.com',
            rejectUnauthorized: false,
          },
          connectionTimeout: 15000,
          greetingTimeout: 10000,
          socketTimeout: 20000,
        });

        this.logger.log(`[EmailService] Spacemail SMTP Transporter initialized (Primary 465 SSL, Fallback 587 STARTTLS) for ${user}`);
      } else {
        const port = parseInt(portEnv || '465', 10);
        const secure = port === 465 || process.env.SMTP_SECURE === 'true';

        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          connectionTimeout: 12000,
          greetingTimeout: 10000,
          socketTimeout: 20000,
          tls: {
            rejectUnauthorized: false,
          },
        });
        this.logger.log(`[EmailService] SMTP Transporter configured for ${user}@${host}:${port} (secure: ${secure})`);
      }

      // Verify connection in background
      if (this.transporter) {
        this.transporter.verify((err) => {
          if (err) {
            this.logger.warn(`[EmailService] SMTP Transporter verification notice: ${err.message}`);
          } else {
            this.logger.log(`[EmailService] ✓ SMTP Transporter verified and ready to deliver emails for ${user}`);
          }
        });
      }
    } else {
      this.logger.warn(
        `[EmailService] SMTP credentials not set (SMTP_USER / SMTP_PASS). Check environment variables.`,
      );
    }
  }

  /**
   * Generate a 6-digit code and store it with a 10-minute TTL.
   *
   * `randomInt` rather than `Math.random`: this is the only thing standing
   * between an attacker and someone else's account during a password
   * reset, and Math.random is predictable from a handful of outputs.
   *
   * The code itself is never logged. It used to be, which put a working
   * credential into every log sink the box ships to.
   */
  async generateOtp(rawEmail: string, purpose: OtpPurpose): Promise<string> {
    const cleanEmail = this.sanitizeEmail(rawEmail);
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    await this.otpStore.put(cleanEmail, { code, expiresAt, purpose });
    this.logger.log(`[OTP GENERATED] ${cleanEmail} | purpose=${purpose} | ttl=10m`);

    return code;
  }

  /**
   * Verify whether the provided OTP code matches the stored unexpired code for this email.
   */
  async verifyOtp(rawEmail: string, code: string): Promise<boolean> {
    const cleanEmail = this.sanitizeEmail(rawEmail);
    const cleanCode = code.trim();
    const record = await this.otpStore.take(cleanEmail);

    if (!record) {
      this.logger.warn(`[OTP VERIFY FAILED] no active code for ${cleanEmail}`);
      return false;
    }

    if (Date.now() > record.expiresAt) {
      this.logger.warn(`[OTP VERIFY FAILED] expired for ${cleanEmail}`);
      await this.otpStore.drop(cleanEmail);
      return false;
    }

    // Neither the expected nor the supplied code is logged: a rejected
    // attempt is still someone's live credential.
    if (record.code !== cleanCode) {
      this.logger.warn(`[OTP VERIFY FAILED] code mismatch for ${cleanEmail}`);
      return false;
    }

    await this.otpStore.drop(cleanEmail);
    this.logger.log(`[OTP VERIFY SUCCESS] ${cleanEmail}`);
    return true;
  }

  /**
   * Send branded verification email via Spacemail / SMTP.
   */
  async sendOtpEmail(rawEmail: string, purpose: OtpPurpose): Promise<{ success: boolean; message: string }> {
    if (!this.transporter) {
      this.initTransporter();
    }

    const cleanEmail = this.sanitizeEmail(rawEmail);

    // Per-address ceiling. The signup form is unauthenticated, so without
    // this anyone can point it at a stranger's inbox and flood it.
    const allowed = await this.otpStore.allowSend(
      cleanEmail,
      OTP_SENDS_PER_ADDRESS,
      OTP_SEND_WINDOW_MS,
    );
    if (!allowed) {
      this.logger.warn(`[OTP THROTTLED] ${cleanEmail}`);
      throw new HttpException(
        `Too many verification codes requested for that address. Try again in ${Math.round(OTP_SEND_WINDOW_MS / 60000)} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = await this.generateOtp(cleanEmail, purpose);
    const senderEmail = (process.env.SMTP_USER || 'hello@bondkoinlabs.com').trim().toLowerCase();

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

    // 1. Spacemail / Primary SMTP Transporter
    if (this.transporter) {
      try {
        const info = await this.withDeadline(this.transporter.sendMail({
          from: `"BONDKOIN Labs" <${senderEmail}>`,
          to: cleanEmail,
          subject,
          html,
          text: `Your BONDKOIN verification code is: ${code}. It expires in 10 minutes. Do not share this code with anyone.`,
        }), 'Primary SMTP');
        this.logger.log(`[EmailService] ✓ Spacemail verification email delivered to ${cleanEmail} (ID: ${info.messageId}, Response: ${info.response})`);
        return {
          success: true,
          message: `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
        };
      } catch (primaryErr: any) {
        this.logger.warn(
          `[EmailService] Primary SMTP delivery attempt failed: ${primaryErr?.message || primaryErr}. Trying fallback transporter...`,
        );

        // Try Fallback Transporter (Port 587 STARTTLS)
        if (this.fallbackTransporter) {
          try {
            const info = await this.withDeadline(this.fallbackTransporter.sendMail({
              from: `"BONDKOIN Labs" <${senderEmail}>`,
              to: cleanEmail,
              subject,
              html,
              text: `Your BONDKOIN verification code is: ${code}. It expires in 10 minutes. Do not share this code with anyone.`,
            }), 'Fallback SMTP');
            this.logger.log(`[EmailService] ✓ Spacemail Fallback (Port 587) email delivered to ${cleanEmail} (ID: ${info.messageId}, Response: ${info.response})`);
            return {
              success: true,
              message: `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
            };
          } catch (fallbackErr: any) {
            this.logger.error(`[EmailService] Fallback SMTP delivery also failed: ${fallbackErr?.message || fallbackErr}`);
          }
        }
      }
    } else {
      this.logger.error(`[EmailService] Cannot send email: No SMTP transporter initialized. Check SMTP_USER & SMTP_PASS in .env.`);
    }

    // Reaching here means every transport failed, or none was configured.
    // Reporting success anyway told the user to go and check an inbox that
    // was never going to receive anything, with no error shown anywhere.
    // Drop the code so a retry issues a fresh one.
    await this.otpStore.drop(cleanEmail);
    throw new HttpException(
      'We could not send your verification code right now. Please try again in a moment.',
      HttpStatus.BAD_GATEWAY,
    );
  }

  /**
   * Diagnostic Test Email Endpoint
   */
  async testEmail(rawEmail: string) {
    this.initTransporter();
    const cleanEmail = this.sanitizeEmail(rawEmail);
    const senderEmail = (process.env.SMTP_USER || 'hello@bondkoinlabs.com').trim().toLowerCase();

    if (!this.transporter) {
      return {
        success: false,
        error: 'No SMTP transporter configured. Check environment variables.',
        // Booleans only. Echoing the configured mailbox back over HTTP
        // hands out half of the SMTP credential pair.
        envState: {
          hasHost: !!process.env.SMTP_HOST,
          hasUser: !!process.env.SMTP_USER,
          hasPass: !!process.env.SMTP_PASS,
        },
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"BONDKOIN Labs" <${senderEmail}>`,
        to: cleanEmail,
        subject: 'BONDKOIN Labs Email Health Test',
        text: 'This is a test email confirming your Spacemail integration on AWS EC2 is working perfectly!',
      });
      return {
        success: true,
        transport: 'Primary Port 465 SSL',
        messageId: info.messageId,
        response: info.response,
      };
    } catch (err: any) {
      if (this.fallbackTransporter) {
        try {
          const info = await this.fallbackTransporter.sendMail({
            from: `"BONDKOIN Labs" <${senderEmail}>`,
            to: cleanEmail,
            subject: 'BONDKOIN Labs Email Health Test (Fallback)',
            text: 'This is a test email confirming your Spacemail integration on AWS EC2 is working perfectly!',
          });
          return {
            success: true,
            transport: 'Fallback Port 587 STARTTLS',
            messageId: info.messageId,
            response: info.response,
          };
        } catch (fallbackErr: any) {
          return {
            success: false,
            primaryError: err?.message || err,
            fallbackError: fallbackErr?.message || fallbackErr,
          };
        }
      }
      return {
        success: false,
        primaryError: err?.message || err,
      };
    }
  }
}
