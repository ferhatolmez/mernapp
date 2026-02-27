const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MERN App API',
            version: '2.0.0',
            description: 'Kapsamlı MERN Full Stack Application API dokümantasyonu',
            contact: {
                name: 'MERN App',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000/api',
                description: 'Development Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string', enum: ['user', 'moderator', 'admin'] },
                        avatar: { type: 'string' },
                        isActive: { type: 'boolean' },
                        isEmailVerified: { type: 'boolean' },
                        twoFactorEnabled: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Message: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        content: { type: 'string' },
                        sender: { $ref: '#/components/schemas/User' },
                        room: { type: 'string' },
                        type: { type: 'string', enum: ['text', 'system', 'file', 'image'] },
                        isEdited: { type: 'boolean' },
                        isDeleted: { type: 'boolean' },
                        fileUrl: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Notification: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        userId: { type: 'string' },
                        type: { type: 'string' },
                        message: { type: 'string' },
                        isRead: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Room: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        type: { type: 'string', enum: ['general', 'random', 'tech', 'custom'] },
                        createdBy: { type: 'string' },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                user: { $ref: '#/components/schemas/User' },
                                accessToken: { type: 'string' },
                            },
                        },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                    },
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'Kimlik doğrulama işlemleri' },
            { name: 'Users', description: 'Kullanıcı yönetimi' },
            { name: 'Chat', description: 'Chat ve mesajlaşma' },
            { name: 'Notifications', description: 'Bildirim sistemi' },
        ],
    },
    apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
