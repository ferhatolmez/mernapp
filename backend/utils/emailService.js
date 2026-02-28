const nodemailer = require('nodemailer');
const logger = require('./logger');
const https = require('https');

let emailProvider = null; // 'proxy' or 'smtp'
let smtpTransporter = null;

// ─── Email provider'ı başlat ──────────────────────────────────────
const initEmailProvider = async () => {
  // 1) Vercel Proxy varsa tercih et (Render'da SMTP engeli yüzünden)
  if (process.env.EMAIL_SECRET && process.env.VERCEL_API_URL) {
    emailProvider = 'proxy';
    logger.info(`📧 Email servisi: Vercel E-posta Proxy (${process.env.VERCEL_API_URL})`);
    return;
  }

  // 2) SMTP fallback (local development / SMTP engeli olmayan ortamlar için)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const isGmail =
      process.env.EMAIL_HOST === 'smtp.gmail.com' ||
      (process.env.EMAIL_USER && process.env.EMAIL_USER.endsWith('@gmail.com'));

    if (isGmail) {
      smtpTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
      });
    } else if (process.env.EMAIL_HOST) {
      smtpTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_PORT === '465',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
      });
    }
    emailProvider = 'smtp';
    logger.info(`📧 Email servisi: SMTP (${process.env.EMAIL_HOST || 'gmail'})`);
    return;
  }

  // 3) Hiçbiri yoksa — Ethereal (development test)
  logger.warn('⚠️ Email ayarları eksik. Ethereal test servisi kullanılacak.');
  const testAccount = await nodemailer.createTestAccount();
  smtpTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  emailProvider = 'smtp';
  logger.info(`📧 Ethereal test hesabı: ${testAccount.user}`);
};

// ─── Email gönder ─────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  if (!emailProvider) await initEmailProvider();

  logger.debug(`📧 Email gönderiliyor [${emailProvider}]: ${to} | Konu: ${subject}`);

  try {
    if (emailProvider === 'proxy') {
      // Vercel Proxy'sine HTTP POST atıyoruz
      const proxyUrl = `${process.env.VERCEL_API_URL}/api/send-email`;

      const payload = JSON.stringify({ to, subject, html });

      const data = await new Promise((resolve, reject) => {
        const req = https.request(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EMAIL_SECRET}`,
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (res.statusCode >= 200 && res.statusCode < 300 && parsed.success) {
                resolve(parsed);
              } else {
                reject(new Error(parsed.message || `Proxy error: ${res.statusCode}`));
              }
            } catch (e) {
              reject(new Error(`Invalid JSON from proxy: ${body}`));
            }
          });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
      });

      logger.info(`📧 Email gönderildi [Proxy]: ${to} (ID: ${data.messageId})`);
      return data;
    }

    // SMTP Fallback (Local)
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"MERN App" <noreply@mernapp.com>';
    const info = await smtpTransporter.sendMail({ from: fromAddress, to, subject, html });

    const testMessageUrl = nodemailer.getTestMessageUrl(info);
    if (testMessageUrl) {
      logger.info(`📧 Email preview: ${testMessageUrl}`);
    }

    logger.info(`📧 Email gönderildi [SMTP]: ${to}`);
    return info;
  } catch (error) {
    logger.error(`Email gönderme hatası [${emailProvider}]:`, error);
    throw error;
  }
};

// ─── Email Templates ────────────────────────────────────────────────

const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: '📧 Email Adresinizi Doğrulayın — MERN App',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #818cf8; font-size: 28px;">⚡ MERN App</h1>
        </div>
        <h2 style="color: #f1f5f9;">Email Adresinizi Doğrulayın</h2>
        <p style="color: #94a3b8; line-height: 1.6;">Hesabınızı aktifleştirmek için aşağıdaki butona tıklayın:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            ✅ Email Doğrula
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px;">Bu link 24 saat geçerlidir. Eğer bu işlemi siz yapmadıysanız, bu emaili görmezden gelin.</p>
        <hr style="border: 1px solid #1e293b; margin: 20px 0;" />
        <p style="color: #475569; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} MERN App</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: '🔐 Şifre Sıfırlama — MERN App',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #818cf8; font-size: 28px;">⚡ MERN App</h1>
        </div>
        <h2 style="color: #f1f5f9;">Şifre Sıfırlama İsteği</h2>
        <p style="color: #94a3b8; line-height: 1.6;">Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            🔐 Şifreyi Sıfırla
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px;">Bu link 1 saat geçerlidir. Eğer şifre sıfırlama talebinde bulunmadıysanız, bu emaili görmezden gelin.</p>
        <hr style="border: 1px solid #1e293b; margin: 20px 0;" />
        <p style="color: #475569; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} MERN App</p>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
