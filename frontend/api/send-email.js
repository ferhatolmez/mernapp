const nodemailer = require('nodemailer');

export default async function handler(req, res) {
    // Sadece POST isteklerini kabul et
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    // Güvenlik anahtarı kontrolü (Sadece yetkili backend kullanabilsin diye)
    const authHeader = req.headers.authorization;
    if (!process.env.EMAIL_SECRET || authHeader !== `Bearer ${process.env.EMAIL_SECRET}`) {
        return res.status(401).json({ success: false, message: 'Unauthorized / Missing EMAIL_SECRET' });
    }

    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        // Gmail transporter oluştur
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS, // Gmail App Password
            },
        });

        const info = await transporter.sendMail({
            from: `MERN App <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
        });

        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Email Proxy Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
