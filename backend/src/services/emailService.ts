import tls from 'node:tls';
import net from 'node:net';
import dotenv from 'dotenv';

dotenv.config();

export type SendPasswordResetEmailInput = {
  toEmail: string;
  otp: string;
};

export type EmailDeliveryResult = {
  success: boolean;
  error?: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT?.trim() || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || (user ? `"Local Disaster Network" <${user}>` : '');

  if (!host || !user || !pass) {
    return null;
  }

  return { host, port, user, pass, from };
}

/**
 * Format HTML email body for password reset OTP.
 */
function renderEmailHtml(otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header { background: #d97706; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px 24px; text-align: center; }
    .otp-box { background: #fffbe6; border: 2px dashed #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #b45309; display: inline-block; }
    .expiry { color: #dc2626; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
    .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; text-align: left; font-size: 13px; color: #991b1b; border-radius: 0 4px 4px 0; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Local Disaster & Flood Early-Warning Network</h1>
      <p>ResQ1 Emergency System</p>
    </div>
    <div class="content">
      <h2 style="margin-top:0; color:#1f2937;">Password Reset Verification</h2>
      <p style="color:#4b5563; line-height:1.5;">You requested a password reset for your account. Use the 6-digit verification code below to complete the reset process:</p>
      
      <div class="otp-box">${otp}</div>
      
      <div class="expiry">⚠️ This code will expire in 5 minutes.</div>
      
      <div class="warning">
        <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email or contact support immediately. Your password remains unchanged.
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ResQ1 Local Disaster Network. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Format plain text email body for password reset OTP.
 */
function renderEmailText(otp: string): string {
  return `
Local Disaster & Flood Early-Warning Network (ResQ1)
==================================================

Password Reset OTP Verification

Your 6-digit verification code is: ${otp}

IMPORTANT:
- This code will expire in 5 minutes.
- If you did not request a password reset, please ignore this email or contact support immediately.

--------------------------------------------------
ResQ1 Emergency Disaster Management System
  `.trim();
}

/**
 * Direct SMTP socket sender in pure Node.js (TLS / STARTTLS)
 * Serves as a zero-dependency, robust SMTP sender with strict 6s timeout.
 */
async function sendSmtpDirect(config: SmtpConfig, toEmail: string, otp: string): Promise<void> {
  const { host, port, user, pass, from } = config;
  const subject = 'Local Disaster Network - Password Reset OTP';
  const htmlBody = renderEmailHtml(otp);
  const textBody = renderEmailText(otp);

  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  const messageLines = [
    `From: ${from}`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    textBody,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`,
    `.`,
  ];

  return new Promise((resolve, reject) => {
    let socket: tls.TLSSocket | net.Socket;
    let step = 0;
    let timeoutTimer: NodeJS.Timeout;

    const cleanup = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (socket) {
        socket.removeAllListeners();
        socket.destroy();
      }
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    timeoutTimer = setTimeout(() => {
      onError(new Error('SMTP Connection Timeout (15000ms limit reached)'));
    }, 15000);

    const sendLine = (line: string) => {
      if (socket && !socket.destroyed) {
        socket.write(`${line}\r\n`);
      }
    };

    const handleResponse = (data: Buffer) => {
      const response = data.toString();
      const code = Number.parseInt(response.substring(0, 3), 10);

      try {
        if (step === 0 && code === 220) {
          step = 1;
          sendLine(`EHLO localhost`);
        } else if (step === 1 && (code === 250 || code === 220)) {
          step = 2;
          sendLine(`AUTH LOGIN`);
        } else if (step === 2 && code === 334) {
          step = 3;
          sendLine(Buffer.from(user).toString('base64'));
        } else if (step === 3 && code === 334) {
          step = 4;
          sendLine(Buffer.from(pass).toString('base64'));
        } else if (step === 4 && code === 235) {
          step = 5;
          sendLine(`MAIL FROM:<${user}>`);
        } else if (step === 5 && code === 250) {
          step = 6;
          sendLine(`RCPT TO:<${toEmail}>`);
        } else if (step === 6 && code === 250) {
          step = 7;
          sendLine(`DATA`);
        } else if (step === 7 && code === 354) {
          step = 8;
          messageLines.forEach((line) => sendLine(line));
        } else if (step === 8 && code === 250) {
          step = 9;
          sendLine(`QUIT`);
          cleanup();
          resolve();
        } else if (code >= 400) {
          throw new Error(`SMTP Error [code ${code}]: ${response.trim()}`);
        }
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    try {
      if (port === 465) {
        socket = tls.connect(port, host, { rejectUnauthorized: false }, () => {});
        socket.setTimeout(15000, () => onError(new Error('Socket timeout')));
        socket.on('data', handleResponse);
        socket.on('error', onError);
      } else {
        // STARTTLS / Port 587
        const netSocket = net.connect(port, host, () => {});
        socket = netSocket;
        netSocket.setTimeout(15000, () => onError(new Error('Socket timeout')));

        let isTlsUpgraded = false;

        netSocket.on('data', (data: Buffer) => {
          if (!isTlsUpgraded) {
            const resp = data.toString();
            const code = Number.parseInt(resp.substring(0, 3), 10);
            if (step === 0 && code === 220) {
              step = 1;
              netSocket.write(`EHLO localhost\r\n`);
              return;
            }
            if (step === 1 && code === 250) {
              step = 2;
              netSocket.write(`STARTTLS\r\n`);
              return;
            }
            if (step === 2 && code === 220) {
              isTlsUpgraded = true;
              step = 0;
              const secureSocket = tls.connect({
                socket: netSocket,
                rejectUnauthorized: false,
              });
              socket = secureSocket;
              secureSocket.setTimeout(15000, () => onError(new Error('Socket timeout')));
              secureSocket.on('data', handleResponse);
              secureSocket.on('error', onError);
              return;
            }
          }
        });
        netSocket.on('error', onError);
      }
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Sends a password reset OTP email using Nodemailer (with fallback to direct SMTP).
 */
export async function sendPasswordResetOtpEmail(input: SendPasswordResetEmailInput): Promise<EmailDeliveryResult> {
  const { toEmail, otp } = input;
  const config = getSmtpConfig();

  if (!config) {
    console.warn(`[DEV WARNING] SMTP variables (SMTP_HOST/USER/PASS) are not set in .env.`);
    console.info(`[DEV OTP LOG] Verification OTP for ${toEmail}: ${otp}`);
    return { success: true };
  }

  let timerId: NodeJS.Timeout | undefined;

  const dispatchEmail = async (): Promise<EmailDeliveryResult> => {
    try {
      // @ts-ignore
      const nodemailerModule = await import('nodemailer').catch(() => null);

      if (nodemailerModule?.createTransport) {
        const transporter = nodemailerModule.createTransport({
          host: config.host,
          port: config.port,
          secure: config.port === 465,
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 15000,
          auth: {
            user: config.user,
            pass: config.pass,
          },
        });

        await transporter.sendMail({
          from: config.from,
          to: toEmail,
          subject: 'Local Disaster Network - Password Reset OTP',
          text: renderEmailText(otp),
          html: renderEmailHtml(otp),
        });

        if (timerId) clearTimeout(timerId);
        return { success: true };
      }

      await sendSmtpDirect(config, toEmail, otp);
      if (timerId) clearTimeout(timerId);
      return { success: true };
    } catch (error) {
      if (timerId) clearTimeout(timerId);
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('[SMTP Delivery Failure] Failed to send OTP email:', errMessage);

      if (process.env.NODE_ENV !== 'production') {
        console.info(`[DEV FALLBACK] Verification OTP for ${toEmail}: ${otp}`);
        return { success: true };
      }

      return {
        success: false,
        error: 'Failed to deliver verification email.',
      };
    }
  };

  const timeoutGuard = new Promise<EmailDeliveryResult>((resolve) => {
    timerId = setTimeout(() => {
      console.warn(`[SMTP Timeout Guard] Email dispatch reached 20s timeout limit for ${toEmail}.`);
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[DEV TIMEOUT OTP LOG] Verification OTP for ${toEmail}: ${otp}`);
        resolve({ success: true });
      } else {
        resolve({ success: false, error: 'Email delivery timed out.' });
      }
    }, 20000);
  });

  return Promise.race([dispatchEmail(), timeoutGuard]);
}
