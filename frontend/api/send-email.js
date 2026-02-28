import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Sadece POST isteklerini kabul et
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    // Güvenlik anahtarı kontrolü
    const authHeader = req.headers.authorization;
    if (!process.env.EMAIL_SECRET || authHeader !== `Bearer ${process.env.EMAIL_SECRET}`) {
        return res.status(401).json({ success: false, message: 'Unauthorized / Missing EMAIL_SECRET' });
    }

    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Environment variable kontrolü
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
        console.error('GMAIL_USER or GMAIL_PASS environment variables are not set on Vercel!');
        return res.status(500).json({
            success: false,
            message: 'Email configuration error: GMAIL_USER or GMAIL_PASS not set',
        });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `MERN App <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
        });

        console.log(`Email sent successfully to: ${to}, messageId: ${info.messageId}`);
        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Email Proxy Error:', error.message, error.stack);
        return res.status(500).json({ success: false, message: error.message });
    }
}
