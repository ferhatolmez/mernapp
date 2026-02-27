const request = require('supertest');
const { app } = require('../server');

// Test ortamı için basit testler
describe('Auth Endpoints', () => {
    describe('POST /api/auth/register', () => {
        it('eksik alanlarla kayıt reddedilmeli', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ name: 'Test' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/login', () => {
        it('eksik alanlarla giriş reddedilmeli', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('yanlış bilgilerle giriş reddedilmeli', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nonexistent@test.com', password: 'wrongpass' });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/forgot-password', () => {
        it('geçerli formatta response dönmeli', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'test@test.com' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('GET /api/health', () => {
        it('sağlık kontrolü başarılı olmalı', async () => {
            const res = await request(app).get('/api/health');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('timestamp');
            expect(res.body).toHaveProperty('version');
        });
    });
});
