const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ─── Cloudinary Yapılandırması ────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Avatar Depolama ─────────────────────────────────────────────
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mern-app/avatars',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 200, height: 200, crop: 'fill' }],
    },
});

// ─── Chat Dosya Depolama ──────────────────────────────────────────
const chatStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mern-app/chat',
        // Her türlü dosyaya izin ver (Cloudinary dökümanları da saklayabilir)
        resource_type: 'auto',
    },
});

module.exports = {
    cloudinary,
    avatarStorage,
    chatStorage,
};
