const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8+ bu seçeneklere gerek duymaz ama netlik için bıraktık
    });

    console.log(`✅ MongoDB bağlantısı başarılı: ${conn.connection.host}`);

    // Bağlantı olaylarını dinle
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB bağlantısı koptu');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB hatası:', err);
    });

  } catch (error) {
    console.error(`❌ MongoDB bağlantı hatası: ${error.message}`);
    process.exit(1); // Kritik hata — sunucuyu durdur
  }
};

module.exports = connectDB;
