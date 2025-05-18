const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const giftRoutes = require('./routes/giftBoxes');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const userRoutes = require('./routes/user');
const boxOpenRoutes = require('./routes/boxOpen');
const adminAuthRoutes = require('./routes/adminAuth');
const adminRoutes = require('./routes/admins');
const adminStatsRoutes = require('./routes/adminStats');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');

dotenv.config();

const app = express();

// CORS configuration for specific domains
app.use(cors({
  origin: [
    'https://sakaoglustore.net',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://www.sakaoglustore.net',
    'https://sakaoglustore.net',
    'https://admin.sakaoglustore.net',
    'https://www.admin.sakaoglustore.net',
    'https://main.d3og6nu3h4ow7n.amplifyapp.com',
    'https://master.d2ts14tpekdi5s.amplifyapp.com',
  ],
  credentials: true
}));

app.use(express.json());

app.use('/api/cart', cartRoutes);
app.use('/api/user', userRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/box', boxOpenRoutes);
app.use('/api/adminAuth', adminAuthRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/adminStats', adminStatsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Bağlantısı Başarılı'))
.catch(err => console.log('MongoDB Bağlantı Hatası:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server ${PORT} portunda çalışıyor...`));
