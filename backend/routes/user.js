const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GiftBox = require('../models/GiftBox');
const Order = require('../models/Order');
const adminAuth = require('../middlewares/adminAuth');

// 🔄 Profil Bilgisi Güncelle
router.put('/update-profile/:id', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, phone, verificationCode } = req.body;

  try {
    // Verify if verification code already exists
    if (verificationCode) {
      const existingCode = await User.findOne({ verificationCode });
      if (existingCode && existingCode._id.toString() !== id) {
        return res.status(400).json({ message: 'Bu onay kodu zaten kullanımda' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { firstName, lastName, phone, verificationCode },
      { new: true }
    );
    res.status(200).json({ updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Güncelleme başarısız', error: err.message });
  }
});

// 👤 Admin tarafından kullanıcı doğrulama
router.put('/verify/:id', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    user.temporaryCreatedAt = undefined;

    await user.save();

    res.status(200).json({
      message: 'Kullanıcı başarıyla doğrulandı',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    console.error('Doğrulama hatası:', err);
    res.status(500).json({ message: 'Doğrulama işlemi başarısız', error: err.message });
  }
});

// 👥 Admin tarafından toplu kullanıcı doğrulama
router.put('/verify/bulk', adminAuth, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Geçerli kullanıcı ID\'leri gönderilmeli' });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      {
        $set: { isVerified: true },
        $unset: {
          verificationToken: "",
          verificationExpires: "",
          temporaryCreatedAt: ""
        }
      }
    );

    res.status(200).json({
      message: `${result.modifiedCount} kullanıcı başarıyla doğrulandı`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Toplu doğrulama hatası:', err);
    res.status(500).json({ message: 'Toplu doğrulama işlemi başarısız', error: err.message });
  }
});

// ➕ Adres Ekle
router.post('/address/add/:id', async (req, res) => {
  const { title, city, district, fullAddress, phone } = req.body;
  const { id } = req.params;

  if (!title || !city || !district || !fullAddress || !phone) {
    return res.status(400).json({ message: 'Tüm adres bilgileri doldurulmalıdır' });
  }

  try {
    const user = await User.findById(id);
    user.addresses.push({ title, city, district, fullAddress, phone });
    await user.save();
    res.status(200).json({ message: 'Adres eklendi', addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: 'Adres ekleme hatası', error: err.message });
  }
});

// 🔄 Adres Güncelle
router.put('/address/update/:userId/:addrIndex', async (req, res) => {
  const { title, city, district, fullAddress, phone } = req.body;
  const { userId, addrIndex } = req.params;

  if (!title || !city || !district || !fullAddress || !phone) {
    return res.status(400).json({ message: 'Tüm adres bilgileri doldurulmalıdır' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

    user.addresses[addrIndex] = { title, city, district, fullAddress, phone };
    await user.save();
    res.status(200).json({ message: 'Adres güncellendi', addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: 'Adres güncelleme hatası', error: err.message });
  }
});

// ❌ Adres Sil
router.delete('/address/delete/:userId/:addrIndex', async (req, res) => {
  const { userId, addrIndex } = req.params;

  try {
    const user = await User.findById(userId);
    user.addresses.splice(addrIndex, 1);
    await user.save();
    res.status(200).json({ message: 'Adres silindi', addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: 'Adres silme hatası', error: err.message });
  }
});

// 📦 Kullanıcının Siparişlerini Getir
router.get('/orders/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const orders = await Order.find({ userId });

    if (!orders || orders.length === 0) {
      return res.status(200).json([]);
    }

    const productIds = [
      ...new Set(orders.flatMap(order => order.items.map(item => item.productId.toString())))
    ];

    const giftBoxes = await GiftBox.find({ _id: { $in: productIds } });
    const giftBoxMap = {};
    giftBoxes.forEach(gift => {
      giftBoxMap[gift._id.toString()] = gift;
    });

    const enrichedOrders = orders.map(order => ({
      ...order._doc,
      items: order.items.map(item => ({
        quantity: item.quantity,
        product: giftBoxMap[item.productId.toString()] || null
      }))
    }));

    res.status(200).json(enrichedOrders);
  } catch (err) {
    console.error('Siparişler alınamadı:', err);
    res.status(500).json({ message: 'Sipariş alınamadı', error: err.message });
  }
});

// 📦 Adresleri Getir (ID'ye göre)
router.get('/addresses/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

    res.status(200).json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: 'Adresler alınamadı', error: err.message });
  }
});

// 📦 Admin Kullanıcı Listesi
router.get('/all', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    
    // Doğrulanmış ve doğrulanmamış kullanıcıları ayrı ayrı say
    const verifiedCount = users.filter(user => user.isVerified).length;
    const unverifiedCount = users.length - verifiedCount;
    
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Kullanıcılar alınamadı', error: err.message });
  }
});

// 📧 Kullanıcıyı e-posta ile getir
router.get('/by-email/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (user) {
      res.status(200).json({ user });
    } else {
      res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

module.exports = router;
