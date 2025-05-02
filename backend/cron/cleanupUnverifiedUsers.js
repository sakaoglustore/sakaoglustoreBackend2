const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('../models/User');

// MongoDB bağlantısı (gerekiyorsa ayarla)
mongoose.connect('mongodb://localhost:27017/sakaoglustore', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Her saat başı çalışır
cron.schedule('0 * * * *', async () => {
  const now = new Date();

  try {
    const result = await User.deleteMany({
      isVerified: false,
      verificationExpires: { $lt: now }
    });

    console.log(`[${new Date().toISOString()}] ${result.deletedCount} adet doğrulanmamış kullanıcı silindi.`);
  } catch (err) {
    console.error('Doğrulanmamış kullanıcıları silerken hata:', err.message);
  }
});
