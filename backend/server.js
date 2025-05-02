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

app.use(cors({
  origin: 'http://localhost:3000', // veya deployed frontend domainin
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
.then(() => console.log('✅ MongoDB Bağlantısı Başarılıı'))
.catch(err => console.log('MongoDB Bağlantı Hatası:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server ${PORT} portunda çalışıyor...`));
