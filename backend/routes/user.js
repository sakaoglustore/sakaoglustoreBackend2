const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GiftBox = require('../models/GiftBox');
const adminAuth = require('../middlewares/adminAuth');

router.put('/update-profile/:id', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, phone } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { firstName, lastName, phone },
      { new: true }
    );

    res.status(200).json({ updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Güncelleme başarısız', error: err.message });
  }
});
// 🔄 Adresleri Toplu Güncelle
router.put('/update-addresses/:id', async (req, res) => {
  const { addresses } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { addresses },
      { new: true }
    );
    res.status(200).json({ message: 'Adresler güncellendi', updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Güncelleme hatası', error: err.message });
  }
});

// ➕ Adres Ekle
router.post('/address/add/:id', async (req, res) => {
    const { title, fullAddress } = req.body;
    const { id } = req.params;
  
    try {
      const user = await User.findById(id);
      user.addresses.push({ title, fullAddress });
      await user.save();
      res.status(200).json({ message: 'Adres eklendi', addresses: user.addresses });
    } catch (err) {
      res.status(500).json({ message: 'Adres ekleme hatası', error: err.message });
    }
  });
  
  // 🔄 Adres Güncelle
  router.put('/address/update/:userId/:addrIndex', async (req, res) => {
    const { title, fullAddress } = req.body;
    const { userId, addrIndex } = req.params;
  
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
  
      user.addresses[addrIndex] = { title, fullAddress };
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

    // 🔄 Profil Güncelle  
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
      const Order = require('../models/Order');
// /routes/user.js
router.get('/orders/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Doğrudan Order.userId üzerinden çekiyoruz!
    const orders = await Order.find({ userId });

    if (!orders || orders.length === 0) {
      return res.status(200).json([]);
    }

    // Ürün ID’lerini topla
    const productIds = [
      ...new Set(orders.flatMap(order =>
        order.items.map(item => item.productId.toString())
      ))
    ];

    // Ürün detaylarını çek
    const giftBoxes = await GiftBox.find({ _id: { $in: productIds } });
    const giftBoxMap = {};
    giftBoxes.forEach(gift => {
      giftBoxMap[gift._id.toString()] = gift;
    });

    // Siparişleri detaylandır
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

router.get('/all', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Kullanıcılar alınamadı', error: err.message });
  }
});

  module.exports = router;