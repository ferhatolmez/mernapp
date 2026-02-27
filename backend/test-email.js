require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('--- Email Delivery Test ---');
    console.log(`Host: ${process.env.EMAIL_HOST}`);
    console.log(`Port: ${process.env.EMAIL_PORT}`);
    console.log(`User: ${process.env.EMAIL_USER}`);

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_PORT === '465',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        // Adding debug output
        debug: true,
        logger: true
    });

    try {
        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to self
            subject: '📧 MERN App - Test Email Delivery',
            text: 'If you receive this, your email configuration is working correctly.',
            html: '<h1>Success!</h1><p>Your email configuration is working correctly.</p>'
        });
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
    } catch (error) {
        console.error('❌ Email sending failed:');
        console.error(error);
    }
}

testEmail();
