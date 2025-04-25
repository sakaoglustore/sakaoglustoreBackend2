const express = require('express');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

// Sepete ürün ekle / güncelle / sil
router.post('/add', async (req, res) => {
  const { userId, productId, quantity } = req.body;
  console.log('🟠 Sepet API:', req.body);

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

    const itemIndex = user.cart.findIndex(item => item.productId.toString() === productId);

    if (itemIndex > -1) {
      if (quantity <= 0) {
        user.cart.splice(itemIndex, 1);  // Sil
      } else {
        user.cart[itemIndex].quantity = quantity;  // Güncelle
      }
    } else if (quantity > 0) {
      user.cart.push({ productId: new mongoose.Types.ObjectId(productId), quantity });  // Ekle
    }

    await user.save();
    console.log('✅ DB Güncel Sepet:', user.cart);
    res.json({ message: 'Sepet güncellendi', cart: user.cart });

  } catch (err) {
    console.error('❌ Sepet Hatası:', err.message);
    res.status(500).json({ message: 'Hata', error: err.message });
  }
});

// Sepeti getir
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('cart.productId');
    res.json(user.cart);
  } catch (err) {
    res.status(500).json({ message: 'Hata', error: err.message });
  }
});
router.delete('/remove/:userId/:productId', async (req, res) => {
    const { userId, productId } = req.params;
  
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
  
      user.cart = user.cart.filter(item => item.productId.toString() !== productId);
      await user.save();
  
      // Güncel sepeti gönder
      const updatedUser = await User.findById(userId).populate('cart.productId');
      res.status(200).json(updatedUser.cart);
    } catch (err) {
      res.status(500).json({ message: 'Kaldırma hatası', error: err.message });
    }
  });
module.exports = router;
